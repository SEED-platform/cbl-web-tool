from utils.location_error import LocationError

# Checking for duplicates in the list of dictionaries 
def check_data_quality(json_dict_list): 
    for i in range(len(json_dict_list) - 1):
        dict1 = json_dict_list[i]

        # Enforcing the required unique column names 
        if "Street_Address" not in dict1 and "Street_address" not in dict1 and "street_address" not in dict1:
            return LocationError("Missing unique 'Street_Address' column")
        if "City" not in dict1 and "city" not in dict1:
            return LocationError("Missing unique 'City' column")
        if "State" not in dict1 and "state" not in dict1:
            return LocationError("Missing unique 'State' column")

        for j in range(i + 1, len(json_dict_list)):
            dict2 = json_dict_list[j]

            if (dict1 == dict2):
                dict1["duplicate?"] = "possible duplicate"
                dict2["duplicate?"] = "possible duplicate"

            else: 
                dict1["duplicate?"] = ""
                dict2["duplicate?"] = ""

    # values must only be primitive types
    for d in json_dict_list:
        for value in d.values():
            if not isinstance(value, (int, str, bool, float)): 
                return LocationError("Data is formatted poorly in one of the table cells")