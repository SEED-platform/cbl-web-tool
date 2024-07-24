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
from utils.location_error import LocationError
from utils.check_data_quality import check_data_quality
from utils.generate_locations_list import generate_locations_list
from utils.convert_file_to_dict import convert_file_to_dict
from utils.merge_dicts import merge_dicts
from utils.geocode_addresses import geocode_addresses
from utils.normalize_address import normalize_address
from utils.ubid import bounding_box, centroid, encode_ubid
from utils.update_dataset_links import update_dataset_links
from utils.update_quadkeys import update_quadkeys

warnings.filterwarnings("ignore", category=RuntimeWarning)
warnings.filterwarnings("ignore", category=UserWarning)


app = Flask(__name__)
CORS(app)

@app.route('/api/submit_file',  methods=['POST'])
def get_and_check_file():

    file = request.files['userFile']
    json_dict_list = convert_file_to_dict(file)

    if (len(json_dict_list) == 0):
        return jsonify({'message': 'Uploaded a file in the wrong format. Please upload different format'}), 400
    
    if isinstance(json_dict_list, LocationError):
        return jsonify({'message': f'{json_dict_list.message}'}), 400
    
    isGoodData = check_data_quality(json_dict_list)
    if isinstance(isGoodData, LocationError):
        return jsonify({'message': f'{json_dict_list.message}', "user_data": json_data}), 400

    json_data = json.dumps(json_dict_list)
    return jsonify({"message": "success", "user_data": json_data}), 200


@app.route('/api/check_data',  methods=['POST'])
def check_edited_data():
  
    json_string = request.json.get('value')
    json_dict_list = json.loads(json_string)

    isGoodData = check_data_quality(json_dict_list)
    if isinstance(isGoodData, LocationError):
        return jsonify({'message': f'{json_dict_list.message}', "user_data": json_data}), 400
    
    json_data = json.dumps(json_dict_list)
    return jsonify({"message": "success", "user_data": json_data}), 200

    
@app.route('/api/generate_cbl',  methods=['POST'])
def run_cbl_workflow():
    json_dict_list = []
    locations: list[Location] = []
    
    
    try:
        json_string = request.json.get('value')
        json_dict_list = json.loads(json_string)
    except ValueError:
        return jsonify({'message': 'Something went wrong while reading the edited json'}), 400

    locations = generate_locations_list(json_dict_list)

    MAPQUEST_API_KEY = os.getenv("MAPQUEST_API_KEY")
    if not MAPQUEST_API_KEY:
        sys.exit("Missing MapQuest API key")

    quadkey_path = Path("data/quadkeys")
    if not quadkey_path.exists():
        quadkey_path.mkdir(parents=True, exist_ok=True)

    for loc in locations:
        loc["street"] = normalize_address(loc["street"])

    data = geocode_addresses(locations, MAPQUEST_API_KEY)
    print(data)

    # with open("mapquest_tempfile.json", 'r') as f:
    #     data = json.load(f)

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
            datum["postal_code"] = "Poor Data"
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

    # since the data dict contains information only from mapquest, need to merge original 
    # dict and the data dict to display all information

    merged_data = []
    for i in range(len(data)):
        dict1 = json_dict_list[i]
        dict2 = data[i]
        if (dict1 != dict2):
            merged_dict = merge_dicts(dict1, dict2)
            merged_data.append(merged_dict)
        else:
            merged_data.append(dict1)

    columns = []
    for key in merged_data[0].keys():
        columns.append(key)

    # Convert covered building list as GeoJSON
    gdf = gpd.GeoDataFrame(data=merged_data, columns=columns)
    final_geojson = gdf.to_json()
 
    return jsonify({"message": "success", "user_data": final_geojson}), 200
 

if __name__ == '__main__':
    app.run(port=5001)