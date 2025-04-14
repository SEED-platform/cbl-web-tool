"""
------------------------
Config File Instructions
------------------------

This file contains configuration variables for the entire project.

Any script can use these variables by calling `import flask_app.config` then
referencing the variable, such as `config.ms_footprint_dir`
"""

from pathlib import Path

# Define directory paths
data_dir = Path("data")
ms_footprint_dir = data_dir / Path("quadkeys")
