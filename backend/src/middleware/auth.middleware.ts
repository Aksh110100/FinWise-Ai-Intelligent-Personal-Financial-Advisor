import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/tokens';

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Unauthorized: No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = verifyAccessToken(token);
    (req as any).user = {
      id: payload.userId,
      sessionId: payload.sessionId,
    };
    
    // Asynchronously update activity, throttled to 60 seconds
    const { prisma } = require('../config/prisma');
    prisma.session.updateMany({
      where: {
        id: payload.sessionId,
        lastActivityAt: {
          lt: new Date(Date.now() - 60000) // Only update if older than 1 minute
        }
      },
      data: {
        lastActivityAt: new Date()
      }
    }).catch(() => {});

    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Unauthorized: Invalid token' });
  }
};
