"""
SEED Platform (TM), Copyright (c) Alliance for Sustainable Energy, LLC, and other contributors.
See also https://github.com/SEED-platform/cbl-web-tool/blob/main/LICENSE.md
"""


def extract_coordinates(geojson_data):
    coordinates = []
    for feature in geojson_data["features"]:
        if feature["geometry"]["type"] == "Polygon":
            coordinates.extend(feature["geometry"]["coordinates"])
    return coordinates
