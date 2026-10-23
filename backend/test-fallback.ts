import { GeminiProvider } from './src/modules/ai-advisor/providers/gemini.provider';
import * as dotenv from 'dotenv';
dotenv.config();

async function testFallback() {
  const provider = new GeminiProvider();
  
  try {
    let aiResponseText;
    let messageToGemini = "Give me current and upcoming Indian IPOs.";
    try {
      console.log('Trying with search...');
      aiResponseText = await provider.generateContent(messageToGemini, [], true);
    } catch (err: any) {
      console.log('Search failed:', err.message);
      if (err.message.includes('GEMINI_QUOTA_EXCEEDED')) {
        console.log('Retrying without search...');
        aiResponseText = await provider.generateContent(messageToGemini, [], false);
      } else {
        throw err;
      }
    }
    console.log('Success:', aiResponseText);
  } catch (err: any) {
    console.log('Final Error:', err.message);
  }
}
testFallback();
