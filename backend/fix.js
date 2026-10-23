const fs = require('fs');

// 1. ipo.types.ts
let types = fs.readFileSync('src/modules/ipos/ipo.types.ts', 'utf8');
types = types.replace(/name: string;/, "slug: string;\n  name: string;");
fs.writeFileSync('src/modules/ipos/ipo.types.ts', types);

// 2. ipo.tool.ts
let ipoTool = fs.readFileSync('src/modules/ai-advisor/tools/ipo.tool.ts', 'utf8');
ipoTool = ipoTool.replace(/import \{ IPOService \} from '\.\.\/ipos\/ipo\.service';/, "import { IPOService } from '../../ipos/ipo.service';");
ipoTool = ipoTool.replace(/import \{ ToolResult, toolError, toolNoData, toolSuccess \} from '\.\/index';/, "import { ToolResult, toolError, toolNoData, toolSuccess } from './tool.types';");
ipoTool = ipoTool.replace(/ipos\.map\(ipo => \(\{/, "ipos.map((ipo: any) => ({");
ipoTool = ipoTool.replace(/matches\.map\(m => m\.name\)/, "matches.map((m: any) => m.name)");
fs.writeFileSync('src/modules/ai-advisor/tools/ipo.tool.ts', ipoTool);

// 3. tools/index.ts
let idx = fs.readFileSync('src/modules/ai-advisor/tools/index.ts', 'utf8');
if (!idx.includes('const IPO_KEYWORDS =')) {
    idx = idx.replace(/const SUMMARY_KEYWORDS = .*;/g, "const SUMMARY_KEYWORDS = ['summary', 'overview', 'financial status', 'net worth'];\nconst IPO_KEYWORDS = ['ipo', 'initial public offering', 'open ipos', 'upcoming ipos'];");
}
idx = idx.replace(/let queryType = null;/, "let queryType: any = null;");
idx = idx.replace(/let ipoName = null;/, "let ipoName: string | null = null;");
idx = idx.replace(/const hasIPO      = IPO_KEYWORDS\.some\(k      => normalized\.includes\(k\)\);/, "const hasIPO      = IPO_KEYWORDS.some((k: string) => normalized.includes(k));");

fs.writeFileSync('src/modules/ai-advisor/tools/index.ts', idx);
