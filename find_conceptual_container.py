import re

file_path = r"C:\Users\avina\.gemini\antigravity\brain\28a25d1b-a52f-423f-850f-952dd035ef95\.system_generated\steps\24\content.md"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Find next_f pushes and decode
pushes = re.findall(r'self\.__next_f\.push\(\[1,\s*"(.*?)"\]\)', content)
full_html = ""
for push in pushes:
    try:
        decoded = bytes(push, "utf-8").decode("unicode_escape")
        full_html += decoded
    except Exception as e:
        full_html += push

# Search for div class names
div_classes = set(re.findall(r'<div class="([^"]+)"', full_html))
print("Div classes in c-basic-input-output:")
for c in sorted(div_classes):
    print(f"  {c}")
