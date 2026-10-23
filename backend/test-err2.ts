import { GoogleGenerativeAI } from '@google/generative-ai';

async function run() {
  const genAI = new GoogleGenerativeAI('invalid-key');
  const model = genAI.getGenerativeModel({ model: 'gemini-3.6-flash' });
  try {
    const chat = model.startChat();
    await chat.sendMessage('Hello');
  } catch (err: any) {
    const status = err.status || err.statusCode || 'unknown';
    console.log('err.status type:', typeof err.status);
    console.log('err.status:', err.status);
    console.log('Status resolved as:', status);
    console.log('Is status === 400?', status === 400);
    console.log('Is status === "400"?', status === "400");
  }
}
run();
