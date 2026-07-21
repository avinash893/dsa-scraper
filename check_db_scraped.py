import json

with open("parsed_sheet.json", "r", encoding="utf-8") as f:
    data = json.load(f)

# Find first problem "Pattern 1" (ID 401)
for sec in data:
    for sub in sec["subcategories"]:
        for prob in sub["problems"]:
            if prob["problem_id"] in ["401", "412"]:
                print(f"\nFound '{prob['problem_name']}' problem entry in JSON!")
                print(f"Scraped status: {prob.get('scraped')}")
                solutions = prob.get('solutions', {})
                print(f"Solutions keys: {list(solutions.keys())}")
                for app_name, app_details in solutions.items():
                    if app_name in ["Examples", "Video Explanation"]:
                        continue
                    print(f"  Approach: {app_name}")
                    code_dict = app_details.get('code', {})
                    print(f"    Available Langs: {list(code_dict.keys())}")
                    for lang, code in code_dict.items():
                        print(f"      {lang}: {code[:150]}...")
