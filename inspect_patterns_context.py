import re

file_path = r"C:\Users\avina\.gemini\antigravity\brain\28a25d1b-a52f-423f-850f-952dd035ef95\.system_generated\steps\189\content.md"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

pushes = re.findall(r'self\.__next_f\.push\(\[1,\s*"(.*?)"\]\)', content)
full_html = ""
for push in pushes:
    try:
        decoded = bytes(push, "utf-8").decode("unicode_escape")
        full_html += decoded
    except Exception as e:
        full_html += push

if not full_html:
    full_html = content

full_html = full_html.replace(r'\u003c', '<').replace(r'\u003e', '>').replace(r'\u0026', '&')

# Find occurrences of "Pattern-1" or "Pattern 1"
idx = full_html.lower().find("pattern 1")
if idx == -1:
    idx = full_html.lower().find("pattern-1")
    
if idx != -1:
    print("Found pattern heading context!")
    print(full_html[max(0, idx-200):idx+1200])
else:
    print("Could not find pattern text in full_html")
