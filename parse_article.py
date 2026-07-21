import re
import html
import json

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

# Find all <details> blocks
# Wait, details can be nested? In this page they are flat, but we can match them using re.finditer or custom tag parsing.
# Since details tags are flat here, let's find them.
# To be robust, let's parse using a state machine or regex.
details_pattern = re.compile(r'<details\b[^>]*>(.*?)</details>', re.DOTALL)
details_blocks = details_pattern.findall(full_html)

current_approach = "General"
parsed_approaches = {}

for details in details_blocks:
    summary_match = re.search(r'<summary\b[^>]*>(.*?)</summary>', details, re.DOTALL)
    summary_text = re.sub(r'<[^>]*>', ' ', summary_match.group(1)).strip() if summary_match else "No Summary"
    summary_text = ' '.join(summary_text.split())
    
    # Clean the details block inner content
    # Remove summary from details content
    content_without_summary = details
    if summary_match:
        content_without_summary = content_without_summary[summary_match.end():]
        
    if summary_text in ["Examples", "Video Explanation"]:
        # Save examples separately
        parsed_approaches[summary_text] = {
            "title": summary_text,
            "description": re.sub(r'<[^>]*>', ' ', content_without_summary).strip()
        }
    elif "approach" in summary_text.lower() or "force" in summary_text.lower() or "better" in summary_text.lower() or "optimal" in summary_text.lower():
        current_approach = summary_text
        parsed_approaches[current_approach] = {
            "title": current_approach,
            "description": re.sub(r'<[^>]*>', ' ', content_without_summary).strip(),
            "code": {},
            "complexity": ""
        }
    elif summary_text == "Code":
        # Extract code blocks
        pre_blocks = re.findall(r'<pre\b[^>]*>(.*?)</pre>', content_without_summary, re.DOTALL)
        codes = {}
        for pre in pre_blocks:
            # Check language
            lang_match = re.search(r'<code lang="([^"]+)"', pre)
            if not lang_match:
                # Fallback to class
                lang_match = re.search(r'class="language-([^"]+)"', pre)
            
            lang = lang_match.group(1) if lang_match else "unknown"
            
            # Extract code text - strip code tag if present
            code_text = pre
            code_text_match = re.search(r'<code\b[^>]*>(.*?)</code>', pre, re.DOTALL)
            if code_text_match:
                code_text = code_text_match.group(1)
            
            # Clean HTML entities
            code_text = html.unescape(code_text).strip()
            
            codes[lang] = code_text
        
        if current_approach not in parsed_approaches:
            parsed_approaches[current_approach] = {"title": current_approach, "code": {}}
        parsed_approaches[current_approach]["code"] = codes
    elif summary_text == "Complexity Analysis":
        if current_approach not in parsed_approaches:
            parsed_approaches[current_approach] = {"title": current_approach}
        parsed_approaches[current_approach]["complexity"] = re.sub(r'<[^>]*>', ' ', content_without_summary).strip()

print(json.dumps(parsed_approaches, indent=2))
