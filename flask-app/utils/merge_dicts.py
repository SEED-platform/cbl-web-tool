def merge_dicts(file_dict, data_dict):
    merged_dict = {}
    for key, value in data_dict.items():
        if key.lower() == "address":
            merged_dict["street_address"] = value
        elif key not in {"side_of_street", "footprint_match", "neighborhood", "height", "quadkey"}:
            # want to exclude this useless data
            merged_dict[key.lower()] = value

    for key, value in file_dict.items():
        if key.lower() != "street_address":  # don't want to overwrite normalized address from data dict
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
