import { AIAdvisorService } from './src/modules/ai-advisor/ai-advisor.service';
import * as dotenv from 'dotenv';
dotenv.config();

async function run() {
  const service = new AIAdvisorService();
  try {
    const res = await service.processChat('test-user-id', { message: 'do you have my financial data' });
    console.log(res);
  } catch (e: any) {
    console.error('ERROR in processChat:', e.message);
    if (e.response) {
       console.error('Data:', e.response.data);
    }
  }
}
run();
