import json

with open("parsed_sheet.json", "r", encoding="utf-8") as f:
    data = json.load(f)

reset_count = 0
for sec in data:
    for sub in sec["subcategories"]:
        for prob in sub["problems"]:
            if prob.get("scraped"):
                # Check if it has any code blocks
                solutions = prob.get("solutions", {})
                has_code = False
                for app_name, app_details in solutions.items():
                    if isinstance(app_details, dict) and "code" in app_details and len(app_details["code"]) > 0:
                        has_code = True
                        break
                
                if not has_code:
                    prob["scraped"] = False
                    if "solutions" in prob:
                        del prob["solutions"]
                    if "scraped_at" in prob:
                        del prob["scraped_at"]
                    reset_count += 1

print(f"Reset {reset_count} problems back to unscraped because they had no code solutions.")

with open("parsed_sheet.json", "w", encoding="utf-8") as f:
    json.dump(data, f, indent=2)
