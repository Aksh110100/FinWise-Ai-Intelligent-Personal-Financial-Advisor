import axios from 'axios';
import * as dotenv from 'dotenv';
dotenv.config();

async function test() {
  const key = process.env.IPOALERTS_API_KEY;
  try {
      const res = await axios.get('https://api.ipoalerts.in/ipos', {
          params: { status: 'open', q: 'asia', limit: 1 },
          headers: { 'x-api-key': key }
      });
      console.log('q=asia', res.data.meta?.count);
      console.log('item', res.data.ipos[0]?.name);
  } catch(e: any) {
      console.log('failed:', e.response?.data?.detail || e.message);
  }
}
test();
