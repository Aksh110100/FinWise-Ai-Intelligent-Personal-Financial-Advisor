import { prisma } from '../config/prisma';
import { hashPassword, verifyPassword } from '../utils/password';
import { z } from 'zod';
import { registerSchema, loginSchema } from '../validators/auth.validators';

export class AuthService {
  static async register(data: z.infer<typeof registerSchema>) {
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new Error('Email already in use');
    }

    const passwordHash = await hashPassword(data.password);

    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash,
      },
    });

    return user;
  }

  static async login(data: z.infer<typeof loginSchema>) {
    const user = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!user || !user.isActive) {
      return null;
    }

    const isValid = await verifyPassword(data.password, user.passwordHash);
    if (!isValid) {
      return null;
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return user;
  }

  static async getUserById(id: string) {
    return prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        currency: true,
        timezone: true,
        isActive: true,
        createdAt: true,
      }
    });
  }
}
