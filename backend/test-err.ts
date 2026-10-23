import { GoogleGenerativeAI } from '@google/generative-ai';
import * as dotenv from 'dotenv';
dotenv.config();

async function run() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({ model: 'gemini-3.6-flash' });
  try {
    const chat = model.startChat();
    const result = await chat.sendMessage('Hello');
    console.log(await result.response.text());
  } catch (err: any) {
    const status = err.status || err.statusCode || 'unknown';
    console.log('err.status type:', typeof err.status);
    console.log('err.status:', err.status);
    console.log('err.statusCode type:', typeof err.statusCode);
    console.log('Status resolved as:', status);
    console.log('Is status === 503?', status === 503);
    console.log('Is status === "503"?', status === "503");
  }
}
run();
