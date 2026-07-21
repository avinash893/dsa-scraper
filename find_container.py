with open("decoded_full.html", "r", encoding="utf-8") as f:
    html_content = f.read()

# Let's search for tags that might enclose the article content, e.g. <article>, <main>, or divs with specific classes
# Let's print unique class names of divs that are high up
import re
div_classes = set(re.findall(r'<div class="([^"]+)"', html_content))
print("Div classes found:")
for c in sorted(div_classes):
    if any(k in c.lower() for k in ["article", "content", "post", "body"]):
        print(f"  {c}")

# Let's also search for <article> tags
articles = re.findall(r'<article\b[^>]*>', html_content)
print(f"Article tags: {articles}")
