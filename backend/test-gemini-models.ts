import { GoogleGenerativeAI } from '@google/generative-ai';
import * as dotenv from 'dotenv';
dotenv.config();

async function test() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return;
  const genAI = new GoogleGenerativeAI(apiKey);
  
  const testModel = async (modelName: string, tools: any) => {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        tools: tools,
      });
      console.log(`\nTesting ${modelName} with tools: ${JSON.stringify(tools)}`);
      const result = await model.generateContent('What is the current price of gold?');
      console.log('Success!');
    } catch (err: any) {
      console.log('Error:', err.status, err.message);
    }
  };

  await testModel('gemini-1.5-flash', [{ googleSearch: {} }]);
  await testModel('gemini-1.5-pro', [{ googleSearch: {} }]);
  await testModel('gemini-3.5-flash-lite', [{ googleSearch: {} }]);
}
test();
