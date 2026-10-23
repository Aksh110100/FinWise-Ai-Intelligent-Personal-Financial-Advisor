import { detectIntent } from './src/modules/ai-advisor/tools';
import * as dotenv from 'dotenv';
dotenv.config();

async function test() {
  const q = "Tell me about Green Asia Impex Limited.";
  const intent = await detectIntent(q);
  console.log("Intent:", intent);
}

test();
