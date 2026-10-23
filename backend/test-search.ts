import axios from 'axios';

async function testSearch(q: string) {
  try {
    const res = await axios.get(`https://mfnav.in/api/funds/search`, {
      params: { q, page: 1, page_size: 5 }
    });
    console.log(`Search "${q}" -> total: ${res.data.total}`);
    if (res.data.total > 0) {
      console.log('Top match:', res.data.results[0].scheme_name);
    }
  } catch (err: any) {
    console.error(`Search "${q}" -> ERROR:`, err.message);
  }
}

async function run() {
  await testSearch('HDFC Top 100');
  await testSearch('HDFC Top 100 Fund');
  await testSearch('HDFC Top 100 Equity');
  await testSearch('HDFC Top 200');
  await testSearch('DSP Top 100');
}
run();
