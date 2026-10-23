import { detectIntent, executeTools } from './src/modules/ai-advisor/tools';
import * as dotenv from 'dotenv';
dotenv.config();

async function test() {
  const intent = await detectIntent("Tell me September expenses.");
  console.log("Intent:", intent);
  const result = await executeTools('test-user', "Tell me September expenses.", intent);
  console.log("Result:", result.expense_analysis);
}
test();
