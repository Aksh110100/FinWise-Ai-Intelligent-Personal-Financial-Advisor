import { z } from 'zod';
import { PaymentMethod } from '@prisma/client';

export const createExpenseSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  categoryId: z.string().optional(),
  categoryName: z.string().optional(), // We allow category string directly for fallback
  merchant: z.string().optional(),
  description: z.string().optional(),
  date: z.string().or(z.date()).transform((val) => new Date(val)),
  paymentMethod: z.nativeEnum(PaymentMethod).optional(),
  notes: z.string().optional(),
});

export const updateExpenseSchema = createExpenseSchema.partial();

export const expenseQuerySchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).default('1'),
  limit: z.string().regex(/^\d+$/).transform(Number).default('20'),
  search: z.string().optional(),
  categoryId: z.string().optional(),
  categoryName: z.string().optional(),
  paymentMethod: z.nativeEnum(PaymentMethod).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  sortBy: z.enum(['date', 'amount', 'createdAt', 'merchant']).default('date'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const summaryQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
});
