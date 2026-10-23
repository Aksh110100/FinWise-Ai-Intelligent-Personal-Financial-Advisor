import { detectIntent, executeTools } from './src/modules/ai-advisor/tools';
import * as dotenv from 'dotenv';
dotenv.config();

async function test() {
  const queries = [
    "What IPOs are currently open?",
    "Give me a list of all current IPOs.",
    "Tell me about the current IPOs.",
    "Compare the open IPOs.",
    "Which IPO has the lowest price band?",
    "Which IPO has the largest issue size?",
    "Tell me about Green Asia Impex Limited."
  ];

  for (const q of queries) {
    console.log(`\n--- QUERY: ${q} ---`);
    const intent = await detectIntent(q);
    console.log("Intent:", intent);
    const result = await executeTools('test-user', q, intent);
    if (result.ipo) {
      console.log("IPO count:", result.ipo.data?.count || (result.ipo.data?.ipo ? 1 : 0));
    } else {
      console.log("No IPO result.");
    }
  }
}

test();
