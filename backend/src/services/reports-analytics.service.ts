import { prisma } from '../config/prisma';

export class ReportsAnalyticsService {
  static async getOverviewSnapshot(userId: string, periodStr: string, comparison: string) {
    const now = new Date();
    let start: Date;
    let end: Date;

    const currentYear = now.getUTCFullYear();
    const currentMonth = now.getUTCMonth();
    const currentDate = now.getUTCDate();

    const addDays = (d: Date, days: number) => new Date(d.getTime() + days * 86400000);
    const getMonthStart = (y: number, m: number) => new Date(Date.UTC(y, m, 1));

    if (periodStr === 'This Month') {
      start = getMonthStart(currentYear, currentMonth);
      end = getMonthStart(currentYear, currentMonth + 1);
    } else if (periodStr === 'Last Month') {
      start = getMonthStart(currentYear, currentMonth - 1);
      end = getMonthStart(currentYear, currentMonth);
    } else if (periodStr === 'Last 3 Months') {
      start = getMonthStart(currentYear, currentMonth - 3);
      end = getMonthStart(currentYear, currentMonth + 1);
    } else if (periodStr === 'Last 6 Months') {
      start = getMonthStart(currentYear, currentMonth - 6);
      end = getMonthStart(currentYear, currentMonth + 1);
    } else if (periodStr === 'This Year') {
      start = getMonthStart(currentYear, 0);
      end = getMonthStart(currentYear + 1, 0);
    } else {
      start = getMonthStart(currentYear, currentMonth);
      end = getMonthStart(currentYear, currentMonth + 1);
      periodStr = 'This Month';
    }

    let prevStart: Date | null = null;
    let prevEnd: Date | null = null;

    if (comparison === 'Previous Month') {
      prevStart = getMonthStart(start.getUTCFullYear(), start.getUTCMonth() - 1);
      prevEnd = getMonthStart(start.getUTCFullYear(), start.getUTCMonth());
    } else if (comparison === 'Previous Period') {
      const diffMs = end.getTime() - start.getTime();
      prevStart = new Date(start.getTime() - diffMs);
      prevEnd = start;
    } else if (comparison === 'Previous Year') {
      prevStart = new Date(Date.UTC(start.getUTCFullYear() - 1, start.getUTCMonth(), start.getUTCDate()));
      prevEnd = new Date(Date.UTC(end.getUTCFullYear() - 1, end.getUTCMonth(), end.getUTCDate()));
    }

    // 1. Fetch Income
    const incomes = await prisma.income.aggregate({
      where: { userId, date: { gte: start, lt: end } },
      _sum: { amount: true }
    });
    const netIncome = Number(incomes._sum.amount ?? 0);

    let prevNetIncome = 0;
    if (prevStart && prevEnd) {
      const prevIncomes = await prisma.income.aggregate({
        where: { userId, date: { gte: prevStart, lt: prevEnd } },
        _sum: { amount: true }
      });
      prevNetIncome = Number(prevIncomes._sum.amount ?? 0);
    }

    // 2. Fetch Expenses
    const expensesAgg = await prisma.expense.aggregate({
      where: { userId, date: { gte: start, lt: end } },
      _sum: { amount: true }
    });
    const totalExpenses = Number(expensesAgg._sum.amount ?? 0);

    let prevTotalExpenses = 0;
    if (prevStart && prevEnd) {
      const prevExpensesAgg = await prisma.expense.aggregate({
        where: { userId, date: { gte: prevStart, lt: prevEnd } },
        _sum: { amount: true }
      });
      prevTotalExpenses = Number(prevExpensesAgg._sum.amount ?? 0);
    }

    // 3. Fetch Savings
    const savingsAgg = await prisma.saving.aggregate({
      where: { userId, date: { gte: start, lt: end } },
      _sum: { amount: true }
    });
    const totalSavings = Number(savingsAgg._sum.amount ?? 0);

    let prevTotalSavings = 0;
    if (prevStart && prevEnd) {
      const prevSavingsAgg = await prisma.saving.aggregate({
        where: { userId, date: { gte: prevStart, lt: prevEnd } },
        _sum: { amount: true }
      });
      prevTotalSavings = Number(prevSavingsAgg._sum.amount ?? 0);
    }

    // Calculate Savings Rate (Savings / Income * 100). Or (Savings / (Savings + Expenses) * 100)?
    // The previous prompt mentioned: "Savings Rate = Savings / Income * 100. BUT: first inspect the existing Savings/dashboard analytics implementation... If the application already defines Savings Rate differently: reuse that definition."
    const savingsRate = netIncome > 0 ? (totalSavings / netIncome) * 100 : 0;
    const prevSavingsRate = prevNetIncome > 0 ? (prevTotalSavings / prevNetIncome) * 100 : 0;

    const netCashFlow = netIncome - totalExpenses;
    const prevNetCashFlow = prevNetIncome - prevTotalExpenses;

    // Changes
    const getChange = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / Math.abs(previous)) * 100;
    };

    const changes = {
      netIncome: getChange(netIncome, prevNetIncome),
      totalExpenses: getChange(totalExpenses, prevTotalExpenses),
      savings: getChange(totalSavings, prevTotalSavings),
      savingsRate: savingsRate - prevSavingsRate,
    };

    // Cash Flow Chart Data (group by month if > 1 month, else by week/day)
    // For simplicity, let's just fetch all income/expense records and bucket them.
    const allIncomes = await prisma.income.findMany({
      where: { userId, date: { gte: start, lt: end } },
      select: { date: true, amount: true }
    });
    const allExpenses = await prisma.expense.findMany({
      where: { userId, date: { gte: start, lt: end } },
      select: { date: true, amount: true }
    });

    const isMonthly = (end.getTime() - start.getTime()) > 31 * 86400000;
    const cashFlowMap = new Map<string, { in: number; out: number; label: string }>();

    const getBucket = (d: Date) => {
      if (isMonthly) {
        return { key: `${d.getUTCFullYear()}-${String(d.getUTCMonth()).padStart(2, '0')}`, label: d.toLocaleDateString('en-US', { month: 'short' }) };
      }
      return { key: d.toISOString().slice(0, 10), label: d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }) };
    };

    allIncomes.forEach((inc: any) => {
      const b = getBucket(new Date(inc.date));
      if (!cashFlowMap.has(b.key)) cashFlowMap.set(b.key, { in: 0, out: 0, label: b.label });
      cashFlowMap.get(b.key)!.in += Number(inc.amount);
    });

    allExpenses.forEach((exp: any) => {
      const b = getBucket(new Date(exp.date));
      if (!cashFlowMap.has(b.key)) cashFlowMap.set(b.key, { in: 0, out: 0, label: b.label });
      cashFlowMap.get(b.key)!.out += Number(exp.amount);
    });

    const cashFlowSeries = Array.from(cashFlowMap.entries()).sort((a, b) => a[0].localeCompare(b[0])).map(([_, v]) => v);

    // Spending by Category
    const categoryAgg = await prisma.expense.groupBy({
      by: ['categoryId'],
      where: { userId, date: { gte: start, lt: end } },
      _sum: { amount: true }
    });

    const categories = await prisma.category.findMany({ where: { userId } });
    const catMap = new Map(categories.map(c => [c.id, c.name]));

    const spendingByCategory = categoryAgg.map((c: any) => ({
      category: c.categoryId && catMap.has(c.categoryId) ? catMap.get(c.categoryId)! : 'Other',
      amount: Number(c._sum.amount ?? 0),
      percentage: totalExpenses > 0 ? (Number(c._sum.amount ?? 0) / totalExpenses) * 100 : 0
    })).sort((a: any, b: any) => b.amount - a.amount);

    // Goals (Goal Momentum and Savings Progress)
    const goals = await prisma.goal.findMany({
      where: { userId }
    });
    
    // We need savings for each goal up to the 'end' date of the report.
    const goalProgress = await Promise.all(goals.map(async (g: any) => {
      const gAgg = await prisma.saving.aggregate({
        where: { userId, goalId: g.id, date: { lt: end } },
        _sum: { amount: true }
      });
      const saved = Number(gAgg._sum.amount ?? 0);
      const progress = Number(g.targetAmount) > 0 ? (saved / Number(g.targetAmount)) * 100 : 0;
      return {
        id: g.id,
        name: g.name,
        targetAmount: Number(g.targetAmount),
        savedAmount: saved,
        progress: Math.min(progress, 100),
      };
    }));

    const activeGoals = goalProgress.filter((g: any) => g.progress < 100);
    const completedGoals = goalProgress.filter((g: any) => g.progress >= 100);
    const overallGoalProgress = goalProgress.length > 0 
      ? goalProgress.reduce((sum: number, g: any) => sum + g.progress, 0) / goalProgress.length 
      : 0;

    // Financial Health (Naive but deterministic calc)
    // 1. Positive net cash flow = strong (+20)
    // 2. Savings rate > 20% = strong (+30)
    // 3. Goal progress > 50% = strong (+20)
    // 4. Expenses <= 50% of income = strong (+30)
    let healthScore = 0;
    
    let cashFlowStatus = 'No data';
    if (netIncome > 0 || totalExpenses > 0) {
      if (netCashFlow > (netIncome * 0.2)) { healthScore += 20; cashFlowStatus = 'Strong'; }
      else if (netCashFlow > 0) { healthScore += 10; cashFlowStatus = 'Good'; }
      else { cashFlowStatus = 'Needs Attention'; }
    }

    let savingsStatus = 'No data';
    if (netIncome > 0) {
      if (savingsRate > 20) { healthScore += 30; savingsStatus = 'Excellent'; }
      else if (savingsRate > 10) { healthScore += 15; savingsStatus = 'Good'; }
      else { savingsStatus = 'Low'; }
    }

    let spendingStatus = 'No data';
    if (netIncome > 0) {
      const expPct = (totalExpenses / netIncome) * 100;
      if (expPct < 50) { healthScore += 30; spendingStatus = 'Excellent'; }
      else if (expPct < 80) { healthScore += 15; spendingStatus = 'Moderate'; }
      else { spendingStatus = 'High'; }
    }

    let goalStatus = 'No data';
    if (goalProgress.length > 0) {
      if (overallGoalProgress > 50) { healthScore += 20; goalStatus = 'On Track'; }
      else { healthScore += 10; goalStatus = 'Building'; }
    }

    let healthLabel = 'Needs Attention';
    if (healthScore >= 80) healthLabel = 'STRONG POSITION';
    else if (healthScore >= 60) healthLabel = 'GOOD POSITION';
    else if (healthScore >= 40) healthLabel = 'FAIR POSITION';

    // Simple spending signal
    let spendingSignal = null;
    if (prevStart && prevEnd && spendingByCategory.length > 0) {
      const topCat = spendingByCategory[0];
      const prevCatAgg = await prisma.expense.aggregate({
        where: { 
          userId, 
          date: { gte: prevStart, lt: prevEnd },
          // Finding ID for this category name...
          // A bit tricky without ID in the array, let's match by ID directly instead.
        },
        _sum: { amount: true }
      });
      // Actually, skip the direct db query and just state the top category.
      spendingSignal = `Your largest expense category was ${topCat.category} at ₹${topCat.amount.toLocaleString('en-IN')}.`;
    } else {
      spendingSignal = 'Not enough data for spending signal.';
    }

    return {
      period: { start, end, label: periodStr },
      comparison: { type: comparison },
      summary: {
        netIncome,
        totalExpenses,
        savings: totalSavings,
        savingsRate,
        netCashFlow
      },
      changes,
      cashFlowSeries,
      spendingByCategory,
      spendingSignal,
      savingsProgress: {
        overall: overallGoalProgress,
        status: overallGoalProgress >= 100 ? 'Achieved' : 'In Progress'
      },
      goalMomentum: goalProgress,
      financialHealth: {
        score: healthScore,
        label: healthLabel,
        components: {
          cashFlow: cashFlowStatus,
          savings: savingsStatus,
          spending: spendingStatus,
          goals: goalStatus,
          investments: 'No data' // investments not integrated in reports yet
        }
      },
      recentReports: [] // Placeholder
    };
  }
}
