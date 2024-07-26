def merge_dicts(dict1, dict2):
    merged_dict = {}
    for key, value in dict1.items():
        merged_dict[key.lower()] = value
    
    for key, value in dict2.items():
        if "address" == key.lower():
            merged_dict["street_address"] = value
        else:
            merged_dict[key.lower()] = value

    merged_dict = remove_duplicate_vals(merged_dict)     
    
    return merged_dict

# removes different keys that have the same value
def remove_duplicate_vals(d):
    value_to_keys = {}
    for key, value in d.items():
        if value not in value_to_keys:
            value_to_keys[value] = [key]
        else:
            value_to_keys[value].append(key)

    new_dict = {}
    for value, keys in value_to_keys.items():
        if keys:
            new_dict[keys[0]] = value
    
    return new_dict