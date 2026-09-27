import { z } from 'zod';

export const createBudgetSchema = z.object({
  categoryId: z.string().uuid("Invalid category ID").optional(),
  categoryName: z.string().optional(),
  name: z.string().optional(),
  amount: z.number().positive("Amount must be greater than zero"),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(2100),
  notes: z.string().optional(),
});

export const updateBudgetSchema = z.object({
  categoryId: z.string().uuid("Invalid category ID").optional(),
  categoryName: z.string().optional(),
  name: z.string().optional(),
  amount: z.number().positive("Amount must be greater than zero").optional(),
  month: z.number().int().min(1).max(12).optional(),
  year: z.number().int().min(2000).max(2100).optional(),
  notes: z.string().optional(),
});
