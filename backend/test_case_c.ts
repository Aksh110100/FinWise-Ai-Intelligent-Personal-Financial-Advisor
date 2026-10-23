import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_URL = 'http://localhost:5000/api';

async function run() {
  const email = 'test_report_user@example.com';
  const password = 'Password123!';

  // Clean up previous user
  await prisma.user.deleteMany({ where: { email } });

  // Register
  await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Test User', email, password })
  });
  
  // Login
  const loginRes = await (await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  })).json();
  console.log("LOGIN RES:", loginRes);
  const token = loginRes.accessToken;
  const authHeader = { Authorization: `Bearer ${token}` };

  // Fetch Report NO DATA
  const reportNoData = await (await fetch(`${API_URL}/reports/overview?period=This%20Month`, { headers: authHeader })).json();
  console.log('--- NO DATA REPORT ---');
  console.log(JSON.stringify(reportNoData, null, 2));

  // Add ONE Expense
  let categories = await prisma.category.findMany({ where: { userId: loginRes.user.id, type: 'EXPENSE' } });
  let categoryId = null;
  if (categories.length > 0) {
    categoryId = categories[0].id;
  } else {
    const catRes = await prisma.category.create({
      data: { name: 'Food', color: '#000000', icon: 'food', type: 'EXPENSE', userId: loginRes.user.id }
    });
    categoryId = catRes.id;
  }

  const expRes = await (await fetch(`${API_URL}/expenses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader },
    body: JSON.stringify({
      amount: 100,
      categoryId,
      merchant: 'Test',
      date: new Date().toISOString(),
      paymentMethod: 'CASH',
      note: 'Test expense'
    })
  })).json();
  console.log("EXPENSE CREATE RES:", expRes);

  // Fetch Report ONE EXPENSE
  const reportOneData = await (await fetch(`${API_URL}/reports/overview?period=This%20Month`, { headers: authHeader })).json();
  console.log('--- ONE EXPENSE REPORT ---');
  console.log(JSON.stringify(reportOneData, null, 2));

}

run().catch(console.error);
