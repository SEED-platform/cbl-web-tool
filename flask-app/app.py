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
from utils import LocationError
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
        return jsonify({'error': 'Uploaded a file in the wrong format. Please upload different format'}), 400
    
    if (isinstance(json_dict_list, LocationError)):
        return jsonify({'error': f'{json_dict_list.message}'}), 400
    
    # if file is succesfully read, send to front end for manual editing
    # (for cells with no data in the data table, perhaps Rahman can make them highlighted red)
    isGoodData = check_data_quality(json_dict_list)
    if isGoodData == False:
        return jsonify({'error': 'Uploaded a file with poorly formatted data. Make sure data is formatted properly.'}), 400

    json_data = json.dumps(json_dict_list)
    return jsonify({"message": "success", "user_data": json_data}), 200

    # after editing is succesful, generate list of locations and check data quality
    # locations = generate_locations_list(json_dict_list)
    # Finally, run CBL-workflow

    

    
# NOTE: When converting to a data_frame, duplicate columns will be renamed (i.e Address and Address_1)
# SO, the json file and the resulting dictionary can have keys like Address and Address_1
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
            data_frame = pd.read_excel('data/covered-buildings.csv')
            json_data = data_frame.to_json(orient='records')
            json_dict_list = json.loads(json_data)
        except:
            return newError

        return json_dict_list

    if (file_type == "application/csv" or file_type == "text/csv"):
        try:
            data_frame = pd.read_csv('data/covered-buildings.csv')
            json_data = data_frame.to_json(orient='records')
            json_dict_list = json.loads(json_data)
        except:
            return newError

        return json_dict_list


# Checking for duplicates in the list of dictionaries 
def check_data_quality(json_dict_list):
    for i in range(len(json_dict_list) - 1):
        property1 = json_dict_list[i]

        for j in range(i + 1, len(json_dict_list)):
            property2 = json_dict_list[j]

            if (property1 == property2):
                property1["duplicate?"] = "possible duplicate"
                property2["duplicate?"] = "possible duplicate"

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
            if "address" in key.lower() or "street" in key.lower():
                street = d[key]

            if "city" in key.lower():
                city = d[key]

            if "state" in key.lower():
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