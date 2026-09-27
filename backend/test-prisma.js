const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  try {
    const user = await prisma.user.findFirst();
    const exp = await prisma.expense.create({
      data: {
        userId: user.id,
        amount: 1500,
        merchant: 'Housing',
        description: 'Electricity bill',
        date: new Date('2026-09-20'),
        paymentMethod: 'UPI',
        currency: 'INR',
        source: 'MANUAL'
      }
    });
    console.log('Success:', exp);
  } catch(e) {
    console.error('Error:', e);
  }
}
main();
