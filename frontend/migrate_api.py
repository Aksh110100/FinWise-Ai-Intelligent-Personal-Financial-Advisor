import os
import re

hooks_dir = r"d:\Aksh College Material\Charusat\SEM 5\SGP\FinWise-AI\frontend\src\hooks"
api_client_import = "import { apiClient } from '../api/client';\n"

def process_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    # If it already has apiClient, skip
    if "apiClient" in content and "from '../api/client'" in content:
        return

    # Add import
    content = api_client_import + content

    # Remove getToken import if it's there
    content = re.sub(r"import\s*\{\s*getToken\s*\}\s*from\s*'../utils/auth';?\n?", "", content)
    
    # Remove const token = getToken();
    content = re.sub(r"const\s+token\s*=\s*getToken\(\);\s*", "", content)

    # Replace fetch(`http://localhost:5000/api/...`) with apiClient.get('/...')
    # Needs a bit of regex care. Let's do simple replacements where possible.

    # This regex looks for: fetch(`http://localhost:5000/api/some/path`, { headers: { Authorization: `Bearer ${token}` } })
    # and transforms to apiClient.get('/some/path')
    
    # We will do a generic replacement for GET requests:
    get_pattern = re.compile(
        r"fetch\(['\"`]http://localhost:5000/api([^'`\"]+)['\"`],\s*\{\s*headers:\s*\{\s*Authorization:\s*`Bearer \$\{token\}`\s*\}\s*\}\)",
        re.MULTILINE
    )
    content = get_pattern.sub(r"apiClient.get('\1')", content)

    # Replace POST, PATCH, DELETE requests
    # Example:
    """
    const res = await fetch('http://localhost:5000/api/savings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });
    """
    
    # Let's write a smarter Python replacement
    # Just replacing the URL string
    content = content.replace("http://localhost:5000/api", "")
    
    with open(filepath, 'w') as f:
        f.write(content)
        
for f in os.listdir(hooks_dir):
    if f.endswith('.ts') or f.endswith('.tsx'):
        print(f"Processing {f}")
        process_file(os.path.join(hooks_dir, f))
