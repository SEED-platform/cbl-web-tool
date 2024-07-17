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
2. After connecting to the web application using the following link http://localhost:4200/, upload a file in the format of a json (example below) or excel with columns for street, city, and state:
    ```json
    [
      {
        "street": "100 W 14th Ave Pkwy",
        "city": "Denver",
        "state": "CO"
      },
      {
        "street": "200 E Colfax Ave",
        "city": "Denver",
        "state": "CO"
      },
      {
        "street": "320 W Colfax Ave",
        "city": "Denver",
        "state": "CO"
      }
    ]
    ```
3. The results of the workflow can be viewed in a table on the website or can be downloaded locally using the export button

### Future Ideas
- A large amount of visual improvements to the web page to make the app easier to use as well as more visually appealing
- Add an option for user to input a mapquest API key and perform a check to see if it is a valid key
- Visualization using a map, allowing the user to make manual edits to their data using the map or in the table that is displaying their data
- Build the tool out to make it capable of figuring out the format of the imported data rather than requiring data in a specific format

