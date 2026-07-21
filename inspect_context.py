with open("decoded_full.html", "r", encoding="utf-8") as f:
    html_content = f.read()

idx = html_content.find('<code lang="cpp"')
if idx != -1:
    print(f"Context before code (2000 chars):\n{html_content[max(0, idx-2000):idx]}")
