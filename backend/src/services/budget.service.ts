import { prisma } from '../config/prisma';

export class BudgetService {
  static async getOrCreateCategory(userId: string, categoryName: string) {
    let category = await prisma.category.findFirst({
      where: { userId, name: categoryName, type: 'EXPENSE' },
    });
    if (!category) {
      category = await prisma.category.create({
        data: { userId, name: categoryName, type: 'EXPENSE', isSystem: false, isActive: true },
      });
    }
    return category;
  }

  static async createBudget(userId: string, data: any) {
    let categoryId = data.categoryId;
    let name = data.name;

    if (!categoryId && data.categoryName) {
      const category = await BudgetService.getOrCreateCategory(userId, data.categoryName);
      categoryId = category.id;
      if (!name) name = category.name;
    } else if (categoryId) {
      const category = await prisma.category.findFirst({
        where: { id: categoryId, OR: [{ userId }, { isSystem: true }] }
      });
      if (!category) throw new Error('Invalid category');
      if (!name) name = category.name;
    }

    if (!categoryId) throw new Error('Category is required');
    if (!name) name = 'Budget';

    // Check duplicate
    const existing = await prisma.budget.findFirst({
      where: {
        userId,
        categoryId,
        month: data.month,
        year: data.year
      }
    });

    if (existing) {
      throw new Error('A budget already exists for this category and period.');
    }

    return prisma.budget.create({
      data: {
        amount: data.amount,
        month: data.month,
        year: data.year,
        notes: data.notes,
        name,
        categoryId,
        userId
      },
      include: {
        Category: true
      }
    });
  }

  static async getBudgets(userId: string, filters: any = {}) {
    let where: any = { userId };
    
    if (filters.month) where.month = parseInt(filters.month);
    if (filters.year) where.year = parseInt(filters.year);
    if (filters.categoryId) where.categoryId = filters.categoryId;

    const page = parseInt(filters.page) || 1;
    const limit = Math.min(parseInt(filters.limit) || 20, 100);
    const skip = (page - 1) * limit;

    const budgets = await prisma.budget.findMany({
      where,
      include: { Category: true },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' }
    });

    const total = await prisma.budget.count({ where });

    // Calculate actual spent using Expense model
    const enhancedBudgets = await Promise.all(budgets.map(async b => {
      return await BudgetService.calculateBudgetSpending(userId, b);
    }));

    return {
      data: enhancedBudgets,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  static async getBudgetById(userId: string, id: string) {
    const budget = await prisma.budget.findFirst({
      where: { id, userId },
      include: { Category: true }
    });
    
    if (!budget) return null;
    return await BudgetService.calculateBudgetSpending(userId, budget);
  }

  static async updateBudget(userId: string, id: string, data: any) {
    const budget = await prisma.budget.findFirst({ where: { id, userId } });
    if (!budget) throw new Error('Not found');

    let categoryId = data.categoryId;
    let name = data.name;

    if (!categoryId && data.categoryName) {
      const category = await BudgetService.getOrCreateCategory(userId, data.categoryName);
      categoryId = category.id;
      if (!name) name = category.name;
    } else if (categoryId) {
      const category = await prisma.category.findFirst({
        where: { id: categoryId, OR: [{ userId }, { isSystem: true }] }
      });
      if (!category) throw new Error('Invalid category');
      if (!name) name = category.name;
    }

    // Check if new category/period creates duplicate
    const checkMonth = data.month || budget.month;
    const checkYear = data.year || budget.year;
    const checkCat = categoryId || budget.categoryId;

    if (data.month || data.year || categoryId) {
      const duplicate = await prisma.budget.findFirst({
        where: {
          userId,
          categoryId: checkCat,
          month: checkMonth,
          year: checkYear,
          id: { not: id }
        }
      });
      if (duplicate) {
        throw new Error('A budget already exists for this category and period.');
      }
    }

    const updated = await prisma.budget.update({
      where: { id },
      data: {
        amount: data.amount,
        month: data.month,
        year: data.year,
        notes: data.notes,
        name,
        categoryId
      },
      include: { Category: true }
    });

    return await BudgetService.calculateBudgetSpending(userId, updated);
  }

  static async deleteBudget(userId: string, id: string) {
    const budget = await prisma.budget.findFirst({ where: { id, userId } });
    if (!budget) throw new Error('Not found');
    await prisma.budget.delete({ where: { id } });
    return true;
  }

  static async getSummary(userId: string, month?: number, year?: number) {
    const now = new Date();
    const currentMonth = month || (now.getMonth() + 1);
    const currentYear = year || now.getFullYear();

    const budgets = await prisma.budget.findMany({
      where: { userId, month: currentMonth, year: currentYear },
      include: { Category: true }
    });

    if (!budgets.length) {
      return {
        totalBudget: 0,
        totalSpent: 0,
        totalRemaining: 0,
        utilization: 0,
        activeBudgets: 0
      };
    }

    let totalBudget = 0;
    let totalSpent = 0;

    for (const b of budgets) {
      const calc = await BudgetService.calculateBudgetSpending(userId, b);
      totalBudget += Number(b.amount);
      totalSpent += calc.spent;
    }

    const totalRemaining = totalBudget - totalSpent;
    const utilization = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

    return {
      totalBudget,
      totalSpent,
      totalRemaining,
      utilization,
      activeBudgets: budgets.length
    };
  }

  static async calculateBudgetSpending(userId: string, budget: any) {
    const amount = Number(budget.amount);
    
    // Create half-open interval for the month
    // month is 1-indexed in JS dates when set like `new Date(year, monthIndex)`
    // Wait: month is 1-12 here. In Date(), monthIndex is 0-11
    const startDate = new Date(budget.year, budget.month - 1, 1);
    const endDate = new Date(budget.year, budget.month, 1); // first day of next month

    const expenses = await prisma.expense.aggregate({
      _sum: { amount: true },
      where: {
        userId,
        categoryId: budget.categoryId,
        date: {
          gte: startDate,
          lt: endDate
        }
      }
    });

    const spent = Number(expenses._sum.amount || 0);
    const remaining = amount - spent;
    const percentageUsed = amount > 0 ? (spent / amount) * 100 : 0;

    let status = 'UNDER_BUDGET';
    if (percentageUsed > 100) status = 'OVER_BUDGET';
    else if (percentageUsed >= 80) status = 'NEAR_LIMIT';

    // Send formatted date fields just in case UI expects them
    return {
      ...budget,
      amount, // Overwrite with Number instead of Prisma Decimal for JSON
      spent,
      remaining,
      percentageUsed,
      status,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    };
  }

  static async getBudgetVsActual(userId: string, numMonths: number) {
    const data = [];
    const now = new Date();
    
    // We want to generate data for `numMonths` months ending with the current month.
    // e.g., if now is Sep 2026 and numMonths is 6 -> Apr, May, Jun, Jul, Aug, Sep
    for (let i = numMonths - 1; i >= 0; i--) {
      // Create a date for the target month
      const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = targetDate.getFullYear();
      const month = targetDate.getMonth() + 1; // 1-12
      
      const monthNames = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
      const label = monthNames[month - 1];

      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 1);

      // Total Budget for the month
      const budgets = await prisma.budget.findMany({
        where: { userId, month, year }
      });
      const totalBudget = budgets.reduce((sum, b) => sum + Number(b.amount), 0);

      // Total Actual for the month (All expenses)
      const expenses = await prisma.expense.aggregate({
        _sum: { amount: true },
        where: {
          userId,
          date: {
            gte: startDate,
            lt: endDate
          }
        }
      });
      const totalActual = Number(expenses._sum.amount || 0);

      data.push({
        year,
        month,
        label,
        budget: totalBudget,
        actual: totalActual
      });
    }

    return data;
  }
}
