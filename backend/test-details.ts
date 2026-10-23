import axios from 'axios';
import * as dotenv from 'dotenv';
dotenv.config();

async function test() {
  const key = process.env.IPOALERTS_API_KEY;
  try {
      const id = "1175374430"; // Green Asia Impex Limited
      const res = await axios.get(`https://api.ipoalerts.in/ipos/${id}`, {
          headers: { 'x-api-key': key }
      });
      console.log('details:', res.data);
  } catch(e: any) {
      console.log('failed:', e.response?.data?.detail || e.message);
  }
}
test();
