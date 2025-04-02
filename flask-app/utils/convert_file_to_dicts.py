import json

import pandas as pd

from utils.location_error import LocationError


# NOTE: When converting to a data_frame, duplicate columns will be renamed (i.e Address and Address
# will become Address and Address.1) So, the json file and the resulting
# dictionary may have keys like Address and Address.1
def convert_file_to_dicts(file):
    """
    Convert a file into a series of dicts, depending on the file type

    File types are checked here: angular-app/src/app/home/file-upload/file-upload.component.ts
    An error is displayed to the user if they attempt to upload a file of a different type.
    """
    file_type = file.content_type

    if file_type == "application/json":
        file_content = file.read().decode("utf-8")
        file_data = json.loads(file_content)

    elif file_type == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
        data_frame = pd.read_excel(file)
        json_data = data_frame.to_json(orient="records")
        file_data = json.loads(json_data)

    elif file_type in {"application/csv", "text/csv"}:
        data_frame = pd.read_csv(file)
        json_data = data_frame.to_json(orient="records")
        file_data = json.loads(json_data)

    elif file_type in {"application/geo+json", "application/octet-stream"}:
        file_content = file.read().decode("utf-8")
        file_data = json.loads(file_content)

        # need to extract info from geoJSON to make regular dict object
        file_data = convert_geojson_to_dict(file_data)

    return file_data


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
