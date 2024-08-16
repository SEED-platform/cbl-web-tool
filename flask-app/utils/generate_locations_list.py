from utils.common import Location


# Generating a list of locations from user-inputted file
def generate_locations_list(json_dict_list):
    locations: list[Location] = []

    for d in json_dict_list:
        street = ""
        city = ""
        state = ""
        for key in d:
            if key.lower() == "street_address":
                street = d[key]

            if key.lower() == "city":
                city = d[key]

            if key.lower() == "state":
                state = d[key]

        loc_dict = {"street": street, "city": city, "state": state}
        locations.append(loc_dict)

    return locations
