import { prisma } from '../config/prisma';
import { Prisma } from '@prisma/client';
import { CreateGoalInput, UpdateGoalInput } from '../validators/goal.validators';

function parseDateOnly(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
}

function serializeGoal(g: any, savedAmount: number) {
  const targetAmount = Number(g.targetAmount);
  const remainingAmount = Math.max(targetAmount - savedAmount, 0);
  const progress = targetAmount > 0 ? (savedAmount / targetAmount) * 100 : 0;

  return {
    ...g,
    targetAmount,
    currentAmount: Number(g.currentAmount),
    savedAmount,
    remainingAmount,
    progress: Math.min(progress, 100), // Cap at 100% for UI purposes
  };
}

export class GoalService {
  static async createGoal(userId: string, input: CreateGoalInput) {
    const data: Prisma.GoalCreateInput = {
      User: { connect: { id: userId } },
      name: input.name,
      targetAmount: new Prisma.Decimal(input.targetAmount),
      description: input.description ?? null,
      category: input.category ?? null,
    };

    if (input.targetDate) {
      data.targetDate = parseDateOnly(input.targetDate);
    }

    const goal = await prisma.goal.create({ data });
    return serializeGoal(goal, 0);
  }

  static async getGoals(userId: string) {
    const goals = await prisma.goal.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        Savings: {
          select: { amount: true },
        },
      },
    });

    return goals.map((g) => {
      const savedAmount = g.Savings.reduce((sum, s) => sum + Number(s.amount), 0);
      const { Savings, ...goalWithoutSavings } = g;
      return serializeGoal(goalWithoutSavings, savedAmount);
    });
  }

  static async getGoalById(userId: string, id: string) {
    const goal = await prisma.goal.findFirst({
      where: { id, userId },
      include: {
        Savings: {
          select: { amount: true },
        },
      },
    });

    if (!goal) throw new Error('Not found');

    const savedAmount = goal.Savings.reduce((sum, s) => sum + Number(s.amount), 0);
    const { Savings, ...goalWithoutSavings } = goal;
    return serializeGoal(goalWithoutSavings, savedAmount);
  }

  static async updateGoal(userId: string, id: string, input: UpdateGoalInput) {
    const existing = await prisma.goal.findFirst({ where: { id, userId } });
    if (!existing) throw new Error('Not found');

    const data: Prisma.GoalUpdateInput = {};

    if (input.name !== undefined) data.name = input.name;
    if (input.description !== undefined) data.description = input.description;
    if (input.category !== undefined) data.category = input.category;
    if (input.status !== undefined) data.status = input.status;

    if (input.targetAmount !== undefined)
      data.targetAmount = new Prisma.Decimal(input.targetAmount);

    if (input.targetDate !== undefined)
      data.targetDate = input.targetDate != null ? parseDateOnly(input.targetDate) : null;

    const updated = await prisma.goal.update({ where: { id }, data });
    
    // Fetch savings to compute saved amount
    const savingsAgg = await prisma.saving.aggregate({
      where: { goalId: id, userId },
      _sum: { amount: true },
    });
    
    return serializeGoal(updated, Number(savingsAgg._sum.amount ?? 0));
  }

  static async deleteGoal(userId: string, id: string) {
    const existing = await prisma.goal.findFirst({ where: { id, userId } });
    if (!existing) throw new Error('Not found');
    
    // Savings relation is set to SetNull on delete in Prisma
    await prisma.goal.delete({ where: { id } });
  }
}
