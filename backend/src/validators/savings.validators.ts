import { z } from 'zod';
import { SavingType, SavingSource } from '@prisma/client';

export const createSavingSchema = z.object({
  amount: z.number().positive(),
  name: z.string().min(1),
  type: z.nativeEnum(SavingType),
  source: z.nativeEnum(SavingSource),
  date: z.string().min(1),
  note: z.string().optional(),
  goalId: z.string().optional(),
  targetAmount: z.number().optional(),
  targetDate: z.string().nullable().optional(),
});

export const updateSavingSchema = createSavingSchema.partial();

export const savingsQuerySchema = z.object({
  page: z.coerce.number().optional().default(1),
  limit: z.coerce.number().optional().default(50),
  search: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  month: z.coerce.number().optional(),
  year: z.coerce.number().optional(),
  type: z.nativeEnum(SavingType).optional(),
  sortBy: z.string().optional().default('date'),
  sortOrder: z.string().optional().default('desc'),
});

export type CreateSavingInput = z.infer<typeof createSavingSchema>;
export type UpdateSavingInput = z.infer<typeof updateSavingSchema>;
export type SavingsQuery = z.infer<typeof savingsQuerySchema>;
