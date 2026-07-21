import json
import re

file_path = r"C:\Users\avina\.gemini\antigravity\brain\28a25d1b-a52f-423f-850f-952dd035ef95\.system_generated\steps\6\content.md"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Let's search for "sections" block.
# We can find all self.__next_f.push calls and extract their string content.
pushes = re.findall(r'self\.__next_f\.push\(\[1,\s*"(.*?)"\]\)', content)
full_string = ""
for push in pushes:
    # Unescape the string
    # Replace escaped quotes, etc.
    try:
        decoded = bytes(push, "utf-8").decode("unicode_escape")
        full_string += decoded
    except Exception as e:
        full_string += push

print(f"Total pushes found: {len(pushes)}")
print(f"Length of full_string: {len(full_string)}")

# Search for the sections list inside the full string
sections_match = re.search(r'"sections"\s*:\s*(\[.*?\])(,\s*"|$)', full_string)
if sections_match:
    sections_json_str = sections_match.group(1)
    # The JSON string might contain unescaped quotes or JSON-like syntax.
    # Let's write the parsed sections string to a file to examine.
    with open("sections_raw.json", "w", encoding="utf-8") as out:
        out.write(sections_json_str)
    print("Found sections json and wrote to sections_raw.json")
else:
    # Let's search in the content directly for sections pattern
    sections_match_direct = re.search(r'"sections"\s*:\s*(\[.*?\])', content)
    if sections_match_direct:
        print("Found sections direct match!")
        with open("sections_raw.json", "w", encoding="utf-8") as out:
            out.write(sections_match_direct.group(1))
    else:
        print("Could not find sections list")
