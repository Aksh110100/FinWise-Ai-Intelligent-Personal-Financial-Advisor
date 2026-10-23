const fs = require('fs');
const file = 'src/modules/ai-advisor/tools/index.ts';
let c = fs.readFileSync(file, 'utf8');

if (!c.includes('case \'IPO\':')) {
    c = c.replace(/case 'FINANCIAL_SUMMARY':/, `case 'IPO':
        results.ipo = await getIPOInfo({
           queryType: intentObj.entities.queryType || undefined,
           ipoName: intentObj.entities.ipoName || undefined
        });
        break;
      case 'FINANCIAL_SUMMARY':`);
}

fs.writeFileSync(file, c);
