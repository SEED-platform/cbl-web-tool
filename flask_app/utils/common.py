# !/usr/bin/env python
"""
SEED Platform (TM), Copyright (c) Alliance for Sustainable Energy, LLC, and other contributors.
See also https://github.com/SEED-platform/cbl-web-tool/blob/main/LICENSE.md
"""

from typing import TypedDict


class Location(TypedDict):
    street: str
    city: str
    state: str
