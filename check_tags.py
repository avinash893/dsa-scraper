import re

file_path = r"C:\Users\avina\.gemini\antigravity\brain\28a25d1b-a52f-423f-850f-952dd035ef95\.system_generated\steps\40\content.md"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Let's decode unicode escapes
pushes = re.findall(r'self\.__next_f\.push\(\[1,\s*"(.*?)"\]\)', content)
full_html = ""
for push in pushes:
    try:
        decoded = bytes(push, "utf-8").decode("unicode_escape")
        full_html += decoded
    except Exception as e:
        full_html += push

with open("decoded_full.html", "w", encoding="utf-8") as out:
    out.write(full_html)

# Let's find any HTML tags of any kind (e.g. <h3>, <p>, etc.) using a simple search
tags = set(re.findall(r'<([a-zA-Z0-9]+)\b', full_html))
print(f"Unique HTML tags found: {tags}")

# Find any headings specifically (case-insensitive)
headings_tags = [t for t in tags if t.lower().startswith('h') and len(t) == 2]
print(f"Heading tags found: {headings_tags}")
