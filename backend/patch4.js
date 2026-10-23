const fs = require('fs');
const file = 'src/modules/ai-advisor/ai-advisor.service.ts';
let c = fs.readFileSync(file, 'utf8');

c = c.replace(/} else {\\s+lines\.push\(\`\\\\n\\[\$\{toolName\}\\] DATA UNAVAILABLE: No records found for this query\.\`\);/, `} else if (toolName === 'ipo') {
         lines.push(\`\\n[\${toolName}] IPO NOT FOUND: No matching IPO was found, or there are no currently open IPOs. Tell the user you cannot find it.\`);
      } else {
         lines.push(\`\\n[\${toolName}] DATA UNAVAILABLE: No records found for this query.\`);`);

fs.writeFileSync(file, c);
