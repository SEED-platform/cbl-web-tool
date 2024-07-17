from flask import Flask, jsonify, request
from flask_cors import CORS

import gzip
import json
import os
import sys
from pathlib import Path
from typing import Any
import warnings

import geopandas as gpd
import mercantile
import pandas as pd
from shapely.geometry import Point

from utils.common import Location
from utils.geocode_addresses import geocode_addresses
from utils.normalize_address import normalize_address
from utils.ubid import bounding_box, centroid, encode_ubid
from utils.update_dataset_links import update_dataset_links
from utils.update_quadkeys import update_quadkeys

warnings.filterwarnings("ignore", category=RuntimeWarning)
warnings.filterwarnings("ignore", category=UserWarning)


app = Flask(__name__)
CORS(app)

global_user_data = {"user_data": ""}
@app.route('/api/data',  methods=['GET'])
def send_data_to_client():
    return jsonify(global_user_data)


# TODO: Before generating locations list, check/fix quality of data in file 
# perhaps user can do this manually
@app.route('/api/submit_file', methods=['POST'])
def get_file_from_client():

    # Retrieve user uploaded file and generate list of locations from it
    file = request.files['userFile']
    # locations = generate_locations_list(file)
    with open('locations_data.json', 'r') as file:
        locations = json.load(file)

    if (len(locations)) == 0:
        return jsonify({'error': 'File is empty or in the wrong format'}), 400

    MAPQUEST_API_KEY = os.getenv("MAPQUEST_API_KEY")
    if not MAPQUEST_API_KEY:
        sys.exit("Missing MapQuest API key")

    quadkey_path = Path("data/quadkeys")
    if not quadkey_path.exists():
        quadkey_path.mkdir(parents=True, exist_ok=True)

    for loc in locations:
        loc["street"] = normalize_address(loc["street"])
        print(loc)

    # data = geocode_addresses(locations, MAPQUEST_API_KEY)

    # data_json = json.dumps(data, indent=2)
    # with open('locations_data.json', 'w') as file:
        # file.write(data_json)
    
    with open("mapquest_tempfile.json", 'r') as f:
        data = json.load(f)

    poorQualityCodes = ["Ambiguous", "P1CAA", "B1CAA", "B1ACA"]

    # Find all quadkeys that the coordinates fall within
    quadkeys = set()
    for datum in data:
        if (datum["quality"] not in poorQualityCodes):
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
        if (datum["quality"] not in poorQualityCodes):
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

            datum["side_of_street"] = "Poor Data"
            datum["neighborhood"] = "Poor Data"
            datum["county"] = "Poor Data"
            datum["country"] = "Poor Data"
            datum["latitude"] = "Poor Data"
            datum["longitude"] = "Poor Data"
            datum["quality"] = "Poor Data"
            datum["footprint_match"] = "Poor Data"
            datum["height"] = None
            datum["geometry"] = None
            datum["ubid"] = "Poor Data"
        index = index + 1


    # Convert covered building list as GeoJSON
    columns = [
        "address", "city", "state", "postal_code", "side_of_street", "neighborhood", "county",
        "country", "latitude", "longitude", "quality", "footprint_match", "height", "ubid",
        "geometry"]
    
    gdf = gpd.GeoDataFrame(data=data, columns=columns)
    

    final_geojson = gdf.to_json()
 
    return jsonify({"message": "success", "user_data": final_geojson}), 200


# Generating a list of locations from user-inputted file
def generate_locations_list(file):
    file_type = file.content_type
    print(file_type)

    locations: list[Location] = []
    
    if (file_type == "application/json"):
        file_content = file.read().decode('utf-8')
        locations = json.loads(file_content)
    else:
        data_frame = pd.DataFrame()
        if (file_type == "application/csv" or file_type == "text/csv"):
            data_frame = pd.read_csv(file)
        elif (file_type == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"):       
            data_frame = pd.read_excel(file)

        for index, row in data_frame.iterrows():
            street = data_frame.loc[index, 'Property Address']
            city = data_frame.loc[index, 'City']
            state = data_frame.loc[index, 'State']

            location_dict: Location = {
                'street': street,
                'city': city,
                'state': state
            }
            locations.append(location_dict)

    return locations


if __name__ == '__main__':
    app.run(port=5001)