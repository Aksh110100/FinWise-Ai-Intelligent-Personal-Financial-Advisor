import { prisma } from '../config/prisma';
import { Prisma, PaymentMethod } from '@prisma/client';

export class ExpenseService {
  static async getOrCreateCategory(userId: string, categoryName: string) {
    let category = await prisma.category.findFirst({
      where: {
        userId,
        name: categoryName,
        type: 'EXPENSE',
      },
    });

    if (!category) {
      category = await prisma.category.create({
        data: {
          userId,
          name: categoryName,
          type: 'EXPENSE',
          isSystem: false,
          isActive: true,
        },
      });
    }

    return category;
  }

  static async createExpense(userId: string, data: any) {
    let categoryId = data.categoryId;

    if (!categoryId && data.categoryName) {
      const category = await this.getOrCreateCategory(userId, data.categoryName);
      categoryId = category.id;
    }

    return await prisma.expense.create({
      data: {
        userId,
        amount: data.amount,
        merchant: data.merchant || data.categoryName || 'Unknown Merchant',
        description: data.description || data.notes || '',
        date: data.date,
        categoryId: categoryId || undefined,
        paymentMethod: data.paymentMethod,
        notes: data.notes,
        source: 'MANUAL',
        currency: 'INR'
      },
      include: {
        Category: true
      }
    });
  }

  static async getExpenses(userId: string, query: any) {
    const { page, limit, search, categoryId, paymentMethod, from, to, sortBy, sortOrder } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.ExpenseWhereInput = {
      userId,
    };

    if (search) {
      where.OR = [
        { merchant: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (categoryId) where.categoryId = categoryId;
    if (query.categoryName) {
      where.Category = { name: query.categoryName };
    }
    if (paymentMethod) where.paymentMethod = paymentMethod;

    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(from);
      if (to) where.date.lt = new Date(to);
    }

    const [items, total] = await Promise.all([
      prisma.expense.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: { Category: true }
      }),
      prisma.expense.count({ where }),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async getExpenseById(userId: string, id: string) {
    return await prisma.expense.findFirst({
      where: { id, userId },
      include: { Category: true }
    });
  }

  static async updateExpense(userId: string, id: string, data: any) {
    let categoryId = data.categoryId;

    if (data.categoryName && !categoryId) {
      const category = await this.getOrCreateCategory(userId, data.categoryName);
      categoryId = category.id;
    }

    const existing = await prisma.expense.findFirst({ where: { id, userId } });
    if (!existing) return null;

    return await prisma.expense.update({
      where: { id },
      data: {
        amount: data.amount,
        merchant: data.merchant,
        description: data.description,
        notes: data.notes,
        date: data.date,
        categoryId: categoryId || undefined,
        paymentMethod: data.paymentMethod
      },
      include: { Category: true }
    }).catch((e: any) => {
      // Prisma throws P2025 if not found or unauthorized via compound key
      if (e.code === 'P2025') return null;
      throw e;
    });
  }

  static async deleteExpense(userId: string, id: string) {
    const existing = await prisma.expense.findFirst({ where: { id, userId } });
    if (!existing) return false;

    await prisma.expense.delete({
      where: { id }
    });
    return true;
  }

  static async getSummary(userId: string, from?: string, to?: string) {
    const where: Prisma.ExpenseWhereInput = { userId };

    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(from);
      if (to) where.date.lt = new Date(to);
    }

    const expenses = await prisma.expense.findMany({
      where,
      select: { amount: true, date: true, categoryId: true, Category: { select: { name: true } } },
    });

    const totalSpending = expenses.reduce((sum: number, exp: any) => sum + Number(exp.amount), 0);
    
    // Calculate days for daily average
    let days = 1;
    if (from && to) {
      days = Math.max(1, Math.ceil((new Date(to).getTime() - new Date(from).getTime()) / (1000 * 60 * 60 * 24)));
    }
    const dailyAverage = totalSpending / days;

    // Largest category
    const catMap: Record<string, { amount: number, name: string }> = {};
    expenses.forEach((e: any) => {
      if (e.categoryId && e.Category) {
        if (!catMap[e.categoryId]) catMap[e.categoryId] = { amount: 0, name: e.Category.name };
        catMap[e.categoryId].amount += Number(e.amount);
      }
    });

    let largestCategory = null;
    let maxAmt = 0;
    const categoryBreakdown = [];
    for (const [id, cat] of Object.entries(catMap)) {
      categoryBreakdown.push({ name: cat.name, amount: cat.amount });
      if (cat.amount > maxAmt) {
        maxAmt = cat.amount;
        largestCategory = { name: cat.name, amount: cat.amount };
      }
    }

    // Sort breakdown by amount
    categoryBreakdown.sort((a, b) => b.amount - a.amount);

    return {
      totalSpending,
      dailyAverage,
      largestCategory,
      categoryBreakdown,
      transactionCount: expenses.length
    };
  }

  static async getSpendingOverview(userId: string, range: string, categoryName?: string, paymentMethod?: string) {
    const now = new Date();
    let startDate = new Date();

    switch (range.toUpperCase()) {
      case '7D':
        startDate.setDate(now.getDate() - 7);
        break;
      case '1M':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case '3M':
        startDate.setMonth(now.getMonth() - 3);
        break;
      case '6M':
        startDate.setMonth(now.getMonth() - 6);
        break;
      case '1Y':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate.setMonth(now.getMonth() - 1); // Default to 1M
        break;
    }

    const whereClause: any = {
      userId,
      date: {
        gte: startDate,
        lte: now
      }
    };
    
    if (paymentMethod) {
      whereClause.paymentMethod = paymentMethod;
    }
    
    if (categoryName) {
      const category = await prisma.category.findFirst({
        where: { name: categoryName, userId }
      });
      if (category) {
        whereClause.categoryId = category.id;
      } else {
        // If category requested doesn't exist, we just return empty
        whereClause.categoryId = 'non-existent';
      }
    }

    const expenses = await prisma.expense.findMany({
      where: whereClause,
      include: {
        Category: true
      },
      orderBy: {
        date: 'asc'
      }
    });

    const grouped: Record<string, any> = {};

    expenses.forEach(exp => {
      // Use YYYY-MM-DD
      const dateStr = exp.date.toISOString().split('T')[0];
      if (!grouped[dateStr]) {
        grouped[dateStr] = {
          date: dateStr,
          total: 0,
          expenses: []
        };
      }
      const amt = Number(exp.amount);
      grouped[dateStr].total += amt;
      grouped[dateStr].expenses.push({
        id: exp.id,
        description: exp.description || exp.Category?.name || 'Unknown',
        category: exp.Category?.name || 'Uncategorized',
        amount: amt
      });
    });

    // Fill zero days for continuous ranges
    let currentDate = new Date(startDate);
    const endDate = new Date(now);
    const filledData = [];

    while (currentDate <= endDate) {
      const dStr = currentDate.toISOString().split('T')[0];
      if (grouped[dStr]) {
        filledData.push(grouped[dStr]);
      } else {
        filledData.push({
          date: dStr,
          total: 0,
          expenses: []
        });
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return filledData;
  }

  static async getCategoryComparison(userId: string, range: string) {
    const now = new Date();
    let currentStartDate = new Date();
    let historicalStartDate = new Date();
    let comparisonLabel = "three-month average"; // Default

    switch (range.toUpperCase()) {
      case '7D':
        currentStartDate.setDate(now.getDate() - 7);
        historicalStartDate.setDate(currentStartDate.getDate() - 21);
        comparisonLabel = "three-week average";
        break;
      case '1M':
        currentStartDate.setMonth(now.getMonth() - 1);
        historicalStartDate.setMonth(currentStartDate.getMonth() - 3);
        comparisonLabel = "three-month average";
        break;
      case '3M':
        currentStartDate.setMonth(now.getMonth() - 3);
        historicalStartDate.setMonth(currentStartDate.getMonth() - 9);
        comparisonLabel = "three-period average";
        break;
      case '6M':
        currentStartDate.setMonth(now.getMonth() - 6);
        historicalStartDate.setMonth(currentStartDate.getMonth() - 18);
        comparisonLabel = "three-period average";
        break;
      case '1Y':
        currentStartDate.setFullYear(now.getFullYear() - 1);
        historicalStartDate.setFullYear(currentStartDate.getFullYear() - 3);
        comparisonLabel = "three-year average";
        break;
      default:
        currentStartDate.setMonth(now.getMonth() - 1); // Default 1M
        historicalStartDate.setMonth(currentStartDate.getMonth() - 3);
        break;
    }

    const currentExpenses = await prisma.expense.findMany({
      where: {
        userId,
        date: {
          gte: currentStartDate,
          lte: now
        }
      },
      include: { Category: true }
    });

    if (!currentExpenses.length) {
      return { status: 'no_data' };
    }

    const catTotals: Record<string, { total: number, name: string }> = {};
    for (const exp of currentExpenses) {
      const catId = exp.categoryId || 'uncategorized';
      const amt = Number(exp.amount);
      if (!catTotals[catId]) {
        catTotals[catId] = { total: 0, name: exp.Category?.name || 'Uncategorized' };
      }
      catTotals[catId].total += amt;
    }

    let topCatId = '';
    let maxAmt = -1;
    for (const [catId, data] of Object.entries(catTotals)) {
      if (data.total > maxAmt) {
        maxAmt = data.total;
        topCatId = catId;
      }
    }

    const currentTotal = maxAmt;
    const categoryName = catTotals[topCatId].name;

    const historicalExpenses = await prisma.expense.findMany({
      where: {
        userId,
        categoryId: topCatId,
        date: {
          gte: historicalStartDate,
          lt: currentStartDate
        }
      }
    });

    if (!historicalExpenses.length) {
      return { status: 'insufficient_history', category: categoryName };
    }

    let historicalTotal = 0;
    for (const exp of historicalExpenses) {
      historicalTotal += Number(exp.amount);
    }

    const historicalAverage = historicalTotal / 3.0;
    
    if (historicalAverage === 0) {
      return { status: 'insufficient_history', category: categoryName };
    }

    const diff = currentTotal - historicalAverage;
    const pct = (diff / historicalAverage) * 100;

    let direction = 'equal';
    if (diff > 0) direction = 'higher';
    else if (diff < 0) direction = 'lower';

    return {
      status: 'success',
      category: categoryName,
      currentPeriod: {
        label: 'Current',
        amount: currentTotal
      },
      comparison: {
        label: comparisonLabel,
        amount: historicalAverage,
        months: 3
      },
      difference: diff,
      percentageDifference: pct,
      direction
    };
  }

  // ════════════════════════════════════════════════════════════════════════════
  // ROOM TO SAVE — 4-level data readiness system
  // ════════════════════════════════════════════════════════════════════════════
  static async getRoomToSave(userId: string) {
    // ── Thresholds ────────────────────────────────────────────────────────────
    const MIN_EXPENSES      = 10;  // LEVEL 2: minimum transactions
    const MIN_MONTHS        = 2;   // LEVEL 2: minimum distinct calendar months
    const FULL_MONTHS       = 3;   // LEVEL 3: months for full analysis
    const LOOK_BACK_MONTHS  = 6;   // how far back to search for expenses

    // ── Opportunity rates (deterministic; substring match, case-insensitive) ──
    const OPPORTUNITY_RATES: Record<string, number> = {
      food:          0.15,
      dining:        0.15,
      shopping:      0.20,
      subscription:  0.25,
      entertainment: 0.20,
      transport:     0.10,
      travel:        0.10,
      housing:       0.00,
      education:     0.05,
      health:        0.00,
    };
    const DEFAULT_RATE = 0.10;

    // ── Fetch all expenses within the look-back window ────────────────────────
    const now       = new Date();
    const startDate = new Date();
    startDate.setMonth(now.getMonth() - LOOK_BACK_MONTHS);

    const expenses = await prisma.expense.findMany({
      where: {
        userId,
        date: { gte: startDate, lte: now },
      },
      select: {
        id:       true,
        amount:   true,
        date:     true,            // ← transaction date, NOT createdAt
        Category: { select: { name: true } },
      },
      orderBy: { date: 'asc' },
    });

    const expenseCount = expenses.length;

    // ── LEVEL 0 — NO DATA ─────────────────────────────────────────────────────
    if (expenseCount === 0) {
      return {
        readiness: {
          status:             'NO_DATA',
          expenseCount:       0,
          monthsWithData:     0,
          minimumExpenses:    MIN_EXPENSES,
          minimumMonths:      MIN_MONTHS,
          fullAnalysisMonths: FULL_MONTHS,
        },
        potentialMonthlySavings: null,
        currency:   'INR',
        categories: [],
      };
    }

    // ── Count DISTINCT calendar months using transaction date ─────────────────
    // Key format: 'YYYY-MM' — one entry per calendar month that has ≥1 expense.
    // 20 expenses all on 2026-09-27 → monthSet = { '2026-09' } → size = 1.
    const monthSet = new Set<string>();
    for (const exp of expenses) {
      const d = new Date(exp.date);
      monthSet.add(
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      );
    }
    const monthsWithData = monthSet.size;

    // ── LEVEL 1 — INSUFFICIENT HISTORY ───────────────────────────────────────
    if (expenseCount < MIN_EXPENSES || monthsWithData < MIN_MONTHS) {
      return {
        readiness: {
          status:             'INSUFFICIENT_HISTORY',
          expenseCount,
          monthsWithData,
          minimumExpenses:    MIN_EXPENSES,
          minimumMonths:      MIN_MONTHS,
          fullAnalysisMonths: FULL_MONTHS,
        },
        potentialMonthlySavings: null,
        currency:   'INR',
        categories: [],
      };
    }

    // ── LEVEL 2 / 3 — Build per-category totals ───────────────────────────────
    // Use actual distinct months as divisor (capped at FULL_MONTHS) so the
    // monthly average is always based on real observed months, never inflated.
    const divisor = Math.min(monthsWithData, FULL_MONTHS);

    const catTotals: Record<string, number> = {};
    for (const exp of expenses) {
      const catName = exp.Category?.name || 'Uncategorized';
      catTotals[catName] = (catTotals[catName] ?? 0) + Number(exp.amount);
    }

    // ── Calculate opportunity per category ────────────────────────────────────
    const opportunities: {
      category:        string;
      currentAverage:  number;
      potentialSavings: number;
    }[] = [];
    let totalSavings = 0;

    for (const [catName, total] of Object.entries(catTotals)) {
      const monthlyAverage = total / divisor;
      if (monthlyAverage <= 0) continue;

      let rate = DEFAULT_RATE;
      const lower = catName.toLowerCase();
      for (const [key, val] of Object.entries(OPPORTUNITY_RATES)) {
        if (lower.includes(key)) { rate = val; break; }
      }

      const potential = monthlyAverage * rate;
      if (potential > 0) {
        opportunities.push({
          category:         catName,
          currentAverage:   Math.round(monthlyAverage),
          potentialSavings: Math.round(potential),
        });
        totalSavings += potential;
      }
    }

    // Sort by savings desc, keep top 3
    opportunities.sort((a, b) => b.potentialSavings - a.potentialSavings);
    const topOpportunities = opportunities.slice(0, 3);

    // FULL requires ≥ 3 distinct months; PRELIMINARY requires ≥ 2
    const readinessStatus = monthsWithData >= FULL_MONTHS ? 'FULL' : 'PRELIMINARY';

    return {
      readiness: {
        status:             readinessStatus,
        expenseCount,
        monthsWithData,
        minimumExpenses:    MIN_EXPENSES,
        minimumMonths:      MIN_MONTHS,
        fullAnalysisMonths: FULL_MONTHS,
      },
      potentialMonthlySavings: Math.round(totalSavings),
      currency:   'INR',
      categories: topOpportunities,
    };
  }
}
