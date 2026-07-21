import re
import html

with open("decoded_full.html", "r", encoding="utf-8") as f:
    html_content = f.read()

# Let's search for occurrences of strong elements
strongs = re.findall(r'<strong\b[^>]*>(.*?)</strong>', html_content, re.DOTALL)
print(f"Total <strong> tags found: {len(strongs)}")
for s in strongs:
    clean = re.sub(r'<[^>]*>', '', s).strip()
    # Check if it looks like an approach or example
    if any(word in clean.lower() for word in ["approach", "brute", "optimal", "better", "solution", "example"]):
        print(f"  Matches: {clean}")

# Let's also look at blockquotes or paragraphs around pre tags
# Let's print the 200 characters before each <pre> tag
pre_matches = list(re.finditer(r'<pre\b', html_content))
print(f"\nTotal <pre> matches: {len(pre_matches)}")
for i, match in enumerate(pre_matches):
    start = match.start()
    before = html_content[max(0, start-200):start]
    # Clean before
    before_clean = re.sub(r'<[^>]*>', ' ', before)
    before_clean = " ".join(before_clean.split())
    print(f"  Pre {i+1} - Text before: ... {before_clean[-100:]}")
