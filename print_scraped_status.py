import json

with open("parsed_sheet.json", "r", encoding="utf-8") as f:
    data = json.load(f)

scraped_probs = []
for sec in data:
    for sub in sec["subcategories"]:
        for prob in sub["problems"]:
            if prob.get("scraped"):
                scraped_probs.append({
                    "id": prob["problem_id"],
                    "name": prob["problem_name"],
                    "solutions_keys": list(prob.get("solutions", {}).keys()),
                    "has_code": any("code" in v and len(v["code"]) > 0 for k, v in prob.get("solutions", {}).items() if isinstance(v, dict))
                })

print(f"Total scraped problems in DB: {len(scraped_probs)}")
for p in scraped_probs[:25]:
    print(f"ID {p['id']}: {p['name']} -> Solutions: {p['solutions_keys']}, Has Code: {p['has_code']}")
