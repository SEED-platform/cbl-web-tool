# CBL Web Tool

Given a list of addresses uploaded in JSON, CSV, or excel format, this tool will:
- Normalize each address
- Geocode each address via MapQuest to a lat/long coordinate
- Download the [Microsoft Building Footprints](https://github.com/microsoft/GlobalMLBuildingFootprints/) for all areas encompassed by the geocoded coordinates
- Find the footprint that intersects (or is closest to) each geocoded coordinate
- Generate the UBID for each footprint
- Display the results of the workflow in a table on the webpage or export the resulting data as csv and GeoJSON

### Prerequisites
1. Optionally create a Virtualenv Environment in the flask-app directory
2. Dependencies for the flask app are managed through Poetry, install with `pip install poetry`
3. Create a `.env` file in the flask-app directory with your MapQuest API key in the format:
    ```dotenv
    MAPQUEST_API_KEY=XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
    ```
    Note that if an env key for MAPQUEST_API_KEY exists in your profile, then it use that over the .env file.
4. Install dependencies with `poetry install`
5. In the angular-app directory, install angular by running `npm install -g @angular/cli@17`

### Running the Web App
1. Run the web app by opening two terminals: one with the working directory as angular-app and running `ng serve -o` and the other with the working directory as flask-app and running `python app.py`
2. After connecting to the web application using the following link http://localhost:4200/, upload a file in the format of a json (example below) or excel/csv with columns for street_address, city, and state:
    ```json
    [
      {
        "street_address": "100 W 14th Ave Pkwy",
        "city": "Denver",
        "state": "CO"
      },
      {
        "street_address": "200 E Colfax Ave",
        "city": "Denver",
        "state": "CO"
      },
      {
        "street_address": "320 W Colfax Ave",
        "city": "Denver",
        "state": "CO"
      }
    ]
    ```
3. Once the file is uploaded and your data appears in a table on the web page, click the `Check Data` button to ensure that the data in the file meets the format requirements for the tool.
There are three required column names that can be edited in the table: street_address, city, and state
4. If the data conforms to the data check requirements, a button labeled `Run CBL Workflow` will appear. Click this button to generate a covered buildings list. Note: it will take some time to generate the list and display it.
5. Once the list is generated, a table and map with highlighted building footprints will appear side-by-side on the web page. In this menu, there are a multitude of functions to utilize:
   a. The user can select on a row in the table and fly to a specific building, as well as edit data in the rows of the table. 
   b. A footprint can be manually edited/redrawn by double clicking on an existing footprint and dragging any of the polygon's vertices.
   c. For a specific piece of data, if a row is selected, the user can click the trashcan icon on the map and remove the footprint corresponding to that row in the table. A new footprint          for this row can be redrawn using the pencil icon and the data in the row will be automatically updated.
   d. The user can reverse geocode/add a new building using the building icon on the map and drawing a new footprint at the desired location. This will add a new entry to the table.
   e. The user can also delete data entirely from the map and the table by selecting the row on the table and clicking the `Delete Selected Row` button.

### Future Ideas
- Flagging duplicate buildings
- Uploading multiple files and merging the contents before generating the CBL
- Switching between map and satellite view on the map

