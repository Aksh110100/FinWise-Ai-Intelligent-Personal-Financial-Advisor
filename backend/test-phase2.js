require('dotenv').config();
const { PrismaClient } = require('./node_modules/@prisma/client');
const jwt = require('./node_modules/jsonwebtoken');
const prisma = new PrismaClient();

const BASE = 'http://localhost:5000/api';

async function run() {
  const user = await prisma.user.findFirst();
  if (!user) { console.error('No user found'); return; }
  console.log(`Testing with user: ${user.email} (${user.id})\n`);

  // Create session token
  const session = await prisma.session.create({
    data: { userId: user.id, refreshTokenHash: 'phase2_test', expiresAt: new Date(Date.now() + 600000) }
  });
  const token = jwt.sign(
    { userId: user.id, sessionId: session.id },
    'dev_access_secret_do_not_use_in_prod',
    { expiresIn: '15m' }
  );

  const headers = { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' };
  let convId = null;

  async function ask(label, message, useConvId = true) {
    console.log(`\n━━━ ${label} ━━━`);
    console.log(`Q: "${message}"`);
    const start = Date.now();
    try {
      const body = { message };
      if (useConvId && convId) body.conversationId = convId;
      const r = await fetch(`${BASE}/ai/chat`, {
        method: 'POST', headers, body: JSON.stringify(body)
      });
      const d = await r.json();
      const elapsed = Date.now() - start;
      if (d.success) {
        if (!convId && d.data?.conversation?.id) convId = d.data.conversation.id;
        console.log(`✅ ${elapsed}ms`);
        const reply = d.data?.assistantMessage?.content || '';
        console.log(`A: ${reply.substring(0, 300)}${reply.length > 300 ? '...' : ''}`);
      } else {
        console.log(`❌ ${elapsed}ms — ${d.message}`);
      }
    } catch (err) {
      console.log(`❌ FETCH ERROR: ${err.message}`);
    }
  }

  // TEST 1: General question — no tool needed
  await ask('TEST 1: General', 'What is SIP?', false);

  // TEST 2: Financial summary check
  await ask('TEST 2: Has my data?', 'Do you have my financial data?');

  // TEST 3: Current month expenses
  await ask('TEST 3: This month spending', 'How much did I spend this month?');

  // TEST 4: Top spending category
  await ask('TEST 4: Top category', 'Where am I spending the most?');

  // TEST 5: Savings total
  await ask('TEST 5: Savings', 'How much am I saving?');

  // TEST 6: Savings rate
  await ask('TEST 6: Savings rate', 'What is my savings rate?');

  // TEST 7: Goal analysis
  await ask('TEST 7: Goals', 'How are my goals doing?');

  // TEST 8: Budget analysis
  await ask('TEST 8: Budget', 'How much of my budget is left this month?');

  // TEST 9: Over budget?
  await ask('TEST 9: Over budget', 'Am I over budget?');

  // TEST 10: SIP calculator
  await ask('TEST 10: SIP calc', 'If I invest ₹10,000 monthly for 5 years at 12%, what could it become?');

  // TEST 11: Affordability check
  await ask('TEST 11: Can I invest', 'Can I invest ₹15,000 every month given my current finances?');

  // TEST 12: Previous month
  await ask('TEST 12: Last month spend', 'How much did I spend last month?');

  console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('PHASE 2 TEST COMPLETE');
  console.log(`Conversation ID: ${convId}`);

  await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
  await prisma.$disconnect();
}

run().catch(e => { console.error(e); process.exit(1); });
