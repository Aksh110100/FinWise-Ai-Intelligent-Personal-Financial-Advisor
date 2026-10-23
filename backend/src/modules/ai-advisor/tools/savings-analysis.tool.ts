import { prisma } from '../../../config/prisma';
import { toolSuccess, toolError, toolNoData, ToolResult } from './tool.types';
import { getMonthBounds } from './date.utils';

/**
 * savings-analysis.tool.ts
 *
 * Analyses savings data for the authenticated user.
 * Delegates aggregation to existing SavingService logic where possible,
 * and writes targeted AI-specific queries directly.
 */

export interface SavingsAnalysisData {
  totalSavings: number;
  thisMonthSavings: number;
  previousMonthSavings: number;
  monthlyChangePct: number | null;
  avgMonthlySavings: number;           // Average over last 6 months
  savingsRate: number | null;          // Requires income data
  totalTransactions: number;
  currentMonth: number;
  currentYear: number;
  currency: string;
}

export async function getSavingsAnalysis(userId: string): Promise<ToolResult<SavingsAnalysisData | null>> {
  try {
    const now   = new Date();
    const month = now.getMonth() + 1;
    const year  = now.getFullYear();

    const { start: monthStart, end: monthEnd } = getMonthBounds(month, year);

    const prevMonth      = month === 1 ? 12 : month - 1;
    const prevYear       = month === 1 ? year - 1 : year;
    const { start: prevMonthStart, end: prevMonthEnd } = getMonthBounds(prevMonth, prevYear);

    const sixMonthsAgo = new Date(year, month - 7, 1);

    const [thisMonthAgg, prevMonthAgg, allTimeAgg, countAll, sixMonthAgg, incomeAgg] = await Promise.all([
      prisma.saving.aggregate({
        where: { userId, date: { gte: monthStart, lt: monthEnd } },
        _sum: { amount: true },
      }),
      prisma.saving.aggregate({
        where: { userId, date: { gte: prevMonthStart, lt: prevMonthEnd } },
        _sum: { amount: true },
      }),
      prisma.saving.aggregate({
        where: { userId },
        _sum: { amount: true },
      }),
      prisma.saving.count({ where: { userId } }),
      prisma.saving.aggregate({
        where: { userId, date: { gte: sixMonthsAgo, lt: monthEnd } },
        _sum: { amount: true },
      }),
      // Monthly income for savings rate
      prisma.income.aggregate({
        where: { userId, date: { gte: monthStart, lt: monthEnd } },
        _sum: { amount: true },
      }),
    ]);

    const thisMonthSavings      = Number(thisMonthAgg._sum.amount ?? 0);
    const previousMonthSavings  = Number(prevMonthAgg._sum.amount ?? 0);
    const totalSavings          = Number(allTimeAgg._sum.amount ?? 0);
    const avgMonthlySavings     = parseFloat((Number(sixMonthAgg._sum.amount ?? 0) / 6).toFixed(2));
    const monthlyIncome         = incomeAgg._sum.amount != null ? Number(incomeAgg._sum.amount) : null;

    const monthlyChangePct = previousMonthSavings > 0
      ? parseFloat((((thisMonthSavings - previousMonthSavings) / previousMonthSavings) * 100).toFixed(1))
      : null;

    if (countAll === 0) {
      return toolNoData('savings_analysis');
    }

    const savingsRate = (monthlyIncome != null && monthlyIncome > 0 && thisMonthSavings > 0)
      ? parseFloat(((thisMonthSavings / monthlyIncome) * 100).toFixed(1))
      : null;

    return toolSuccess('savings_analysis', {
      totalSavings,
      thisMonthSavings,
      previousMonthSavings,
      monthlyChangePct,
      avgMonthlySavings,
      savingsRate,
      totalTransactions: countAll,
      currentMonth: month,
      currentYear: year,
      currency: 'INR',
    });
  } catch (err: any) {
    console.error('[AI Tool] savings_analysis error:', err.message);
    return toolError('savings_analysis', 'Could not retrieve your savings data right now.');
  }
}
