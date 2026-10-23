import os
import re
import glob

# Search for frontend TS/TSX files
frontend_dir = r"d:\Aksh College Material\Charusat\SEM 5\SGP\FinWise-AI\frontend\src"

files = glob.glob(frontend_dir + "/**/*.ts*", recursive=True)

import_statement = "import { apiClient } from '../api/client';\n"
import_statement_2_up = "import { apiClient } from '../../api/client';\n"
import_statement_3_up = "import { apiClient } from '../../../api/client';\n"

for f in files:
    if f.endswith('client.ts') or f.endswith('auth.ts') or "node_modules" in f:
        continue
    
    with open(f, 'r', encoding='utf-8') as file:
        content = file.read()
        
    original = content
    
    if "http://localhost:5000/api" in content:
        # Determine depth
        rel_path = os.path.relpath(f, frontend_dir)
        depth = rel_path.count(os.sep)
        
        imp = "import { apiClient } from '" + "../"*depth + "api/client';\n"
        if "apiClient" not in content:
            content = imp + content
            
        content = re.sub(r"import\s*\{\s*getToken\s*\}\s*from\s*['\"](\.\./)+utils/auth['\"];?\n?", "", content)
        content = re.sub(r"import\s*\{\s*getToken,\s*setToken\s*\}\s*from\s*['\"](\.\./)+utils/auth['\"];?\n?", "", content)
        content = re.sub(r"const\s+token\s*=\s*getToken\(\);\s*", "", content)
        
        # We need to manually fix fetch calls or use regex to convert basic ones.
        # Actually it's safer for me to print out which files have it and I will manually patch them
        print(f"File needs manual patch: {rel_path}")
