import re

with open("decoded_full.html", "r", encoding="utf-8") as f:
    html_content = f.read()

# Find details tags
details_matches = re.findall(r'<details\b[^>]*>(.*?)</details>', html_content, re.DOTALL)
print(f"Total <details> tags: {len(details_matches)}")

for i, details in enumerate(details_matches):
    # Print the summary tag inside this details tag
    summary_match = re.search(r'<summary\b[^>]*>(.*?)</summary>', details, re.DOTALL)
    summary_text = re.sub(r'<[^>]*>', ' ', summary_match.group(1)).strip() if summary_match else "No Summary"
    print(f"\n--- Details {i+1} ---")
    print(f"Summary: {' '.join(summary_text.split())}")
    # Print snippet of contents
    print(f"Content length: {len(details)}")
