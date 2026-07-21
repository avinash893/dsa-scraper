import re
import html
from html.parser import HTMLParser

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

# Try using BeautifulSoup
try:
    from bs4 import BeautifulSoup
    soup = BeautifulSoup(full_html, 'html.parser')
    print("Using BeautifulSoup:")
    
    details_elements = soup.find_all('details')
    print(f"Total details: {len(details_elements)}")
    
    current_approach = "General"
    for det in details_elements:
        summary = det.find('summary')
        if not summary:
            continue
        summary_text = summary.get_text().strip()
        print(f"\nSummary: {summary_text}")
        
        if "approach" in summary_text.lower():
            current_approach = summary_text
            print(f"  Set current_approach = {current_approach}")
        elif summary_text == "Code":
            print(f"  Analyzing Code details block (current_approach = {current_approach})")
            code_blocks = det.find_all(class_='code-block')
            print(f"    Code blocks found: {len(code_blocks)}")
            for cb in code_blocks:
                lang = cb.get('data-lang', 'unknown')
                code_tag = cb.find(['code', 'pre'])
                code_text = code_tag.get_text().strip() if code_tag else "No Code Tag"
                print(f"      Lang: {lang} (Length: {len(code_text)})")
                
except Exception as e:
    print(f"BeautifulSoup error: {e}")
