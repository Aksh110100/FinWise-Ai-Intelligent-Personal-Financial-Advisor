import { toolSuccess, toolError, toolNoData, ToolResult } from './tool.types';
import { ExpenseService } from '../../../services/expense.service';

/**
 * expense-analysis.tool.ts
 *
 * Analyses expense data for the authenticated user.
 * REFACTORED to use ExpenseService.getSummary as the single source of truth.
 * Matches UI date filters perfectly to prevent data inconsistency.
 */

export interface CategoryBreakdown {
  name: string;
  amount: number;
  transactionCount: number;
  percentage: number;
}

export interface ExpenseAnalysisData {
  period: string;
  totalSpending: number;
  transactionCount: number;
  dailyAverage: number;
  categoryBreakdown: CategoryBreakdown[];
  topCategory: CategoryBreakdown | null;
  lowestExpense?: { amount: number; merchant: string; date: Date } | null;
  highestExpense?: { amount: number; merchant: string; date: Date } | null;
  currency: string;
}

export async function getExpenseAnalysis(
  userId: string,
  options: {
    period?: string;
    categoryName?: string;
  } = {}
): Promise<ToolResult<ExpenseAnalysisData | null>> {
  try {
    const now = new Date();
    let start = new Date(now);
    let end = new Date(now);
    let periodLabel = '';

    const period = options.period || 'current_month';

    // Match UI date calculation logic exactly
    if (period.startsWith('specific_month_')) {
      const parts = period.split('_');
      const year = parseInt(parts[2], 10);
      const month = parseInt(parts[3], 10); // 1-12
      
      start = new Date(year, month - 1, 1);
      end = new Date(year, month, 1); // 1st of next month
      
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      periodLabel = `${monthNames[month - 1]} ${year}`;
    } else {
      switch (period) {
        case 'previous_month':
          start.setMonth(now.getMonth() - 1);
          start.setDate(1);
          end.setMonth(now.getMonth());
          end.setDate(1);
          periodLabel = 'Previous Month';
          break;
        case 'last_30_days':
          start.setDate(now.getDate() - 30);
          periodLabel = 'Last 30 days';
          break;
        case 'last_90_days':
          start.setDate(now.getDate() - 90);
          periodLabel = 'Last 90 days';
          break;
        case 'current_month':
        default:
          start.setMonth(now.getMonth() - 1);
          periodLabel = 'Last 1 month (Current)';
          break;
      }
    }

    console.log(`[EXPENSE TOOL] Calling ExpenseService.getSummary (User: ${userId}, Start: ${start.toISOString()}, End: ${end.toISOString()})`);
    const qStart = Date.now();
    const summary = await ExpenseService.getSummary(userId, start.toISOString(), end.toISOString());
    console.log(`[PRISMA QUERY] ExpenseService.getSummary completed in ${Date.now() - qStart}ms`);

    if (summary.transactionCount === 0) {
      return toolNoData('expense_analysis');
    }

    // Format breakdown to include percentage and guarantee correct shape
    let categoryBreakdown: CategoryBreakdown[] = summary.categoryBreakdown.map((c: any) => ({
      name: c.name,
      amount: parseFloat(Number(c.amount).toFixed(2)),
      transactionCount: c.count || 0,
      percentage: summary.totalSpending > 0 
        ? parseFloat(((Number(c.amount) / summary.totalSpending) * 100).toFixed(1)) 
        : 0
    }));

    let topCategory = categoryBreakdown[0] || null;
    let totalSpending = summary.totalSpending;
    let transactionCount = summary.transactionCount;
    let dailyAverage = summary.dailyAverage;

    // Filter down to a specific category if requested
    if (options.categoryName) {
      const searchCat = options.categoryName.toLowerCase();
      const specificCat = categoryBreakdown.find(c => c.name.toLowerCase().includes(searchCat));
      
      if (specificCat) {
        // Limit results to just this category
        categoryBreakdown = [specificCat];
        topCategory = specificCat;
        totalSpending = specificCat.amount;
        transactionCount = specificCat.transactionCount;
        dailyAverage = totalSpending / Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86_400_000));
        periodLabel += ` - ${specificCat.name} only`;
      } else {
        // Category not found in the period
        return toolNoData('expense_analysis');
      }
    }

    console.log(`[EXPENSE TOOL] Analysis completed successfully for period: ${periodLabel}`);

    return toolSuccess('expense_analysis', {
      period: periodLabel,
      totalSpending: parseFloat(Number(totalSpending).toFixed(2)),
      transactionCount,
      dailyAverage: parseFloat(Number(dailyAverage).toFixed(2)),
      categoryBreakdown,
      topCategory,
      lowestExpense: summary.lowestExpense,
      highestExpense: summary.highestExpense,
      currency: 'INR',
    });
  } catch (err: any) {
    console.error(`[EXPENSE TOOL] ERROR: ${err.message}`);
    return toolError('expense_analysis', 'Could not retrieve your expense data right now.');
  }
}
