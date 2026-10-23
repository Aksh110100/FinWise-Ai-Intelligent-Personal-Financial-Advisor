const fs = require('fs');
const file = 'src/modules/ai-advisor/ai-advisor.service.ts';
let c = fs.readFileSync(file, 'utf8');

if (!c.includes('case \'ipo\':')) {
    c = c.replace(/case 'mutual_fund':/g, `case 'ipo':
        if (data.ipos) {
          lines.push(\`\\n[IPO Open List - \${data.count} IPOs]\`);
          lines.push(\`DISCLAIMER: \${result.data.message}\`);
          data.ipos.forEach((ipo: any) => {
            lines.push(\`\\n- \${ipo.name} (\${ipo.symbol})\`);
            lines.push(\`  Type: \${ipo.type}\`);
            lines.push(\`  Price Range: \${ipo.priceRange}\`);
            lines.push(\`  Issue Size: \${ipo.issueSize}\`);
            lines.push(\`  Dates: \${ipo.startDate} to \${ipo.endDate}\`);
          });
        } else if (data.ipo) {
          const ipo = data.ipo;
          lines.push(\`\\n[IPO Details: \${ipo.name}]\`);
          lines.push(\`DISCLAIMER: \${result.data.disclaimer}\`);
          lines.push(\`Symbol: \${ipo.symbol} | Type: \${ipo.type} | Status: \${ipo.status}\`);
          lines.push(\`Price Range: \${ipo.priceRange} | Min Qty: \${ipo.minQty} | Min Amt: \${ipo.minAmount}\`);
          lines.push(\`Issue Size: \${ipo.issueSize}\`);
          lines.push(\`Dates: \${ipo.startDate} to \${ipo.endDate} (Listing: \${ipo.listingDate})\`);
          if (ipo.about) lines.push(\`About: \${ipo.about}\`);
          if (ipo.schedule?.length) {
            lines.push('Schedule:');
            ipo.schedule.forEach((s: any) => lines.push(\`  - \${s.event}: \${s.date}\`));
          }
        } else if (data.options) {
          lines.push(\`\\n[IPO Search]\`);
          lines.push(result.data.message);
          data.options.forEach((opt: string) => lines.push(\` - \${opt}\`));
        }
        break;

      case 'mutual_fund':`);
}
fs.writeFileSync(file, c);
