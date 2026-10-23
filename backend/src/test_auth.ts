import { prisma } from './config/prisma';
import { AuthController } from './controllers/auth.controller';
import { requireAuth } from './middleware/auth.middleware';

async function run() {
  console.log("Checking session updating");
  
  const user = await prisma.user.findFirst();
  if(!user) return;
  
  const session = await prisma.session.create({
    data: {
      userId: user.id,
      refreshTokenHash: "testhash",
      rememberMe: false,
      expiresAt: new Date(Date.now() + 1000000),
      lastActivityAt: new Date(Date.now() - 120000) // 2 mins ago
    }
  });
  
  console.log("Session created:", session.id, session.lastActivityAt);
  
  // mock req, res, next
  const req: any = { headers: { authorization: 'Bearer test' } };
  const res: any = { status: (c:any)=>({ json: (j:any)=>console.log(c,j) }) };
  const next = () => console.log("Next called");
  
  // mock verifyAccessToken
  const tokenUtils = require('./utils/tokens');
  tokenUtils.verifyAccessToken = () => ({ userId: user.id, sessionId: session.id });
  
  requireAuth(req, res, next);
  
  // Wait a bit for async update
  await new Promise(r => setTimeout(r, 1000));
  
  const updated = await prisma.session.findUnique({ where: { id: session.id } });
  console.log("Updated lastActivityAt:", updated?.lastActivityAt);
}
run().catch(console.error).finally(() => prisma.$disconnect());
