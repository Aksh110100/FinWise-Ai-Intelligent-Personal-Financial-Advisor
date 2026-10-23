import { prisma } from '../config/prisma';
import { Prisma } from '@prisma/client';

// ─── Date Utilities ───────────────────────────────────────────────────────────

/** Parse range string into {start, end} Date objects (UTC-safe) */
function getRangeDates(range: string): { start: Date; end: Date } {
  const now = new Date();
  const end = new Date(now);
  const start = new Date(now);

  switch (range.toUpperCase()) {
    case '7D':
      start.setDate(now.getDate() - 7);
      break;
    case '1M':
      start.setMonth(now.getMonth() - 1);
      break;
    case '3M':
      start.setMonth(now.getMonth() - 3);
      break;
    case '6M':
      start.setMonth(now.getMonth() - 6);
      break;
    case '1Y':
      start.setFullYear(now.getFullYear() - 1);
      break;
    case 'THIS_MONTH': {
      start.setUTCDate(1);
      start.setUTCHours(0, 0, 0, 0);
      end.setUTCMonth(end.getUTCMonth() + 1, 1);
      end.setUTCHours(0, 0, 0, 0);
      return { start, end };
    }
    default:
      // default: current calendar month
      start.setUTCDate(1);
      start.setUTCHours(0, 0, 0, 0);
      end.setUTCMonth(end.getUTCMonth() + 1, 1);
      end.setUTCHours(0, 0, 0, 0);
      return { start, end };
  }

  start.setUTCHours(0, 0, 0, 0);
  end.setUTCHours(23, 59, 59, 999);
  return { start, end };
}

/** Safe number conversion from Prisma Decimal */
function toNum(val: any): number {
  if (val === null || val === undefined) return 0;
  return Number(val);
}

/** Format INR with locale */
function fmtINR(amount: number): string {
  return '₹' + amount.toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

// ─── Main Summary ─────────────────────────────────────────────────────────────

export class DashboardService {
  /**
   * Full dashboard summary for the authenticated user.
   * All values sourced from persisted DB records.
   */
  static async getSummary(userId: string, range = 'THIS_MONTH') {
    const { start, end } = getRangeDates(range);

    // Previous period (same duration)
    const duration = end.getTime() - start.getTime();
    const prevStart = new Date(start.getTime() - duration);
    const prevEnd = new Date(start);

    // ── Parallel queries ──────────────────────────────────────────────────────
    const [
      incomeAgg,
      prevIncomeAgg,
      expenseAgg,
      prevExpenseAgg,
      accountsAgg,
      savingsAgg,
      prevSavingsAgg,
      investmentSummary,
      goals,
      budgets,
      topExpenseCategories,
    ] = await Promise.all([
      // Income this period
      prisma.income.aggregate({
        where: { userId, date: { gte: start, lte: end } },
        _sum: { amount: true },
      }),
      // Income prev period
      prisma.income.aggregate({
        where: { userId, date: { gte: prevStart, lt: prevEnd } },
        _sum: { amount: true },
      }),
      // Expenses this period
      prisma.expense.aggregate({
        where: { userId, date: { gte: start, lte: end } },
        _sum: { amount: true },
      }),
      // Expenses prev period
      prisma.expense.aggregate({
        where: { userId, date: { gte: prevStart, lt: prevEnd } },
        _sum: { amount: true },
      }),
      // Account balances (authoritative balance from Account model)
      prisma.account.aggregate({
        where: { userId, isActive: true },
        _sum: { balance: true },
      }),
      // Savings this period
      prisma.saving.aggregate({
        where: { userId, date: { gte: start, lte: end } },
        _sum: { amount: true },
        _count: { id: true },
      }),
      // Savings prev period
      prisma.saving.aggregate({
        where: { userId, date: { gte: prevStart, lt: prevEnd } },
        _sum: { amount: true },
      }),
      // Investment portfolio
      prisma.investment.findMany({
        where: { userId },
        select: { investedAmount: true, currentValue: true, type: true },
      }),
      // Goals (ACTIVE only) with their linked savings
      prisma.goal.findMany({
        where: { userId, status: 'ACTIVE' },
        include: { Savings: { select: { amount: true } } },
        orderBy: { createdAt: 'asc' },
      }),
      // Budgets for this period
      prisma.budget.findMany({
        where: {
          userId,
          month: start.getUTCMonth() + 1,
          year: start.getUTCFullYear(),
        },
        include: { Category: true },
      }),
      // Top 6 expense categories this period
      prisma.expense.groupBy({
        by: ['categoryId'],
        where: { userId, date: { gte: start, lte: end } },
        _sum: { amount: true },
        orderBy: { _sum: { amount: 'desc' } },
        take: 6,
      }),
    ]);

    // ── Income / Expenses ─────────────────────────────────────────────────────
    const totalIncome = toNum(incomeAgg._sum.amount);
    const prevIncome = toNum(prevIncomeAgg._sum.amount);
    const totalExpenses = toNum(expenseAgg._sum.amount);
    const prevExpenses = toNum(prevExpenseAgg._sum.amount);
    const netCashFlow = totalIncome - totalExpenses;

    function pctChange(current: number, previous: number): number | null {
      if (previous === 0) return null;
      return parseFloat(((current - previous) / previous * 100).toFixed(1));
    }

    // ── Total Balance: sum of active account balances ─────────────────────────
    // NOTE: This uses the authoritative Account.balance field.
    // If no accounts exist, we document the fallback as income - expenses for the period.
    const accountBalance = toNum(accountsAgg._sum.balance);
    const balanceSource = accountBalance !== 0 ? 'accounts' : 'cash_flow';
    const totalBalance = accountBalance !== 0 ? accountBalance : Math.max(0, netCashFlow);

    // ── Savings ───────────────────────────────────────────────────────────────
    const totalSavings = toNum(savingsAgg._sum.amount);
    const prevSavings = toNum(prevSavingsAgg._sum.amount);

    // ── Investments ───────────────────────────────────────────────────────────
    let totalInvested = 0;
    let currentPortfolioValue = 0;
    const allocationMap: Record<string, number> = {};

    for (const inv of investmentSummary) {
      const invested = toNum(inv.investedAmount);
      const current = inv.currentValue !== null ? toNum(inv.currentValue) : invested;
      totalInvested += invested;
      currentPortfolioValue += current;
      allocationMap[inv.type] = (allocationMap[inv.type] || 0) + current;
    }

    const investmentReturns = currentPortfolioValue - totalInvested;
    const investmentReturnPct = totalInvested > 0
      ? parseFloat(((investmentReturns / totalInvested) * 100).toFixed(2))
      : null;

    const allocation = Object.entries(allocationMap).map(([type, value]) => ({
      type,
      value,
      percentage: currentPortfolioValue > 0
        ? parseFloat(((value / currentPortfolioValue) * 100).toFixed(1))
        : 0,
    }));

    // ── Goals ─────────────────────────────────────────────────────────────────
    const serializedGoals = goals.map(g => {
      const savedAmount = g.Savings.reduce((sum, s) => sum + toNum(s.amount), 0);
      const targetAmount = toNum(g.targetAmount);
      const remainingAmount = Math.max(targetAmount - savedAmount, 0);
      const progress = targetAmount > 0
        ? Math.min(parseFloat(((savedAmount / targetAmount) * 100).toFixed(1)), 100)
        : 0;
      return {
        id: g.id,
        name: g.name,
        targetAmount,
        savedAmount,
        remainingAmount,
        progress,
        targetDate: g.targetDate ? g.targetDate.toISOString() : null,
        status: g.status,
      };
    });

    // ── Budget utilization ────────────────────────────────────────────────────
    // Fetch actual spending per category for budget period
    let budgetUtilization: any[] = [];
    if (budgets.length > 0) {
      const catIds = budgets
        .map(b => b.categoryId)
        .filter((id): id is string => id !== null);

      const expByCategory = catIds.length > 0
        ? await prisma.expense.groupBy({
            by: ['categoryId'],
            where: {
              userId,
              categoryId: { in: catIds },
              date: { gte: start, lte: end },
            },
            _sum: { amount: true },
          })
        : [];

      const expMap: Record<string, number> = {};
      expByCategory.forEach(e => {
        if (e.categoryId) expMap[e.categoryId] = toNum(e._sum.amount);
      });

      budgetUtilization = budgets.map(b => {
        const budgeted = toNum(b.amount);
        const spent = b.categoryId ? (expMap[b.categoryId] || 0) : 0;
        const utilization = budgeted > 0 ? parseFloat(((spent / budgeted) * 100).toFixed(1)) : 0;
        return {
          id: b.id,
          name: b.name,
          category: b.Category?.name || b.name,
          budgeted,
          spent,
          remaining: Math.max(budgeted - spent, 0),
          utilization,
          isOverBudget: spent > budgeted,
        };
      });
    }

    // ── Spending breakdown ────────────────────────────────────────────────────
    const categoryIds = topExpenseCategories
      .map(e => e.categoryId)
      .filter((id): id is string => id !== null);

    let categoryMap: Record<string, string> = {};
    if (categoryIds.length > 0) {
      const cats = await prisma.category.findMany({
        where: { id: { in: categoryIds } },
        select: { id: true, name: true },
      });
      cats.forEach(c => { categoryMap[c.id] = c.name; });
    }

    const spendingBreakdown = topExpenseCategories.map(e => {
      const amount = toNum(e._sum.amount);
      return {
        categoryId: e.categoryId || 'uncategorized',
        categoryName: e.categoryId
          ? (categoryMap[e.categoryId] || 'Unknown')
          : 'Uncategorized',
        amount,
        percentage: totalExpenses > 0
          ? parseFloat(((amount / totalExpenses) * 100).toFixed(1))
          : 0,
      };
    });

    // ── Financial Health Score ────────────────────────────────────────────────
    const healthScore = DashboardService.computeHealthScore({
      totalIncome,
      totalExpenses,
      totalSavings,
      totalInvested: currentPortfolioValue,
      budgetUtilization,
      goals: serializedGoals,
    });

    // ── Safe to Spend ─────────────────────────────────────────────────────────
    // = income - expenses - savings contributions this period
    const safeToSpend = Math.max(0, totalIncome - totalExpenses - totalSavings);

    // ── Period label ──────────────────────────────────────────────────────────
    const periodLabel = start.toLocaleDateString('en-IN', {
      month: 'long',
      year: 'numeric',
      timeZone: 'Asia/Kolkata',
    });

    return {
      period: {
        range,
        start: start.toISOString(),
        end: end.toISOString(),
        label: periodLabel,
      },
      income: {
        total: totalIncome,
        formatted: fmtINR(totalIncome),
        previousPeriod: prevIncome > 0 ? prevIncome : null,
        changePercent: pctChange(totalIncome, prevIncome),
      },
      expenses: {
        total: totalExpenses,
        formatted: fmtINR(totalExpenses),
        previousPeriod: prevExpenses > 0 ? prevExpenses : null,
        changePercent: pctChange(totalExpenses, prevExpenses),
      },
      netCashFlow: {
        total: netCashFlow,
        formatted: fmtINR(netCashFlow),
      },
      balance: {
        total: totalBalance,
        formatted: fmtINR(totalBalance),
        source: balanceSource, // 'accounts' or 'cash_flow'
        note: balanceSource === 'cash_flow'
          ? 'No accounts found. Showing income - expenses for the period.'
          : 'Sum of active account balances.',
      },
      savings: {
        total: totalSavings,
        formatted: fmtINR(totalSavings),
        previousPeriod: prevSavings > 0 ? prevSavings : null,
        changePercent: pctChange(totalSavings, prevSavings),
        count: savingsAgg._count.id,
      },
      investments: {
        totalInvested,
        currentValue: currentPortfolioValue,
        returns: investmentReturns,
        returnPercentage: investmentReturnPct,
        allocation,
        isEmpty: investmentSummary.length === 0,
      },
      goals: serializedGoals,
      budgetUtilization,
      spendingBreakdown,
      safeToSpend: {
        amount: safeToSpend,
        formatted: fmtINR(safeToSpend),
      },
      health: healthScore,
      dataAvailability: {
        hasIncome: totalIncome > 0,
        hasExpenses: totalExpenses > 0,
        hasSavings: totalSavings > 0,
        hasInvestments: investmentSummary.length > 0,
        hasGoals: goals.length > 0,
        hasBudgets: budgets.length > 0,
        hasAccountBalances: accountBalance !== 0,
      },
    };
  }

  /**
   * Deterministic financial health score (0–100).
   * Weights documented below.
   */
  static computeHealthScore(params: {
    totalIncome: number;
    totalExpenses: number;
    totalSavings: number;
    totalInvested: number;
    budgetUtilization: any[];
    goals: any[];
  }): {
    score: number;
    label: string;
    breakdown: Record<string, number | null>;
    summary: string;
    factors: string[];
  } {
    const { totalIncome, totalExpenses, totalSavings, totalInvested, budgetUtilization, goals } = params;

    const factors: string[] = [];
    const breakdown: Record<string, number | null> = {};

    // 1. Expense ratio (30 pts): expenses / income
    let spendingScore: number | null = null;
    if (totalIncome > 0) {
      const expenseRatio = totalExpenses / totalIncome;
      spendingScore = Math.max(0, Math.round((1 - expenseRatio) * 100));
      spendingScore = Math.min(spendingScore, 100);
      if (expenseRatio > 0.9) factors.push('Expenses exceed 90% of income.');
      else if (expenseRatio > 0.75) factors.push('Expenses are between 75–90% of income.');
      else factors.push('Expense ratio is healthy.');
    }
    breakdown.spending = spendingScore;

    // 2. Savings rate (25 pts): savings / income
    let savingsScore: number | null = null;
    if (totalIncome > 0) {
      const savingsRate = totalSavings / totalIncome;
      savingsScore = Math.min(100, Math.round(savingsRate * 500)); // 20% rate = 100 pts
      if (savingsRate < 0.05) factors.push('Savings rate is below 5%.');
      else if (savingsRate >= 0.2) factors.push('Excellent savings rate (≥20%).');
      else factors.push(`Savings rate is ${(savingsRate * 100).toFixed(1)}%.`);
    }
    breakdown.savings = savingsScore;

    // 3. Investment activity (20 pts): has investments vs not
    let investmentScore: number | null = null;
    if (totalInvested > 0) {
      investmentScore = totalIncome > 0
        ? Math.min(100, Math.round((totalInvested / totalIncome) * 200))
        : 50;
      factors.push(`Portfolio value: ${fmtINR(totalInvested)}.`);
    } else {
      investmentScore = null;
      factors.push('No investments tracked.');
    }
    breakdown.investments = investmentScore;

    // 4. Budget adherence (15 pts): over-budget items
    let budgetScore: number | null = null;
    if (budgetUtilization.length > 0) {
      const overBudgetCount = budgetUtilization.filter(b => b.isOverBudget).length;
      budgetScore = Math.round(((budgetUtilization.length - overBudgetCount) / budgetUtilization.length) * 100);
      if (overBudgetCount > 0)
        factors.push(`${overBudgetCount} of ${budgetUtilization.length} budget categories exceeded.`);
      else
        factors.push('All budget categories within limits.');
    }
    breakdown.budgetAdherence = budgetScore;

    // 5. Goal progress (10 pts): average goal completion
    let goalScore: number | null = null;
    if (goals.length > 0) {
      const avgProgress = goals.reduce((sum, g) => sum + g.progress, 0) / goals.length;
      goalScore = Math.round(avgProgress);
      factors.push(`Average goal progress: ${avgProgress.toFixed(1)}%.`);
    }
    breakdown.goalProgress = goalScore;

    // ── Weighted average of available scores ──────────────────────────────────
    const weights = [
      { key: 'spending',       weight: 30, score: spendingScore },
      { key: 'savings',        weight: 25, score: savingsScore },
      { key: 'investments',    weight: 20, score: investmentScore },
      { key: 'budgetAdherence', weight: 15, score: budgetScore },
      { key: 'goalProgress',   weight: 10, score: goalScore },
    ];

    let totalWeight = 0;
    let weightedSum = 0;
    for (const w of weights) {
      if (w.score !== null) {
        totalWeight += w.weight;
        weightedSum += w.score * w.weight;
      }
    }

    const score = totalWeight > 0
      ? Math.round(weightedSum / totalWeight)
      : 0;

    let label: string;
    let summary: string;
    if (score >= 80) {
      label = 'EXCELLENT';
      summary = `Your financial health score is ${score}/100. Strong expense control and savings discipline.`;
    } else if (score >= 65) {
      label = 'GOOD';
      summary = `Your financial health score is ${score}/100. Good overall, with room to improve savings or reduce expenses.`;
    } else if (score >= 45) {
      label = 'FAIR';
      summary = `Your financial health score is ${score}/100. Consider reducing expenses and increasing savings contributions.`;
    } else if (totalIncome === 0 && totalExpenses === 0) {
      label = 'INSUFFICIENT DATA';
      summary = 'Add income and expense records to compute your financial health score.';
    } else {
      label = 'NEEDS ATTENTION';
      summary = `Your financial health score is ${score}/100. Expenses are significantly exceeding income or savings.`;
    }

    return { score, label, breakdown, summary, factors };
  }

  /**
   * Cash-flow chart data for the income vs expenses graph.
   * Groups by day (7D, 1M) or month (3M, 6M, 1Y).
   */
  static async getCashFlow(userId: string, range = '1M') {
    const { start, end } = getRangeDates(range);

    const [incomes, expenses] = await Promise.all([
      prisma.income.findMany({
        where: { userId, date: { gte: start, lte: end } },
        select: { amount: true, date: true },
        orderBy: { date: 'asc' },
      }),
      prisma.expense.findMany({
        where: { userId, date: { gte: start, lte: end } },
        select: { amount: true, date: true },
        orderBy: { date: 'asc' },
      }),
    ]);

    const useMonthly = ['3M', '6M', '1Y'].includes(range.toUpperCase());

    if (useMonthly) {
      return DashboardService.groupByMonth(incomes, expenses, start, end);
    } else {
      return DashboardService.groupByDay(incomes, expenses, start, end);
    }
  }

  private static groupByDay(
    incomes: { amount: any; date: Date }[],
    expenses: { amount: any; date: Date }[],
    start: Date,
    end: Date
  ) {
    const incomeMap: Record<string, number> = {};
    const expenseMap: Record<string, number> = {};

    incomes.forEach(i => {
      const key = i.date.toISOString().split('T')[0];
      incomeMap[key] = (incomeMap[key] || 0) + toNum(i.amount);
    });

    expenses.forEach(e => {
      const key = e.date.toISOString().split('T')[0];
      expenseMap[key] = (expenseMap[key] || 0) + toNum(e.amount);
    });

    const points: any[] = [];
    const cur = new Date(start);
    cur.setUTCHours(0, 0, 0, 0);

    while (cur <= end) {
      const key = cur.toISOString().split('T')[0];
      const label = cur.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' });
      points.push({
        date: key,
        label,
        income: incomeMap[key] || 0,
        expense: expenseMap[key] || 0,
      });
      cur.setUTCDate(cur.getUTCDate() + 1);
    }

    return { range, bucketType: 'day', points };
  }

  private static groupByMonth(
    incomes: { amount: any; date: Date }[],
    expenses: { amount: any; date: Date }[],
    start: Date,
    end: Date
  ) {
    const incomeMap: Record<string, number> = {};
    const expenseMap: Record<string, number> = {};

    incomes.forEach(i => {
      const key = `${i.date.getUTCFullYear()}-${String(i.date.getUTCMonth() + 1).padStart(2, '0')}`;
      incomeMap[key] = (incomeMap[key] || 0) + toNum(i.amount);
    });

    expenses.forEach(e => {
      const key = `${e.date.getUTCFullYear()}-${String(e.date.getUTCMonth() + 1).padStart(2, '0')}`;
      expenseMap[key] = (expenseMap[key] || 0) + toNum(e.amount);
    });

    const points: any[] = [];
    const cur = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
    const endMonth = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() + 1, 1));

    while (cur < endMonth) {
      const key = `${cur.getUTCFullYear()}-${String(cur.getUTCMonth() + 1).padStart(2, '0')}`;
      const label = cur.toLocaleDateString('en-IN', { month: 'short', year: '2-digit', timeZone: 'Asia/Kolkata' });
      points.push({
        date: key,
        label,
        income: incomeMap[key] || 0,
        expense: expenseMap[key] || 0,
      });
      cur.setUTCMonth(cur.getUTCMonth() + 1);
    }

    return { range, bucketType: 'month', points };
  }

  /**
   * Spending breakdown by category for the donut chart.
   */
  static async getSpendingBreakdown(userId: string, range = '1M') {
    const { start, end } = getRangeDates(range);

    const grouped = await prisma.expense.groupBy({
      by: ['categoryId'],
      where: { userId, date: { gte: start, lte: end } },
      _sum: { amount: true },
      orderBy: { _sum: { amount: 'desc' } },
    });

    if (grouped.length === 0) {
      return { range, totalExpenses: 0, categories: [], isEmpty: true };
    }

    const catIds = grouped.map(g => g.categoryId).filter((id): id is string => id !== null);
    let catNames: Record<string, string> = {};

    if (catIds.length > 0) {
      const cats = await prisma.category.findMany({
        where: { id: { in: catIds } },
        select: { id: true, name: true },
      });
      cats.forEach(c => { catNames[c.id] = c.name; });
    }

    const totalExpenses = grouped.reduce((sum, g) => sum + toNum(g._sum.amount), 0);

    const categories = grouped.map(g => ({
      categoryId: g.categoryId || 'uncategorized',
      categoryName: g.categoryId ? (catNames[g.categoryId] || 'Unknown') : 'Uncategorized',
      amount: toNum(g._sum.amount),
      percentage: totalExpenses > 0
        ? parseFloat(((toNum(g._sum.amount) / totalExpenses) * 100).toFixed(1))
        : 0,
    }));

    return { range, totalExpenses, categories, isEmpty: false };
  }

  /**
   * AI Insights derived from actual data only.
   * No fabricated amounts or hardcoded text.
   */
  static async getInsights(userId: string) {
    const now = new Date();
    const currentMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const prevMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
    const prevMonthEnd = currentMonthStart;

    const insights: {
      type: string;
      title: string;
      detail?: string;
      metric?: string;
    }[] = [];

    // 1. Top spending category this month vs last month
    const [currCatExp, prevCatExp] = await Promise.all([
      prisma.expense.groupBy({
        by: ['categoryId'],
        where: { userId, date: { gte: currentMonthStart, lte: now } },
        _sum: { amount: true },
        orderBy: { _sum: { amount: 'desc' } },
        take: 1,
      }),
      prisma.expense.groupBy({
        by: ['categoryId'],
        where: { userId, date: { gte: prevMonthStart, lt: prevMonthEnd } },
        _sum: { amount: true },
        orderBy: { _sum: { amount: 'desc' } },
        take: 1,
      }),
    ]);

    if (currCatExp.length > 0 && currCatExp[0].categoryId) {
      const catId = currCatExp[0].categoryId;
      const currAmt = toNum(currCatExp[0]._sum.amount);
      const cat = await prisma.category.findFirst({ where: { id: catId }, select: { name: true } });
      const catName = cat?.name || 'Uncategorized';

      const prevCatMatch = prevCatExp.find(p => p.categoryId === catId);
      const prevAmt = prevCatMatch ? toNum(prevCatMatch._sum.amount) : 0;

      if (prevAmt > 0) {
        const diff = currAmt - prevAmt;
        const diffPct = (diff / prevAmt) * 100;
        if (Math.abs(diffPct) >= 10) {
          const direction = diff > 0 ? 'increased' : 'decreased';
          insights.push({
            type: diff > 0 ? 'WARNING' : 'POSITIVE',
            title: `${catName} spending ${direction} by ${Math.abs(diffPct).toFixed(0)}% vs last month.`,
            detail: `This month: ${fmtINR(currAmt)} | Last month: ${fmtINR(prevAmt)}`,
            metric: fmtINR(Math.abs(diff)),
          });
        }
      } else if (currAmt > 0) {
        insights.push({
          type: 'INFO',
          title: `Top spending category this month: ${catName}.`,
          detail: `Total: ${fmtINR(currAmt)}`,
          metric: fmtINR(currAmt),
        });
      }
    }

    // 2. Expense > income alert
    const [incomeAgg, expenseAgg] = await Promise.all([
      prisma.income.aggregate({
        where: { userId, date: { gte: currentMonthStart, lte: now } },
        _sum: { amount: true },
      }),
      prisma.expense.aggregate({
        where: { userId, date: { gte: currentMonthStart, lte: now } },
        _sum: { amount: true },
      }),
    ]);

    const currIncome = toNum(incomeAgg._sum.amount);
    const currExpenses = toNum(expenseAgg._sum.amount);

    if (currIncome > 0 && currExpenses > currIncome) {
      const excess = currExpenses - currIncome;
      insights.push({
        type: 'CRITICAL',
        title: `Expenses exceed income by ${fmtINR(excess)} this month.`,
        detail: `Income: ${fmtINR(currIncome)} | Expenses: ${fmtINR(currExpenses)}`,
        metric: fmtINR(excess),
      });
    }

    // 3. Budget over-limit alerts
    const budgets = await prisma.budget.findMany({
      where: {
        userId,
        month: now.getUTCMonth() + 1,
        year: now.getUTCFullYear(),
      },
      include: { Category: true },
    });

    if (budgets.length > 0) {
      const catIds = budgets.map(b => b.categoryId).filter((id): id is string => id !== null);
      if (catIds.length > 0) {
        const spendingByCat = await prisma.expense.groupBy({
          by: ['categoryId'],
          where: { userId, categoryId: { in: catIds }, date: { gte: currentMonthStart, lte: now } },
          _sum: { amount: true },
        });
        const spendMap: Record<string, number> = {};
        spendingByCat.forEach(s => { if (s.categoryId) spendMap[s.categoryId] = toNum(s._sum.amount); });

        for (const b of budgets) {
          if (!b.categoryId) continue;
          const spent = spendMap[b.categoryId] || 0;
          const budgeted = toNum(b.amount);
          if (spent >= budgeted * 0.9) {
            const isOver = spent > budgeted;
            insights.push({
              type: isOver ? 'WARNING' : 'CAUTION',
              title: isOver
                ? `${b.Category?.name || b.name} budget exceeded by ${fmtINR(spent - budgeted)}.`
                : `${b.Category?.name || b.name} budget is ${((spent / budgeted) * 100).toFixed(0)}% used.`,
              detail: `Budget: ${fmtINR(budgeted)} | Spent: ${fmtINR(spent)}`,
              metric: isOver ? fmtINR(spent - budgeted) : `${((spent / budgeted) * 100).toFixed(0)}%`,
            });
          }
        }
      }
    }

    // 4. Goal progress
    const activeGoals = await prisma.goal.findMany({
      where: { userId, status: 'ACTIVE' },
      include: { Savings: { select: { amount: true } } },
    });

    for (const g of activeGoals) {
      const saved = g.Savings.reduce((sum, s) => sum + toNum(s.amount), 0);
      const target = toNum(g.targetAmount);
      if (target > 0) {
        const progress = (saved / target) * 100;
        if (progress >= 100) {
          insights.push({
            type: 'ACHIEVEMENT',
            title: `Goal "${g.name}" has been reached! 🎉`,
            detail: `Saved: ${fmtINR(saved)} of ${fmtINR(target)}`,
            metric: '100%',
          });
        } else if (g.targetDate) {
          const daysLeft = Math.ceil((g.targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          if (daysLeft > 0 && daysLeft < 60 && progress < 80) {
            insights.push({
              type: 'CAUTION',
              title: `Goal "${g.name}" is ${progress.toFixed(0)}% complete with ${daysLeft} days remaining.`,
              detail: `Saved: ${fmtINR(saved)} | Target: ${fmtINR(target)}`,
              metric: `${progress.toFixed(0)}%`,
            });
          }
        }
      }
    }

    // 5. Savings trend
    const prevSavingsAgg = await prisma.saving.aggregate({
      where: { userId, date: { gte: prevMonthStart, lt: prevMonthEnd } },
      _sum: { amount: true },
    });
    const currSavingsAgg = await prisma.saving.aggregate({
      where: { userId, date: { gte: currentMonthStart, lte: now } },
      _sum: { amount: true },
    });

    const prevSavings = toNum(prevSavingsAgg._sum.amount);
    const currSavings = toNum(currSavingsAgg._sum.amount);

    if (prevSavings > 0 && currSavings > 0) {
      const diff = currSavings - prevSavings;
      const diffPct = (diff / prevSavings) * 100;
      if (Math.abs(diffPct) >= 10) {
        const direction = diff > 0 ? 'increased' : 'decreased';
        insights.push({
          type: diff > 0 ? 'POSITIVE' : 'WARNING',
          title: `Savings ${direction} by ${Math.abs(diffPct).toFixed(0)}% vs last month.`,
          detail: `This month: ${fmtINR(currSavings)} | Last month: ${fmtINR(prevSavings)}`,
          metric: fmtINR(Math.abs(diff)),
        });
      }
    }

    if (insights.length === 0) {
      return {
        insights: [],
        isEmpty: true,
        message: 'No significant patterns found. Add more financial records to generate insights.',
      };
    }

    return { insights, isEmpty: false };
  }
}
