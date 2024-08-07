from utils.location_error import LocationError

# Enforcing the required unique column names 
def check_data_quality(json_dict_list): 
    for d in json_dict_list:
        if "Street_Address" not in d and "Street_address" not in d and "street_address" not in d and "street_Address" not in d:
            return LocationError("Missing unique 'Street_Address' column")
        if "City" not in d and "city" not in d:
            return LocationError("Missing unique 'City' column")
        if "State" not in d and "state" not in d:
            return LocationError("Missing unique 'State' column")

        # values must only be primitive types
        for value in d.values():
                if not isinstance(value, (int, str, bool, float)): 
                    return LocationError("Data is formatted poorly in one of the table cells")