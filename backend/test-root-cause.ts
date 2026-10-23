import { GoogleGenerativeAI } from '@google/generative-ai';
import * as dotenv from 'dotenv';
dotenv.config();

async function testGemini() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('No API key');
    return;
  }
  const genAI = new GoogleGenerativeAI(apiKey);
  const modelName = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
  console.log('GEMINI MODEL:', modelName);

  // TEST A: Normal Gemini request
  console.log('\n--- TEST A: Normal Gemini request ---');
  try {
    const modelA = genAI.getGenerativeModel({ model: modelName });
    const resultA = await modelA.generateContent('Explain what an IPO is in India.');
    const responseA = await resultA.response;
    console.log('STATUS: PASS');
    console.log('TEXT:', responseA.text().substring(0, 100) + '...');
  } catch (err: any) {
    console.log('STATUS: FAIL');
    console.log('HTTP STATUS:', err.status);
    console.log('ERROR NAME:', err.name);
    console.log('ERROR MESSAGE:', err.message);
  }

  // TEST B: Gemini request WITH Google Search
  console.log('\n--- TEST B: Gemini request WITH Google Search ---');
  try {
    const modelB = genAI.getGenerativeModel({ 
      model: modelName,
      tools: [{ googleSearch: {} } as any] 
    });
    const resultB = await modelB.generateContent('Find current and upcoming Indian IPOs and provide their sources.');
    const responseB = await resultB.response;
    console.log('STATUS: PASS');
    console.log('TEXT:', responseB.text().substring(0, 100) + '...');
    console.log('GROUNDING METADATA:', JSON.stringify(responseB.candidates?.[0]?.groundingMetadata));
  } catch (err: any) {
    console.log('STATUS: FAIL');
    console.log('HTTP STATUS:', err.status);
    console.log('ERROR NAME:', err.name);
    console.log('ERROR MESSAGE:', err.message);
  }
}

testGemini();
