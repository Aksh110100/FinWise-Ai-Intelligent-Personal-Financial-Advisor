const fs = require('fs');
const file = 'src/modules/ai-advisor/tools/index.ts';
let c = fs.readFileSync(file, 'utf8');

c = c.replace(/\| 'MUTUAL_FUND';/, "| 'MUTUAL_FUND'\n  | 'IPO';");
c = c.replace(/import { getMutualFundInfo } from '\.\/mutual-fund\.tool';/, "import { getMutualFundInfo } from './mutual-fund.tool';\nimport { getIPOInfo } from './ipo.tool';");
c = c.replace(/const SUMMARY_KEYWORDS = \['summary', 'overview', 'financial status', 'net worth'\];/, "const SUMMARY_KEYWORDS = ['summary', 'overview', 'financial status', 'net worth'];\nconst IPO_KEYWORDS = ['ipo', 'initial public offering', 'open ipos', 'upcoming ipos'];");
c = c.replace(/\| 'MUTUAL_FUND\",/, "| 'MUTUAL_FUND' | 'IPO\",");
c = c.replace(/\"fundName\": string \| null,/, "\"fundName\": string | null,\n    \"ipoName\": string | null,\n    \"queryType\": \"search\" | \"nav\" | \"history\" | \"categories\" | \"details\" | \"open\" | null");
c = c.replace(/\"queryType\": \"search\".*null/, ""); // clean duplicate
c = c.replace(/5\. Use MUTUAL_FUND for any questions.*/g, "5. Use MUTUAL_FUND for any questions about external mutual funds (e.g. NAV, history, searching funds, categories like Large Cap). Extract the fund name and set queryType to nav, history, details, search, or categories appropriately.\n6. Use IPO for questions about Initial Public Offerings (e.g., \"What IPOs are open?\", \"Tell me about ABC IPO\"). Set ipoName if a specific one is mentioned.");
c = c.replace(/const hasSummary  = SUMMARY_KEYWORDS\.some\(k  => normalized\.includes\(k\)\);/, "const hasSummary  = SUMMARY_KEYWORDS.some(k  => normalized.includes(k));\n  const hasIPO      = IPO_KEYWORDS.some(k      => normalized.includes(k));");
c = c.replace(/, hasSummary\]/, ", hasSummary, hasIPO]");
c = c.replace(/if \(hasBudget\)/, "if (hasIPO)     return createFallback('IPO');\n    if (hasBudget)");

c = c.replace(/const getLocalEntities = \(\) => {/g, `const getLocalEntities = () => {
    let ipoName = null;
    let queryType = null;
    if (hasIPO) {
      if (normalized.includes('open') || normalized.includes('current')) {
         queryType = 'open';
      }
      const match = normalized.match(/about\\s+(.+?)\\s+ipo/);
      if (match) ipoName = match[1];
    }`);
c = c.replace(/targetAmount: sipParams\.targetAmount \|\| null/g, `targetAmount: sipParams.targetAmount || null,
      ipoName,
      queryType`);

fs.writeFileSync(file, c);
