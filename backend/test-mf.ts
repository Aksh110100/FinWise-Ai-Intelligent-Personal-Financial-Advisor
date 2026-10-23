import { detectIntent, executeTools } from './src/modules/ai-advisor/tools';
import { MutualFundService } from './src/modules/mutual-funds/mutual-fund.service';

async function test() {
  try {
     console.log('Testing category search...');
     const cats = await MutualFundService.getMutualFundCategories();
     console.log('Categories count:', cats.results.length);

     console.log('\nTesting fund search...');
     const funds = await MutualFundService.searchFunds('HDFC Top 100');
     console.log('Found funds:', funds.results.length, funds.results[0]?.scheme_name);

     console.log('\nTesting detectIntent...');
     const intent = await detectIntent('What is the latest NAV of HDFC Top 100?');
     console.log('Intent:', intent.intent);
     console.log('Entities:', intent.entities);

     console.log('\nTesting executeTools...');
     const res = await executeTools('test-user-id', 'What is the latest NAV of HDFC Top 100?', intent);
     console.log(JSON.stringify(res, null, 2));

  } catch (err) {
     console.error('Test failed:', err);
  }
}

test();
