const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const exps = await prisma.expense.findMany({ select: { merchant: true, amount: true, type: false }});
  console.log('DB Expenses:', exps);
}
main();
