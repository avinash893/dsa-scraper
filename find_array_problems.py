import json

with open("parsed_sheet.json", "r", encoding="utf-8") as f:
    data = json.load(f)

# Find Array category
for sec in data:
    if "Arrays" in sec["category_name"]:
        print(f"Category: {sec['category_name']}")
        for sub in sec["subcategories"]:
            print(f"  Subcategory: {sub['subcategory_name']}")
            for prob in sub["problems"][:3]:
                print(f"    Problem: {prob['problem_name']}")
                print(f"      Article: {prob['article']}")
                print(f"      Leetcode: {prob['leetcode']}")
                print(f"      Difficulty: {prob['difficulty']}")
