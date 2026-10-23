const fs = require('fs');

let idx = fs.readFileSync('src/modules/ai-advisor/tools/index.ts', 'utf8');

if (!idx.includes("import { getIPOInfo }")) {
    idx = idx.replace(/import \{ getMutualFundInfo \} from '\.\/mutual-fund\.tool';/g, 
    "import { getMutualFundInfo } from './mutual-fund.tool';\nimport { getIPOInfo } from './ipo.tool';");
}
fs.writeFileSync('src/modules/ai-advisor/tools/index.ts', idx);
