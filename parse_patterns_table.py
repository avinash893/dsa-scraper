import re

file_path = r"C:\Users\avina\.gemini\antigravity\brain\28a25d1b-a52f-423f-850f-952dd035ef95\.system_generated\steps\189\content.md"
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

# Let's find all pattern links in the table rows
# We can search for pattern_X checkboxes and the links around them
rows = re.findall(r'<tr\b[^>]*>(.*?)</tr>', full_html, re.DOTALL)
print(f"Total table rows: {len(rows)}")

pattern_map = {}
for row in rows:
    checkbox_match = re.search(r'id=["\']pattern_(\d+)["\']', row)
    if checkbox_match:
        num = checkbox_match.group(1)
        # Find all hrefs in this row
        hrefs = re.findall(r'href=["\'](https://takeuforward.org/pattern/[^"\']+)["\']', row)
        if hrefs:
            pattern_map[f"pattern {num}"] = hrefs[0]
            print(f"pattern {num} -> {hrefs[0]}")

print(f"Mapped {len(pattern_map)} patterns.")
