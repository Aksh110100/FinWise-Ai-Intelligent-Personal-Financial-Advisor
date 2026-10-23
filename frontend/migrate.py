import os
import re

src_dir = r"d:\Aksh College Material\Charusat\SEM 5\SGP\FinWise-AI\frontend\src"

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original = content
    
    if "apiClient" not in content and "http://localhost:5000/api" in content:
        # Add import depending on depth
        depth = filepath.replace(src_dir, "").count(os.sep)
        prefix = "../" * (depth - 1) if depth > 1 else "./"
        if depth == 1: prefix = "./"
        content = f"import {{ apiClient }} from '{prefix}api/client';\n" + content

    # Replace GET fetch calls with apiClient.get
    # match fetch(`...`, { headers: { Authorization: `Bearer ${token}` } }) or similar
    content = re.sub(
        r"fetch\(([`'\"]http://localhost:5000/api)([^`'\"]+)([`'\"]),\s*\{[^}]*headers:\s*\{\s*Authorization:[^}]*\}\s*\}\)",
        r"apiClient.get(\1\2\3)",
        content
    )
    # Without headers
    content = re.sub(
        r"fetch\(([`'\"]http://localhost:5000/api)([^`'\"]+)([`'\"])\)",
        r"apiClient.get(\1\2\3)",
        content
    )
    
    # POST/PATCH/DELETE
    
    # Replace URL prefix
    content = content.replace("http://localhost:5000/api", "")
    
    # Fix await res.json() to res.data
    content = re.sub(r"await\s+(\w+)\.json\(\)", r"\1.data", content)
    
    # Fix res.ok to evaluate success
    # Since axios throws on non-2xx, res.ok is generally true if we reach it.
    # But some code uses if (res.ok). Let's just leave it or replace it.
    # Actually axios response doesn't have .ok, it has status (200-299)
    # A quick hack: `res.ok` -> `res.status >= 200 && res.status < 300` or just `res.data.success` depending on the API.
    # We'll manually fix the few that are tricky. Let's just replace `http://localhost:5000/api` with `apiClient` where possible.
    pass
