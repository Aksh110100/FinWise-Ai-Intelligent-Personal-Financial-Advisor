import { GoogleGenerativeAI } from '@google/generative-ai';
import * as dotenv from 'dotenv';
dotenv.config();

async function test() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return;
  const genAI = new GoogleGenerativeAI(apiKey);
  
  const testSyntax = async (tools: any, desc: string) => {
    try {
      const model = genAI.getGenerativeModel({
        model: 'gemini-3.5-flash-lite',
        tools: tools,
      });
      console.log(`\nTesting ${desc}`);
      const result = await model.generateContent('What is the current price of gold?');
      console.log('Success!');
    } catch (err: any) {
      console.log('Error:', err.status, err.message);
    }
  };

  await testSyntax([{ googleSearchRetrieval: {} }], 'googleSearchRetrieval: {}');
  await testSyntax([{ googleSearchRetrieval: { dynamicRetrievalConfig: { dynamicThreshold: 0.3 } } }], 'googleSearchRetrieval with config');
}
test();
