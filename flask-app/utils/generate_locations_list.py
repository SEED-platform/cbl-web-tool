from utils.common import Location

# Generating a list of locations from user-inputted file
def generate_locations_list(json_dict_list):
    locations: list[Location] = []

    for d in json_dict_list:
        street = ''
        city = ''
        state = ''
        for key in d.keys():
            if "street_address" == key.lower():
                street = d[key]

            if "city" == key.lower():
                city = d[key]

            if "state" == key.lower():
                state = d[key]

        loc_dict = {
            'street': street,
            'city': city,
            'state': state
        }
        locations.append(loc_dict)
            
    return locations