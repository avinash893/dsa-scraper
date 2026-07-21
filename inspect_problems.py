import json

with open("parsed_sheet.json", "r", encoding="utf-8") as f:
    data = json.load(f)

# Print first 3 problems of the first subcategory
first_sec = data[0]
first_sub = first_sec["subcategories"][0]
print(f"Subcategory: {first_sub['subcategory_name']}")
for prob in first_sub["problems"][:5]:
    print(json.dumps(prob, indent=2))
