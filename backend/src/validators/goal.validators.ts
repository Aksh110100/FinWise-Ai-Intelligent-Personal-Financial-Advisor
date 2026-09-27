import { z } from 'zod';
import { GoalStatus } from '@prisma/client';

export const createGoalSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(255),
  description: z.string().trim().max(1000).optional().nullable(),
  targetAmount: z.number().positive('Target amount must be positive'),
  targetDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid date format',
  }).optional().nullable(),
  category: z.string().optional().nullable(),
});

export const updateGoalSchema = createGoalSchema.partial().extend({
  status: z.nativeEnum(GoalStatus).optional(),
});

export type CreateGoalInput = z.infer<typeof createGoalSchema>;
export type UpdateGoalInput = z.infer<typeof updateGoalSchema>;
