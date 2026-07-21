import re

file_path = r"C:\Users\avina\.gemini\antigravity\brain\28a25d1b-a52f-423f-850f-952dd035ef95\.system_generated\steps\205\content.md"
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

# Find details summaries
details_blocks = re.findall(r'<details\b[^>]*>(.*?)</details>', full_html, re.DOTALL)
print(f"Total <details> blocks found on individual pattern page: {len(details_blocks)}")
for i, details in enumerate(details_blocks):
    summary_match = re.search(r'<summary\b[^>]*>(.*?)</summary>', details, re.DOTALL)
    summary_text = re.sub(r'<[^>]*>', ' ', summary_match.group(1)).strip() if summary_match else "No Summary"
    summary_text = ' '.join(summary_text.split())
    print(f"  Details {i+1}: {summary_text}")
