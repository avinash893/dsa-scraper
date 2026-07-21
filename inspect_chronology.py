import re
import html

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

if not full_html:
    full_html = content

full_html = full_html.replace(r'\u003c', '<').replace(r'\u003e', '>').replace(r'\u0026', '&')

# Let's extract heading tags (h1, h2, h3, h4) and their positions relative to the pre blocks
# We can print all tags and their contents in order
elements = re.findall(r'<(h[1-4]|pre)\b[^>]*>(.*?)</\1>', full_html, re.DOTALL)
print(f"Total elements: {len(elements)}")

for tag, text in elements:
    if tag == 'pre':
        code_lang_match = re.search(r'<code lang="([^"]+)"', text)
        lang = code_lang_match.group(1) if code_lang_match else "unknown"
        print(f"  [Code] Language: {lang} (Length: {len(text)})")
    else:
        cleaned_text = re.sub(r'<[^>]*>', '', text).strip()
        print(f"[{tag.upper()}] {cleaned_text}")
