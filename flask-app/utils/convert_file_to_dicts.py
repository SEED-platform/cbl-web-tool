import geopandas as gpd
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

        # data_gdf = gpd.read_file(file)
        # data_string = data_gdf.to_json()
        # file_data = json.loads(data_string)

    return file_data


def convert_file_to_dicts_new(file):
    """
    Convert a file into a series of dicts, depending on the file type

    File types are checked here: angular-app/src/app/home/file-upload/file-upload.component.ts
    An error is displayed to the user if they attempt to upload a file of a different type.
    """
    file_type = file.content_type

    if file_type in {"application/json"}:
        data_string = file.read().decode("utf-8")

    elif file_type == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
        data_df = pd.read_excel(file)
        data_string = data_df.to_json(orient="records")

    elif file_type in {"application/csv", "text/csv"}:
        data_df = pd.read_csv(file)
        data_string = data_df.to_json(orient="records")
        print('\n\ncsv')
        print(type(data_string))
        print(data_string)

    elif file_type in {"application/geo+json", "application/octet-stream"}:
        # todo: bring this in line with geodataframe_to_json
        # a problem here is that the geopandas to_json behaves differently than the pandas to_json

        file_content = file.read().decode("utf-8")
        data_gdf = gpd.read_file(file_content)
        # data_gdf = convert_timestamps_to_strings(data_gdf)
        data_string = data_gdf.to_json()
        print('\n\ngeojson')
        print(type(data_string))
        print(data_string)

    file_data = json.loads(data_string)

    return file_data


def geodataframe_to_json(geojson_gdf):
    """
    Convert a GeoDataFrame to text json so that it can be sent to user_data in the Angular app

    # todo: sort the geodataframe here, not the dict later
    # todo: sort this by east and north first, not street address, which may not be present
    """

    geojson_str = geojson_gdf.to_json()
    geojson_dict = json.loads(geojson_str)
    geojson_dict["features"].sort(key=lambda feature: feature["properties"].get("street_address", ""))

    return json.dumps(geojson_dict)


def convert_timestamps_to_strings(input_df):
    """
    Convert timestamp columns to strings so we can serialize them in JSON
    """

    for column in input_df.columns:
        if pd.api.types.is_datetime64_any_dtype(input_df[column]):
            input_df[column] = input_df[column].dt.strftime('%Y-%m-%d %H:%M:%S') # todo: could this be str() instead? more format-agnostic

    return input_df


def convert_geojson_to_dict(file_data):
    """
    """
    if "type" not in file_data:
        return LocationError("`type` key not present in the GeoJSON input.")

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

    geojson_type = file_data["type"]
    if geojson_type not in geojson_types:
        return LocationError(f"GeoJSON type {geojson_type} not recognized.")

    new_dict_list = []
    if file_data["type"] == "FeatureCollection":
        if "features" not in file_data:
            return LocationError("`features` key not present in the GeoJSON input.")

        for feature in file_data["features"]:

            if "properties" in feature:
                new_dict_list.append(feature["properties"])
            else:
                return LocationError("A feature in the GeoJSON input did not have any properties.")

            # if "geometry" in feature:
            #     new_dict_list.append(feature["properties"])
            # else:
            #     return LocationError("A feature in the GeoJSON input did not have any properties.")

    return new_dict_list
