import { GeminiProvider } from './src/modules/ai-advisor/providers/gemini.provider';
import * as dotenv from 'dotenv';
dotenv.config();

async function test() {
  const provider = new GeminiProvider();
  try {
    const text = await provider.generateContent('test search query', [], true);
    console.log('Success:', text);
  } catch (err: any) {
    console.log('Error thrown:', err.message);
  }
}
test();
