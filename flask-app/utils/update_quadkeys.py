# !/usr/bin/env python
"""
SEED Platform (TM), Copyright (c) Alliance for Sustainable Energy, LLC, and other contributors.
See also https://github.com/SEED-platform/seed/blob/main/LICENSE.md
"""

from pathlib import Path

import pandas as pd
import requests

import config


def update_quadkeys(quadkeys: list[int], save_directory: Path = config.ms_footprint_dir):
    """Downloads a list of quadkeys.
    Skip the download if it has already been downloaded, and it is up-to-date
    """
    save_directory.mkdir(parents=True, exist_ok=True)
    df_update = pd.read_csv(save_directory / "dataset-links.csv")

    for quadkey in quadkeys:
        # app.logger.info(f'Checking if quadkey {quadkey} is up to date.')
        download = True
        quadkey_file = save_directory / f"{quadkey}.geojsonl.gz"
        rows = df_update[df_update["QuadKey"] == quadkey]
        if rows.shape[0] == 1:
            url = rows.iloc[0]["Url"]
        elif rows.shape[0] > 1:
            url = rows.iloc[-1]["Url"]
            # raise ValueError(f"Multiple rows found for QuadKey: {quadkey}")
        else:
            raise ValueError(f"QuadKey not found in dataset: {quadkey}")

        if quadkey_file.exists():
            local_size = quadkey_file.stat().st_size
            remote_size = int(requests.head(url).headers["Content-Length"])
            download = local_size != remote_size

        if download:
            # app.logger.info(f'Downloading new data from Microsoft for quadkey {quadkey}')
            with open(quadkey_file, "wb") as f:
                f.write(requests.get(url).content)
