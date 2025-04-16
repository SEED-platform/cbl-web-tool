# !/usr/bin/env python
"""
SEED Platform (TM), Copyright (c) Alliance for Sustainable Energy, LLC, and other contributors.
See also https://github.com/SEED-platform/cbl-web-tool/blob/main/LICENSE.md
"""

import os
from pathlib import Path

import geopandas as gpd
from pyproj import CRS

from flask_app.utils.ubid import add_ubid_to_geodataframe


def shp_to_geojson(shapefile: str | Path):
    file_name, _ext = os.path.splitext(shapefile)
    gdf = gpd.read_file(shapefile).to_crs(CRS.from_epsg(4326))
    (add_ubid_to_geodataframe(gdf, additional_ubid_columns_to_create=[]).to_file(f"{file_name}.geojson", driver="GeoJSON"))
