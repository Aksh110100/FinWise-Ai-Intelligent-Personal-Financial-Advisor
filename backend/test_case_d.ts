import { PrismaClient } from '@prisma/client';
import { ReportsAnalyticsService } from './src/services/reports-analytics.service';

const prisma = new PrismaClient();

async function run() {
  const email = 'test_report_direct@example.com';

  // Clean up
  await prisma.user.deleteMany({ where: { email } });

  // Create User
  const user = await prisma.user.create({
    data: { name: 'Test Direct', email, passwordHash: 'hash' }
  });

  // NO DATA
  const reportNoData = await ReportsAnalyticsService.getOverviewSnapshot(user.id, 'This Month', 'Previous Month');
  console.log('--- NO DATA REPORT ---');
  console.log(JSON.stringify(reportNoData, null, 2));

  // Add ONE Expense
  const cat = await prisma.category.create({
    data: { name: 'Food', color: '#000000', icon: 'food', type: 'EXPENSE', userId: user.id }
  });

  await prisma.expense.create({
    data: {
      amount: 100,
      merchant: 'Test',
      categoryId: cat.id,
      date: new Date(),
      paymentMethod: 'CASH',
      notes: 'Test expense',
      userId: user.id
    }
  });

  // ONE EXPENSE
  const reportOneData = await ReportsAnalyticsService.getOverviewSnapshot(user.id, 'This Month', 'Previous Month');
  console.log('--- ONE EXPENSE REPORT ---');
  console.log(JSON.stringify(reportOneData, null, 2));
}

run().catch(console.error);
