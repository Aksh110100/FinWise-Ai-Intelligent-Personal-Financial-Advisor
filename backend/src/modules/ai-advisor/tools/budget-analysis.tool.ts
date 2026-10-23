import { prisma } from '../../../config/prisma';
import { toolSuccess, toolError, toolNoData, ToolResult } from './tool.types';
import { getMonthBounds } from './date.utils';

/**
 * budget-analysis.tool.ts
 *
 * Analyses budget vs actual spending for the authenticated user.
 * Reuses the exact month-boundary logic from BudgetService.calculateBudgetSpending
 * to ensure consistency with what the user sees in the Budget module.
 */

export interface BudgetItem {
  name: string;
  categoryName: string | null;
  budgetAmount: number;
  spent: number;
  remaining: number;
  percentageUsed: number;
  status: 'UNDER_BUDGET' | 'NEAR_LIMIT' | 'OVER_BUDGET';
}

export interface BudgetAnalysisData {
  month: number;
  year: number;
  periodLabel: string;
  totalBudget: number;
  totalSpent: number;
  totalRemaining: number;
  overallUtilization: number;
  activeBudgetCount: number;
  overBudgetCount: number;
  nearLimitCount: number;
  budgets: BudgetItem[];
  currency: string;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export async function getBudgetAnalysis(
  userId: string,
  options: {
    month?: number;
    year?: number;
    categoryName?: string;
  } = {}
): Promise<ToolResult<BudgetAnalysisData | null>> {
  try {
    const now   = new Date();
    const month = options.month ?? (now.getMonth() + 1);
    const year  = options.year  ?? now.getFullYear();

    // Exact half-open interval matching BudgetService.calculateBudgetSpending
    const { start: monthStart, end: monthEnd } = getMonthBounds(month, year);

    const where: any = { userId, month, year };
    if (options.categoryName) {
      where.Category = { name: { contains: options.categoryName, mode: 'insensitive' } };
    }

    const budgets = await prisma.budget.findMany({
      where,
      include: { Category: true },
      orderBy: { createdAt: 'asc' },
    });

    if (budgets.length === 0) {
      return toolNoData('budget_analysis');
    }

    // For each budget, aggregate actual spending using the same boundary logic
    const budgetItems: BudgetItem[] = await Promise.all(
      budgets.map(async (b) => {
        const expAgg = await prisma.expense.aggregate({
          _sum: { amount: true },
          where: {
            userId,
            categoryId: b.categoryId ?? undefined,
            date: { gte: monthStart, lt: monthEnd },
          },
        });

        const budgetAmount  = Number(b.amount);
        const spent         = Number(expAgg._sum.amount ?? 0);
        const remaining     = budgetAmount - spent;
        const percentageUsed = budgetAmount > 0 ? (spent / budgetAmount) * 100 : 0;

        let status: BudgetItem['status'] = 'UNDER_BUDGET';
        if (percentageUsed > 100)     status = 'OVER_BUDGET';
        else if (percentageUsed >= 80) status = 'NEAR_LIMIT';

        return {
          name:            b.name,
          categoryName:    b.Category?.name ?? null,
          budgetAmount,
          spent:           parseFloat(spent.toFixed(2)),
          remaining:       parseFloat(remaining.toFixed(2)),
          percentageUsed:  parseFloat(percentageUsed.toFixed(1)),
          status,
        };
      })
    );

    const totalBudget       = budgetItems.reduce((s, b) => s + b.budgetAmount, 0);
    const totalSpent        = budgetItems.reduce((s, b) => s + b.spent, 0);
    const totalRemaining    = totalBudget - totalSpent;
    const overallUtil       = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
    const overBudgetCount   = budgetItems.filter(b => b.status === 'OVER_BUDGET').length;
    const nearLimitCount    = budgetItems.filter(b => b.status === 'NEAR_LIMIT').length;

    return toolSuccess('budget_analysis', {
      month,
      year,
      periodLabel: `${MONTH_NAMES[month - 1]} ${year}`,
      totalBudget:         parseFloat(totalBudget.toFixed(2)),
      totalSpent:          parseFloat(totalSpent.toFixed(2)),
      totalRemaining:      parseFloat(totalRemaining.toFixed(2)),
      overallUtilization:  parseFloat(overallUtil.toFixed(1)),
      activeBudgetCount:   budgets.length,
      overBudgetCount,
      nearLimitCount,
      budgets:             budgetItems,
      currency: 'INR',
    });
  } catch (err: any) {
    console.error('[AI Tool] budget_analysis error:', err.message);
    return toolError('budget_analysis', 'Could not retrieve your budget data right now.');
  }
}
