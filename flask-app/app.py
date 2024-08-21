import gzip
import json
import os
import sys
import warnings
from pathlib import Path
from typing import Any

import geopandas as gpd
import mercantile
import requests
from flask import Flask, jsonify, request
from flask_cors import CORS
from shapely.geometry import Point, Polygon

from utils.check_data_quality import check_data_quality
from utils.common import Location
from utils.convert_file_to_dicts import convert_file_to_dicts
from utils.generate_locations_list import generate_locations_list
from utils.location_error import LocationError
from utils.merge_dicts import merge_dicts
from utils.normalize_address import normalize_address
from utils.normalize_state import normalize_state
from utils.ubid import encode_ubid
from utils.update_dataset_links import update_dataset_links
from utils.update_quadkeys import update_quadkeys

warnings.filterwarnings("ignore", category=RuntimeWarning)
warnings.filterwarnings("ignore", category=UserWarning)

app = Flask(__name__)
CORS(app)


@app.route("/api/merge_files", methods=["POST"])
def merge_files():
    files = []
    merged_data = []

    for file in files:
        file_data = convert_file_to_dicts(file)
        if not file_data or len(file_data) == 0:
            return jsonify({"message": "Uploaded a file in the wrong format. Please upload different format"}), 400

        if isinstance(file_data, LocationError):
            return jsonify({"message": f"{file_data.message}"}), 400

        merged_data.extend(file_data)

    json_data = json.dumps(merged_data)
    isGoodData = check_data_quality(merged_data)

    if isinstance(isGoodData, LocationError):
        return jsonify({"message": f"{isGoodData.message}", "user_data": json_data}), 400

    return jsonify({"message": "success", "user_data": json_data}), 200


@app.route("/api/submit_file", methods=["POST"])
def get_and_check_file():
    file = request.files["userFiles[]"]
    file_data = convert_file_to_dicts(file)

    if not file_data or len(file_data) == 0:
        return jsonify({"message": "Uploaded a file in the wrong format. Please upload different format"}), 400

    if isinstance(file_data, LocationError):
        return jsonify({"message": f"{file_data.message}"}), 400

    json_data = json.dumps(file_data)
    isGoodData = check_data_quality(file_data)

    if isinstance(isGoodData, LocationError):
        return jsonify({"message": f"{isGoodData.message}", "user_data": json_data}), 400

    return jsonify({"message": "success", "user_data": json_data}), 200


@app.route("/api/check_data", methods=["POST"])
def check_edited_data():
    json_string = request.json.get("value")
    file_data = json.loads(json_string)
    json_data = json.dumps(file_data)

    isGoodData = check_data_quality(file_data)
    if isinstance(isGoodData, LocationError):
        return jsonify({"message": f"{isGoodData.message}", "user_data": json_data}), 400

    return jsonify({"message": "success", "user_data": json_data}), 200


@app.route("/api/generate_cbl", methods=["POST"])
def run_cbl_workflow():
    file_data = []
    locations: list[Location] = []

    try:
        json_string = request.json.get("value")
        file_data = json.loads(json_string)
    except ValueError:
        return jsonify({"message": "Something went wrong while reading the edited json"}), 400

    locations = generate_locations_list(file_data)

    MAPQUEST_API_KEY = os.getenv("MAPQUEST_API_KEY")  # will need to change this to retrieve user's api key
    if not MAPQUEST_API_KEY:
        sys.exit("Missing MapQuest API key")

    quadkey_path = Path("data/quadkeys")
    if not quadkey_path.exists():
        quadkey_path.mkdir(parents=True, exist_ok=True)

    for loc in locations:
        loc["street"] = normalize_address(loc["street"])

    # try:
    #     data = geocode_addresses(locations, MAPQUEST_API_KEY)
    # except Exception as e:
    #     return jsonify({'message': 'Failed geocoding property states due to MapQuest error. " "Your MapQuest API Key is either invalid or at its limit.'}), 400

    with open("test_data/large_test.json") as fr:
        data = json.load(fr)

    # with open('large_test.json', 'w') as fr:
    #     json.dump(data, fr, indent=2)

    poorQualityCodes = ["Ambiguous", "P1CAA", "B1CAA", "B1ACA", "A5XAX", "L1CAA", "B1AAA", "L1BCA"]

    # Find all quadkeys that the coordinates fall within
    quadkeys = set()
    for datum in data:
        if datum["quality"] not in poorQualityCodes:
            print(datum)
            tile = mercantile.tile(datum["longitude"], datum["latitude"], 9)
            quadkey = int(mercantile.quadkey(tile))
            quadkeys.add(quadkey)
            datum["quadkey"] = quadkey

    # Download quadkey dataset links
    update_dataset_links()

    # Download quadkeys
    update_quadkeys(list(quadkeys))

    loaded_quadkeys: dict[int, Any] = {}
    index = 0
    for datum in data:
        if datum["quality"] not in poorQualityCodes:
            quadkey = datum["quadkey"]
            if quadkey not in loaded_quadkeys:
                print(f"Loading {quadkey}")

                with gzip.open(f"data/quadkeys/{quadkey}.geojsonl.gz", "rb") as f:
                    loaded_quadkeys[quadkey] = gpd.read_file(f)
                    print(f"  {len(loaded_quadkeys[quadkey])} footprints in quadkey")

            geojson = loaded_quadkeys[quadkey]
            point = Point(datum["longitude"], datum["latitude"])
            point_gdf = gpd.GeoDataFrame(crs="epsg:4326", geometry=[point])

            # intersections have `geometry`, `index_right`, and `height`
            intersections = gpd.sjoin(point_gdf, geojson)
            if len(intersections) >= 1:
                footprint = geojson.iloc[intersections.iloc[0].index_right]
                datum["footprint_match"] = "intersection"
            else:
                footprint = geojson.iloc[geojson.distance(point).sort_values().index[0]]
                datum["footprint_match"] = "closest"
            datum["geometry"] = footprint.geometry
            datum["height"] = footprint.height if footprint.height != -1 else None

            # Determine UBIDs from footprints
            datum["ubid"] = encode_ubid(datum["geometry"])
        else:
            datum["address"] = normalize_address(locations[index]["street"])
            datum["city"] = locations[index]["city"]
            datum["state"] = locations[index]["state"]
            datum["postal_code"] = None
            datum["county"] = None
            datum["country"] = None
            datum["latitude"] = 0
            datum["longitude"] = 0
            datum["quality"] = "Ambiguous"
            datum["geometry"] = None
            datum["ubid"] = 0
        index = index + 1

    # since the data dict contains information only from mapquest, need to merge original
    # dict and the data dict to display all information
    merged_data = []
    for i in range(len(data)):
        file_dict = file_data[i]
        data_dict = data[i]

        if "P1A" in data_dict["quality"] or "P1B" in data_dict["quality"]:
            data_dict["quality"] = "Very Good"
        elif "L1A" in data_dict["quality"] or "L1B" in data_dict["quality"]:
            data_dict["quality"] = "Good"
        elif data_dict["quality"] in poorQualityCodes:
            data_dict["quality"] = "Poor"

        merged_dict = merge_dicts(file_dict, data_dict)
        merged_data.append(merged_dict)

    columns = ["street_address", "city", "state"]
    for key in merged_data[0]:
        if key.lower() not in columns:
            columns.append(key)

    # Convert covered building list as GeoJSON
    gdf = gpd.GeoDataFrame(data=merged_data, columns=columns)
    geojson_str = gdf.to_json()
    geojson_obj = json.loads(geojson_str)

    geojson_obj["features"].sort(key=lambda feature: feature["properties"].get("street_address", ""))

    final_geojson = json.dumps(geojson_obj)
    return jsonify({"message": "success", "user_data": final_geojson}), 200


@app.route("/api/reverse_geocode", methods=["POST"])
def reverse_geocode():
    json_string = request.json.get("value")
    json_data = json.loads(json_string)

    coords = json_data["coordinates"]

    properties = {}
    for key in json_data["propertyNames"]:
        properties[key] = " "
    newId = str(json_data["featuresLength"])

    polygon = Polygon(coords)
    centroid = polygon.centroid

    # calculate lat, long (center of polygon)
    lat = centroid.y
    lon = centroid.x

    # encode ubid from coordinates
    ubid = ""
    try:
        ubid = encode_ubid(polygon)
    except AssertionError:
        return jsonify({"message": "Invalid longitude coordinates"}), 400

    url = f"https://api.mapbox.com/geocoding/v5/mapbox.places/{lon},{lat}.json"
    params = {"access_token": "pk.eyJ1Ijoicm1pYW4tbnJlbCIsImEiOiJjbHlvc2lkNm8wbG1uMmlwcHR1aDZlMTR0In0.dZtyvX6DjlnEF8FVL7FV4Q", "limit": 1}

    # TODO: remove verify
    response = requests.get(url, params=params, verify=False)
    if response.status_code in {401, 403}:
        return jsonify({"message": "Error: Could not reverse geocode using the mapbox API."}), 400

    result = response.json()
    try:
        properties["ubid"] = ubid
        properties["latitude"] = str(lat)
        properties["longitude"] = str(lon)
        features = result["features"]
        context = features[0]["context"]
        for item in context:
            if "place" in item["id"]:
                properties["city"] = item["text"]

            if "region" in item["id"]:
                state_name = item["text"]
                properties["state"] = normalize_state(state_name)

            if "postcode" in item["id"]:
                properties["postal_code"] = item["text"]

            if "country" in item["id"]:
                properties["country"] = item["text"]

        properties["street_address"] = normalize_address(features[0]["place_name"])
    except Exception:
        print("missing data from reverse geocoding")

    if not properties or len(properties) == 0:
        return jsonify({"message": "Error: Reverse geocoding returned poor data."}), 400

    properties["quality"] = "reverseGeocode"
    returned_feature = {"id": newId, "type": "Feature", "properties": properties, "geometry": {"type": "Polygon", "coordinates": [coords]}}

    return jsonify({"message": "success", "user_data": json.dumps(returned_feature)}), 200


@app.route("/api/edit_footprint", methods=["POST"])
def edit_footprint():
    json_string = request.json.get("value")
    json_data = json.loads(json_string)
    coords = json_data["coordinates"]

    polygon = Polygon(coords)
    centroid = polygon.centroid

    # calculate lat, long (center of polygon)
    lat = centroid.y
    lon = centroid.x

    # encode ubid from coordinates
    ubid = ""
    try:
        ubid = encode_ubid(polygon)
    except AssertionError:
        return jsonify({"message": "Invalid longitude coordinates"}), 400

    newPolygonData = {"lat": lat, "lon": lon, "ubid": ubid}
    return jsonify({"message": "success", "user_data": json.dumps(newPolygonData)}), 200


@app.route("/api/export_geojson", methods=["POST"])
def export_geojson():
    json_string = request.json.get("value")
    geojson_data = json.loads(json_string)
    list_of_features = []

    for data in geojson_data:
        coords = data["coordinates"].split(",")
        coords = [(float(coords[i]), float(coords[i + 1])) for i in range(0, len(coords), 2)]
        properties = data
        properties.pop("coordinates", None)

        feature = {}
        feature["type"] = "Feature"
        feature["properties"] = properties
        feature["geometry"] = {}
        feature["geometry"]["type"] = "Polygon"
        feature["geometry"]["coordinates"] = [coords]
        list_of_features.append(feature)

    geojson = {"type": "FeatureCollection", "features": list_of_features}

    final_geojson = json.dumps(geojson)
    return jsonify({"message": "success", "user_data": final_geojson}), 200


if __name__ == "__main__":
    app.run(port=5001)
