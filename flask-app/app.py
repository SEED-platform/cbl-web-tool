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
    json_dict_list = convert_to_json_dict_list(file)

    if (len(json_dict_list) == 0):
        return jsonify({'message': 'Uploaded a file in the wrong format. Please upload different format'}), 400
    
    if (isinstance(json_dict_list, LocationError)):
        return jsonify({'message': f'{json_dict_list.message}'}), 400
    
    isGoodData = check_data_quality(json_dict_list)
    if isGoodData == False:
        return jsonify({'message': 'Uploaded a file with poorly formatted data. May be missing 3 required unique columns'}), 400

    json_data = json.dumps(json_dict_list)
    return jsonify({"message": "success", "user_data": json_data}), 200

    # after data checking and editing is succesful, generate list of locations 
    # Finally, run CBL-workflow


@app.route('/api/check_data',  methods=['POST'])
def check_edited_data():
  
    json_dict_list = request.json.get('value')
    print(json_dict_list)

    isGoodData = check_data_quality(json_dict_list)
    if isGoodData == False:
        return jsonify({'message': 'Data is poorly formatted. May be missing 3 required unique columns'}), 400
    
    json_data = json.dumps(json_dict_list)
    return jsonify({"message": "success", "user_data": json_data}), 200

    
@app.route('/api/generate_cbl',  methods=['POST'])
def run_cbl_workflow():
    
    try:
        json_dict_list = json.loads('locations.json')   # reading from here temporarily
    except ValueError:
        return jsonify({'error': 'Something went wrong while reading the edited json'}), 400

    locations = generate_locations_list(json_dict_list)

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

    # return final_geojson


def merge_dicts(dict1, dict2):
    merged_dict = {}
    for key, value in dict1.items():
        merged_dict[key.lower()] = value
    
    for key, value in dict2.items():
        merged_dict[key.lower()] = value
    
    return merged_dict


    
# NOTE: When converting to a data_frame, duplicate columns will be renamed (i.e Address and Address
# will become Address and Address.1) SO, the json file and the resulting 
# dictionary may have keys like Address and Address.1
def convert_to_json_dict_list(file):
    file_type = file.content_type
    newError = LocationError("Failed to read file.")

    if (file_type == "application/json"):
        try: 
            file_content = file.read().decode('utf-8')
            json_dict_list = json.loads(file_content)
        except:
            return newError

        return json_dict_list
    
    if (file_type == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"):   
        try:
            data_frame = pd.read_excel(file)
            json_data = data_frame.to_json(orient='records')
            json_dict_list = json.loads(json_data)
        except:
            return newError

        return json_dict_list

    if (file_type == "application/csv" or file_type == "text/csv"):
        try:
            data_frame = pd.read_csv(file)
            json_data = data_frame.to_json(orient='records')
            json_dict_list = json.loads(json_data)
        except:
            return newError

        return json_dict_list


# Checking for duplicates in the list of dictionaries 
def check_data_quality(json_dict_list):
    for i in range(len(json_dict_list) - 1):
        dict1 = json_dict_list[i]

        # Enforcing the required unique column names 
        if "Address" not in dict1 and "address" not in dict1:
            return False
        if "City" not in dict1 and "city" not in dict1:
            return False
        if "State" not in dict1 and "state" not in dict1:
            return False

        for j in range(i + 1, len(json_dict_list)):
            dict2 = json_dict_list[j]

            if (dict1 == dict2):
                dict1["duplicate?"] = "possible duplicate"
                dict2["duplicate?"] = "possible duplicate"

            else: 
                dict1["duplicate?"] = ""
                dict2["duplicate?"] = ""

    # values must only be primitive types
    for d in json_dict_list:
        for value in d.values():
            if not isinstance(value, (int, str, bool)): 
                return False
            
    return True
            
                
# Generating a list of locations from user-inputted file
def generate_locations_list(json_dict_list):
    locations: list[Location] = []

    for d in json_dict_list:
        street = ''
        city = ''
        state = ''
        for key in d.keys():
            if "address" == key.lower():
                street = d[key]

            if "city" == key.lower():
                city = d[key]

            if "state" == key.lower():
                state = d[key]

        loc_dict = {
            'street': street,
            'city': city,
            'state': state
        }
        locations.append(loc_dict)
            
    return locations


if __name__ == '__main__':
    app.run(port=5001)