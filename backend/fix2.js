const fs = require('fs');

let idx = fs.readFileSync('src/modules/ai-advisor/tools/index.ts', 'utf8');

if (!idx.includes("const IPO_KEYWORDS")) {
    idx = idx.replace("const SUMMARY_KEYWORDS = ['summary', 'overview', 'financial status', 'net worth'];", 
    "const SUMMARY_KEYWORDS = ['summary', 'overview', 'financial status', 'net worth'];\nconst IPO_KEYWORDS = ['ipo', 'initial public offering', 'open ipos', 'upcoming ipos'];");
}

if (!idx.includes("import { getIPOInfo }")) {
    idx = idx.replace("import { getMutualFundInfo } from './mutual-fund.tool';", 
    "import { getMutualFundInfo } from './mutual-fund.tool';\nimport { getIPOInfo } from './ipo.tool';");
}

if (!idx.includes("ipoName: intentObj.entities.ipoName")) {
    // wait it complained that property doesn't exist on type.
    // wait, where is it typed? The return of getLocalEntities?
    // ah! 'ipoName' does not exist on type...
}

idx = idx.replace(/const hasIPO      = IPO_KEYWORDS\.some/g, "const hasIPO = typeof IPO_KEYWORDS !== 'undefined' && IPO_KEYWORDS.some");

fs.writeFileSync('src/modules/ai-advisor/tools/index.ts', idx);
