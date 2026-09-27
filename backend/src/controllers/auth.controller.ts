import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { SessionService } from '../services/session.service';
import { registerSchema, loginSchema } from '../validators/auth.validators';
import { sendSuccess, sendError } from '../utils/response';
import { generateAccessToken } from '../utils/tokens';

const REFRESH_COOKIE_NAME = 'finwise_refresh';

export class AuthController {
  static async register(req: Request, res: Response) {
    try {
      const parsed = registerSchema.parse(req.body);
      const user = await AuthService.register(parsed);

      const { session, rawRefreshToken } = await SessionService.createSession(
        user.id,
        false, // By default register doesn't remember
        req.headers['user-agent'],
        req.ip
      );

      const accessToken = generateAccessToken({ userId: user.id, sessionId: session.id });

      res.cookie(REFRESH_COOKIE_NAME, rawRefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      return sendSuccess(res, {
        accessToken,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          currency: user.currency,
          timezone: user.timezone,
        },
      }, 'Registration successful', 201);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return sendError(res, 'Validation failed', 400, error.errors);
      }
      return sendError(res, error.message || 'Registration failed', 400);
    }
  }

  static async login(req: Request, res: Response) {
    try {
      const parsed = loginSchema.parse(req.body);
      const user = await AuthService.login(parsed);

      if (!user) {
        return sendError(res, 'Invalid email or password', 401);
      }

      const { session, rawRefreshToken } = await SessionService.createSession(
        user.id,
        parsed.rememberMe,
        req.headers['user-agent'],
        req.ip
      );

      const accessToken = generateAccessToken({ userId: user.id, sessionId: session.id });

      res.cookie(REFRESH_COOKIE_NAME, rawRefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: parsed.rememberMe ? 7 * 24 * 60 * 60 * 1000 : undefined, // Session cookie if false
      });

      return sendSuccess(res, {
        accessToken,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          currency: user.currency,
          timezone: user.timezone,
        },
      }, 'Login successful');
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return sendError(res, 'Validation failed', 400, error.errors);
      }
      return sendError(res, 'Login failed', 400);
    }
  }

  static async refresh(req: Request, res: Response) {
    try {
      const rawToken = req.cookies[REFRESH_COOKIE_NAME];
      if (!rawToken) {
        return sendError(res, 'No refresh token provided', 401);
      }

      // To validate, we need sessionId which we don't store in the cookie directly.
      // We can either find session by hashing token, or we can put sessionId in the cookie.
      // Assuming we hash it and find the session:
      const { hashRefreshToken } = require('../utils/tokens');
      const hash = hashRefreshToken(rawToken);
      
      const { prisma } = require('../config/prisma');
      const session = await prisma.session.findFirst({
        where: { refreshTokenHash: hash, revokedAt: null }
      });

      if (!session || new Date() > session.expiresAt || session.revokedAt) {
        res.clearCookie(REFRESH_COOKIE_NAME);
        return sendError(res, 'Invalid or expired refresh token', 401);
      }

      // Check for 2-minute grace period if rememberMe is false
      if (!session.rememberMe) {
        const twoMinutes = 2 * 60 * 1000;
        const now = Date.now();
        const lastActivity = session.lastActivityAt ? session.lastActivityAt.getTime() : session.createdAt.getTime();
        
        if (now - lastActivity > twoMinutes) {
          // Grace period exceeded after browser close or inactivity
          await prisma.session.update({
            where: { id: session.id },
            data: { revokedAt: new Date() }
          });
          res.clearCookie(REFRESH_COOKIE_NAME);
          return sendError(res, 'Session expired due to inactivity or browser close', 401);
        }
      }

      // Update activity
      await prisma.session.update({
        where: { id: session.id },
        data: { lastActivityAt: new Date() }
      });

      const user = await AuthService.getUserById(session.userId);
      if (!user || !user.isActive) {
        return sendError(res, 'User inactive or not found', 401);
      }

      const accessToken = generateAccessToken({ userId: user.id, sessionId: session.id });

      return sendSuccess(res, {
        accessToken,
        user
      }, 'Token refreshed');
    } catch (error) {
      return sendError(res, 'Refresh failed', 401);
    }
  }

  static async logout(req: Request, res: Response) {
    try {
      const sessionId = (req as any).user?.sessionId;
      if (sessionId) {
        await SessionService.revokeSession(sessionId);
      }
      res.clearCookie(REFRESH_COOKIE_NAME);
      return sendSuccess(res, {}, 'Logged out successfully');
    } catch (error) {
      return sendError(res, 'Logout failed', 500);
    }
  }

  static async logoutAll(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      if (userId) {
        await SessionService.revokeAllUserSessions(userId);
      }
      res.clearCookie(REFRESH_COOKIE_NAME);
      return sendSuccess(res, {}, 'Logged out from all devices');
    } catch (error) {
      return sendError(res, 'Logout all failed', 500);
    }
  }

  static async me(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const user = await AuthService.getUserById(userId);
      if (!user) {
        return sendError(res, 'User not found', 404);
      }
      return sendSuccess(res, { user });
    } catch (error) {
      return sendError(res, 'Failed to get user', 500);
    }
  }
}
