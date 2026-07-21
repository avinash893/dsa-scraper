import re

file_path = r"C:\Users\avina\.gemini\antigravity\brain\28a25d1b-a52f-423f-850f-952dd035ef95\.system_generated\steps\40\content.md"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Let's see if there are any next_f pushes first
pushes = re.findall(r'self\.__next_f\.push\(\[1,\s*"(.*?)"\]\)', content)
print(f"Pushes: {len(pushes)}")

full_html = ""
for push in pushes:
    try:
        decoded = bytes(push, "utf-8").decode("unicode_escape")
        full_html += decoded
    except Exception as e:
        full_html += push

print(f"Full HTML Length: {len(full_html)}")

# Print a 500-char sample of full_html where "Largest" appears
idx = full_html.lower().find("largest")
if idx != -1:
    print(f"Sample around 'largest':\n{full_html[idx-100:idx+400]}")
else:
    print("Could not find 'largest'")
