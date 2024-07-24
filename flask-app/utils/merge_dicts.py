def merge_dicts(dict1, dict2):
    merged_dict = {}
    for key, value in dict1.items():
        merged_dict[key.lower()] = value
    
    for key, value in dict2.items():
        if "address" == key.lower():
            merged_dict["street_address"] = value
        else:
            merged_dict[key.lower()] = value
    
    return merged_dict