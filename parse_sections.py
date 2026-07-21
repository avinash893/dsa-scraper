import json
import re

with open("sections_raw.json", "r", encoding="utf-8") as f:
    raw_content = f.read()

# Let's fix common NextJS JSON serialization placeholders
# E.g. $undefined, $@a, etc.
# We can replace them with valid JSON equivalents or empty strings.
fixed_content = raw_content
fixed_content = re.sub(r':\s*\$undefined\b', ': null', fixed_content)
fixed_content = re.sub(r':\s*"\$undefined"', ': null', fixed_content)
# Let's also check for other NextJS placeholders
fixed_content = re.sub(r':\s*\$@\w+\b', ': null', fixed_content)

try:
    data = json.loads(fixed_content)
    print("Success! Successfully loaded sections as valid JSON!")
    print(f"Number of sections: {len(data)}")
    
    # Let's summarize the structure:
    sections_summary = []
    total_problems = 0
    for sec in data:
        cat_name = sec.get("category_name", "Unknown Category")
        subcats = sec.get("subcategories", [])
        subcat_list = []
        for sub in subcats:
            sub_name = sub.get("subcategory_name", "Unknown Subcategory")
            problems = sub.get("problems", [])
            total_problems += len(problems)
            subcat_list.append({
                "name": sub_name,
                "problem_count": len(problems)
            })
        sections_summary.append({
            "category": cat_name,
            "subcategories": subcat_list
        })
    
    print(f"Total problems in the sheet: {total_problems}")
    
    # Save the cleaned, parsed data
    with open("parsed_sheet.json", "w", encoding="utf-8") as out:
        json.dump(data, out, indent=2)
    print("Cleaned JSON written to parsed_sheet.json")
    
    # Write a quick text summary to console
    for sec in sections_summary:
        print(f"\nCategory: {sec['category']}")
        for sub in sec['subcategories']:
            print(f"  - {sub['name']} ({sub['problem_count']} problems)")
            
except Exception as e:
    print(f"Error parsing JSON: {e}")
    # Let's write the first 1000 chars of fixed_content around the error if we can find it
    # We can write a snippet of where the error is
    import traceback
    traceback.print_exc()
