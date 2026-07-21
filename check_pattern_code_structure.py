import re
import html

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

# Find the Details tag with summary "Code"
details_blocks = re.findall(r'<details\b[^>]*>(.*?)</details>', full_html, re.DOTALL)
for details in details_blocks:
    summary_match = re.search(r'<summary\b[^>]*>(.*?)</summary>', details, re.DOTALL)
    if summary_match:
        summary_text = re.sub(r'<[^>]*>', '', summary_match.group(1)).strip()
        if "code" in summary_text.lower():
            print("Found Code details block!")
            print(f"Content snippet of details block:\n{details[:800]}")
            # Find any code or pre tags
            pre_tags = re.findall(r'<pre\b[^>]*>(.*?)</pre>', details, re.DOTALL)
            print(f"Pre tags found: {len(pre_tags)}")
            for i, p in enumerate(pre_tags):
                print(f"  Pre {i+1} length: {len(p)}")
                print(f"  Pre {i+1} snippet: {p[:150]}")
            break
