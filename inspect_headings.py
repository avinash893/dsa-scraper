import re

file_path = r"C:\Users\avina\.gemini\antigravity\brain\28a25d1b-a52f-423f-850f-952dd035ef95\.system_generated\steps\40\content.md"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Decode unicode escapes
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

# Find all heading occurrences
headings = re.findall(r'<h[1-6]\b[^>]*>(.*?)</h[1-6]>', full_html, re.DOTALL)
print(f"Total headings found: {len(headings)}")
for h in headings[:15]:
    print(re.sub(r'<[^>]*>', '', h).strip())
