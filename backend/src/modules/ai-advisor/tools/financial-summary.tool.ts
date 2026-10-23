import { prisma } from '../../../config/prisma';
import { toolSuccess, toolError, ToolResult } from './tool.types';
import { getMonthBounds } from './date.utils';

/**
 * financial-summary.tool.ts
 *
 * Retrieves a complete financial overview for the authenticated user using
 * existing FinWise database data. No data is invented.
 */

export interface FinancialSummaryData {
  currentMonth: number;
  currentYear: number;
  monthlyIncome: number | null;
  monthlyExpenses: number | null;
  monthlySurplus: number | null;
  savingsRate: number | null;     // percentage
  totalSavings: number | null;
  thisMonthSavings: number | null;
  totalInvestments: number | null;
  accountBalance: number | null;
  activeGoalCount: number;
  currency: string;
}

export async function getFinancialSummary(userId: string): Promise<ToolResult<FinancialSummaryData>> {
  try {
    const now = new Date();
    const month = now.getMonth() + 1;          // 1–12
    const year  = now.getFullYear();

    const { start: monthStart, end: monthEnd } = getMonthBounds(month, year);

    // Run all aggregations in parallel for performance
    const [
      incomeAgg,
      expenseAgg,
      savingAllTimeAgg,
      savingThisMonthAgg,
      investmentAgg,
      accountAgg,
      activeGoalCount,
    ] = await Promise.all([
      // Monthly income
      prisma.income.aggregate({
        where: { userId, date: { gte: monthStart, lt: monthEnd } },
        _sum: { amount: true },
      }),
      // Monthly expenses
      prisma.expense.aggregate({
        where: { userId, date: { gte: monthStart, lt: monthEnd } },
        _sum: { amount: true },
      }),
      // All-time savings
      prisma.saving.aggregate({
        where: { userId },
        _sum: { amount: true },
      }),
      // This month's savings
      prisma.saving.aggregate({
        where: { userId, date: { gte: monthStart, lt: monthEnd } },
        _sum: { amount: true },
      }),
      // Total invested (sum of investedAmount)
      prisma.investment.aggregate({
        where: { userId },
        _sum: { investedAmount: true },
      }),
      // Total account balance
      prisma.account.aggregate({
        where: { userId, isActive: true },
        _sum: { balance: true },
      }),
      // Active goals count
      prisma.goal.count({ where: { userId, status: 'ACTIVE' } }),
    ]);

    const monthlyIncome   = incomeAgg._sum.amount   != null ? Number(incomeAgg._sum.amount)   : null;
    const monthlyExpenses = expenseAgg._sum.amount  != null ? Number(expenseAgg._sum.amount)  : null;
    const totalSavings    = savingAllTimeAgg._sum.amount   != null ? Number(savingAllTimeAgg._sum.amount)   : null;
    const thisMonthSavings = savingThisMonthAgg._sum.amount != null ? Number(savingThisMonthAgg._sum.amount) : null;
    const totalInvestments = investmentAgg._sum.investedAmount != null ? Number(investmentAgg._sum.investedAmount) : null;
    const accountBalance  = accountAgg._sum.balance != null ? Number(accountAgg._sum.balance) : null;

    // Surplus and savings rate require income to be meaningful
    const monthlySurplus = (monthlyIncome != null && monthlyExpenses != null)
      ? monthlyIncome - monthlyExpenses
      : null;

    const savingsRate = (monthlyIncome != null && monthlyIncome > 0 && thisMonthSavings != null)
      ? parseFloat(((thisMonthSavings / monthlyIncome) * 100).toFixed(1))
      : null;

    return toolSuccess('financial_summary', {
      currentMonth: month,
      currentYear:  year,
      monthlyIncome,
      monthlyExpenses,
      monthlySurplus,
      savingsRate,
      totalSavings,
      thisMonthSavings,
      totalInvestments,
      accountBalance,
      activeGoalCount,
      currency: 'INR',
    });
  } catch (err: any) {
    console.error('[AI Tool] financial_summary error:', err.message);
    return toolError('financial_summary', 'Could not retrieve your financial summary right now.');
  }
}
