import json

import pandas as pd

from utils.location_error import LocationError


# NOTE: When converting to a data_frame, duplicate columns will be renamed (i.e Address and Address
# will become Address and Address.1) SO, the json file and the resulting
# dictionary may have keys like Address and Address.1
def convert_file_to_dicts(file):
    file_type = file.content_type
    newError = LocationError("Failed to read file.")

    if file_type == "application/json":
        try:
            file_content = file.read().decode("utf-8")
            file_data = json.loads(file_content)
        except:
            return newError

        return file_data

    if file_type == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
        try:
            data_frame = pd.read_excel(file)
            json_data = data_frame.to_json(orient="records")
            file_data = json.loads(json_data)
        except:
            return newError

        return file_data

    if file_type in {"application/csv", "text/csv"}:
        try:
            data_frame = pd.read_csv(file)
            json_data = data_frame.to_json(orient="records")
            file_data = json.loads(json_data)
        except:
            return newError

        return file_data

    if file_type == "application/geo+json":
        try:
            file_content = file.read().decode("utf-8")
            file_data = json.loads(file_content)
        except:
            return newError

        # need to extract info from geoJSON to make regular dict object
        file_data = convert_geojson_to_dict(file_data)
        return file_data


# NOTE: IDEA!!!
# If the user already has GeoJSON, we can throw it onto mapbox without using these functions!!
# If user wants to run CBL-workflow using GeoJSON, then parse information out of GeoJSON using these functions!!
def convert_geojson_to_dict(file_data):
    newError = LocationError("Improper GeoJSON format")

    if "type" not in file_data:
        return newError

    geojson_types = [
        "Point",
        "MultiPoint",
        "LineString",
        "MultiLineString",
        "Polygon",
        "MultiPolygon",
        "GeometryCollection",
        "Feature",
        "FeatureCollection",
    ]

    if file_data["type"] not in geojson_types:
        return newError

    new_dict_list = []
    if file_data["type"] == "FeatureCollection":
        if "features" not in file_data:
            return newError
        for feature in file_data["features"]:
            if "properties" in feature:
                new_dict_list.append(feature["properties"])
            else:
                return newError

    return new_dict_list
