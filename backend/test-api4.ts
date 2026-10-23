import axios from 'axios';
import * as dotenv from 'dotenv';
dotenv.config();

async function test() {
  const key = process.env.IPOALERTS_API_KEY;
  if (!key) return;
  const url = 'https://api.ipoalerts.in/ipos';
  try {
      console.log('Testing GET limit=5...');
      const res = await axios.get(url, {
          params: { status: 'open', limit: 5, page: 1 },
          headers: { 'x-api-key': key }
      });
      console.log('HTTP Status:', res.status);
  } catch(e: any) {
      console.log('HTTP Status:', e.response?.status);
      console.log('failed:', e.response?.data || e.message);
  }
}
test();
