import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  console.log('Testing investments backend...');
  const user = await prisma.user.findFirst();
  if (!user) {
    console.log('No user found');
    return;
  }
  console.log(`Using user ${user.id}`);
  
  // 1. Create an investment
  const inv = await prisma.investment.create({
    data: {
      userId: user.id,
      name: 'Test Apple Stock',
      type: 'STOCK',
      investedAmount: 10000,
      currentValue: 12000,
      quantity: 10,
      purchasePrice: 1000,
      currentPrice: 1200
    }
  });
  console.log('Created:', inv.name);

  // 2. Summary
  const { investmentService } = await import('./src/services/investment.service');
  const summary = await investmentService.getSummary(user.id);
  console.log('Summary:', summary);

  // 3. Allocation
  const alloc = await investmentService.getAllocation(user.id);
  console.log('Allocation:', alloc);

  // 4. Clean up
  await prisma.investment.delete({ where: { id: inv.id } });
  console.log('Done!');
}
run();
