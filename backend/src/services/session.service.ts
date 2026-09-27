import { prisma } from '../config/prisma';
import { generateRefreshToken, hashRefreshToken } from '../utils/tokens';

export class SessionService {
  static async createSession(userId: string, rememberMe: boolean, userAgent?: string, ipAddress?: string) {
    const rawRefreshToken = generateRefreshToken();
    const refreshTokenHash = hashRefreshToken(rawRefreshToken);

    const expiresInDays = rememberMe ? 7 : 1;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    const session = await prisma.session.create({
      data: {
        userId,
        refreshTokenHash,
        rememberMe,
        expiresAt,
        userAgent,
        ipAddress,
      },
    });

    return { session, rawRefreshToken };
  }

  static async revokeSession(sessionId: string) {
    await prisma.session.update({
      where: { id: sessionId },
      data: { revokedAt: new Date() },
    });
  }

  static async revokeAllUserSessions(userId: string) {
    await prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  static async validateSession(sessionId: string, rawToken: string) {
    const session = await prisma.session.findUnique({ where: { id: sessionId } });

    if (!session || session.revokedAt || new Date() > session.expiresAt) {
      return null;
    }

    const hash = hashRefreshToken(rawToken);
    if (session.refreshTokenHash !== hash) {
      return null;
    }

    // Update last activity
    await prisma.session.update({
      where: { id: session.id },
      data: { lastActivityAt: new Date() },
    });

    return session;
  }
}
