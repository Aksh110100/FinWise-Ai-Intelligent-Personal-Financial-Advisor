import { Request, Response } from 'express';
import { sendSuccess, sendError } from '../utils/response';
import { DashboardService } from '../services/dashboard.service';

const VALID_RANGES = new Set(['7D', '1M', '3M', '6M', '1Y', 'THIS_MONTH']);

function validateRange(raw: any): string {
  if (typeof raw !== 'string') return 'THIS_MONTH';
  const upper = raw.toUpperCase();
  return VALID_RANGES.has(upper) ? upper : 'THIS_MONTH';
}

export class DashboardController {
  /**
   * GET /api/dashboard/summary?range=THIS_MONTH
   * Full dashboard summary sourced from persisted records.
   */
  static async getSummary(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const range = validateRange(req.query.range);
      const summary = await DashboardService.getSummary(userId, range);
      return sendSuccess(res, { data: summary });
    } catch (error) {
      console.error('[Dashboard] getSummary error:', error);
      return sendError(res, 'Failed to compute dashboard summary', 500);
    }
  }

  /**
   * GET /api/dashboard/cash-flow?range=1M
   * Income vs expense chart data grouped by day or month.
   */
  static async getCashFlow(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const range = validateRange(req.query.range);
      const data = await DashboardService.getCashFlow(userId, range);
      return sendSuccess(res, { data });
    } catch (error) {
      console.error('[Dashboard] getCashFlow error:', error);
      return sendError(res, 'Failed to compute cash flow data', 500);
    }
  }

  /**
   * GET /api/dashboard/spending-breakdown?range=1M
   * Spending by category for the donut chart.
   */
  static async getSpendingBreakdown(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const range = validateRange(req.query.range);
      const data = await DashboardService.getSpendingBreakdown(userId, range);
      return sendSuccess(res, { data });
    } catch (error) {
      console.error('[Dashboard] getSpendingBreakdown error:', error);
      return sendError(res, 'Failed to compute spending breakdown', 500);
    }
  }

  /**
   * GET /api/dashboard/insights
   * AI insights derived from actual records.
   */
  static async getInsights(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const data = await DashboardService.getInsights(userId);
      return sendSuccess(res, { data });
    } catch (error) {
      console.error('[Dashboard] getInsights error:', error);
      return sendError(res, 'Failed to compute insights', 500);
    }
  }
}
