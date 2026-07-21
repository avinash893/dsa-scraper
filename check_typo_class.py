import re

file_path = r"C:\Users\avina\.gemini\antigravity\brain\28a25d1b-a52f-423f-850f-952dd035ef95\.system_generated\steps\24\content.md"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Check for atricle_example_content
match = "atricle_example_content" in content
print(f"Is 'atricle_example_content' in c-basic-input-output? {match}")
