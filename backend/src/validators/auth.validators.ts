import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().min(1, 'Name is required').trim(),
  email: z.string().email('Invalid email address').transform(str => str.toLowerCase()),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address').transform(str => str.toLowerCase()),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional().default(false),
});
