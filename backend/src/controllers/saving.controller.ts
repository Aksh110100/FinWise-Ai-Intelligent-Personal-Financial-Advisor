import { Request, Response } from 'express';
import { SavingService } from '../services/saving.service';
import {
  createSavingSchema,
  updateSavingSchema,
  savingsQuerySchema,
} from '../validators/savings.validators';
import { sendSuccess, sendError } from '../utils/response';
import { GoalService } from '../services/goal.service';
import { ReportService } from '../services/report.service';
import { prisma } from '../config/prisma';

export class SavingController {
  // ── POST /api/savings ────────────────────────────────────────────────────────
  static async createSaving(req: Request, res: Response) {
    try {
      const parsed = createSavingSchema.parse(req.body);
      const userId = (req as any).user.id;
      const saving = await SavingService.createSaving(userId, parsed);
      return sendSuccess(res, { saving }, 'Saving created successfully', 201);
    } catch (error: any) {
      if (error.name === 'ZodError')
        return sendError(res, 'Validation failed', 400, error.errors);
      console.error('createSaving error:', error);
      return sendError(res, 'Internal server error', 500);
    }
  }

  // ── GET /api/savings ─────────────────────────────────────────────────────────
  static async getSavings(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const query  = savingsQuerySchema.parse(req.query);
      const result = await SavingService.getSavings(userId, query);
      return sendSuccess(res, result);
    } catch (error: any) {
      if (error.name === 'ZodError')
        return sendError(res, 'Invalid query parameters', 400, error.errors);
      console.error('getSavings error:', error);
      return sendError(res, 'Internal server error', 500);
    }
  }

  // ── GET /api/savings/summary ─────────────────────────────────────────────────
  static async getSummary(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const month  = req.query.month ? parseInt(req.query.month as string) : undefined;
      const year   = req.query.year  ? parseInt(req.query.year  as string) : undefined;
      const result = await SavingService.getSummary(userId, month, year);
      return sendSuccess(res, result);
    } catch (error) {
      console.error('getSavingsSummary error:', error);
      return sendError(res, 'Internal server error', 500);
    }
  }

  // ── GET /api/savings/growth ──────────────────────────────────────────────────
  static async getGrowth(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const range  = (req.query.range as string) || '1Y';
      const data   = await SavingService.getGrowthData(userId, range);
      return sendSuccess(res, { data });
    } catch (error) {
      console.error('getSavingsGrowth error:', error);
      return sendError(res, 'Internal server error', 500);
    }
  }

  // ── GET /api/savings/breakdown ───────────────────────────────────────────────
  static async getBreakdown(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const month  = req.query.month ? parseInt(req.query.month as string) : undefined;
      const year   = req.query.year  ? parseInt(req.query.year  as string) : undefined;
      const data   = await SavingService.getBreakdown(userId, month, year);
      return sendSuccess(res, { data });
    } catch (error) {
      console.error('getSavingsBreakdown error:', error);
      return sendError(res, 'Internal server error', 500);
    }
  }

  // ── GET /api/savings/:id ─────────────────────────────────────────────────────
  static async getSavingById(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const saving = await SavingService.getSavingById(userId, req.params.id);
      if (!saving) return sendError(res, 'Not found', 404);
      return sendSuccess(res, { saving });
    } catch (error) {
      console.error('getSavingById error:', error);
      return sendError(res, 'Internal server error', 500);
    }
  }

  // ── PATCH /api/savings/:id ───────────────────────────────────────────────────
  static async updateSaving(req: Request, res: Response) {
    try {
      const parsed = updateSavingSchema.parse(req.body);
      const userId = (req as any).user.id;
      const saving = await SavingService.updateSaving(userId, req.params.id, parsed);
      return sendSuccess(res, { saving }, 'Saving updated successfully');
    } catch (error: any) {
      if (error.name === 'ZodError')
        return sendError(res, 'Validation failed', 400, error.errors);
      if (error.message === 'Not found')
        return sendError(res, 'Not found', 404);
      console.error('updateSaving error:', error);
      return sendError(res, 'Internal server error', 500);
    }
  }

  // ── DELETE /api/savings/:id ──────────────────────────────────────────────────
  static async deleteSaving(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      await SavingService.deleteSaving(userId, req.params.id);
      return sendSuccess(res, null, 'Saving deleted successfully');
    } catch (error: any) {
      if (error.message === 'Not found')
        return sendError(res, 'Not found', 404);
      console.error('deleteSaving error:', error);
      return sendError(res, 'Internal server error', 500);
    }
  }

  // ── GET /api/savings/report/pdf ─────────────────────────────────────────────
  static async getSavingsReport(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;

      // Fetch full user from DB so name is never "undefined"
      const dbUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, email: true, currency: true },
      });
      const user = dbUser || { id: userId, name: 'FinWise User', email: '', currency: 'INR' };

      // Core data
      const summary = await SavingService.getSummary(userId);
      const goals   = await GoalService.getGoals(userId);

      const allSavings = await SavingService.getSavings(userId,
        savingsQuerySchema.parse({ page: 1, limit: 10000, sortBy: 'date', sortOrder: 'desc' })
      );
      const transactions = allSavings.data;

      // All-time source breakdown
      const sourceMap = new Map<string, number>();
      transactions.forEach((tx: any) => {
        const src = tx.source || 'OTHER';
        sourceMap.set(src, (sourceMap.get(src) || 0) + Number(tx.amount || 0));
      });
      const allTimeSources = Array.from(sourceMap.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([source, impact]) => ({
          source,
          label: source.charAt(0) + source.slice(1).toLowerCase().replace(/_/g, ' '),
          impact,
        }));

      // Growth (cumulative) data with YYYY-MM keys
      const growthMap = new Map<string, number>();
      transactions.forEach((tx: any) => {
        const d = new Date(tx.date);
        const yyyy = d.getUTCFullYear();
        const mm   = String(d.getUTCMonth() + 1).padStart(2, '0');
        const key  = `${yyyy}-${mm}`;
        growthMap.set(key, (growthMap.get(key) || 0) + Number(tx.amount || 0));
      });
      let cumulative = 0;
      const growth = Array.from(growthMap.entries())
        .sort()
        .map(([key, amt]) => {
          cumulative += amt;
          const [yr, mo] = key.split('-').map(Number);
          const label = new Date(yr, mo - 1, 1).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
          return { key, label, saved: cumulative };
        });

      // Monthly savings with YYYY-MM keys (newest first)
      const monthlyMap = new Map<string, number>();
      transactions.forEach((tx: any) => {
        const d = new Date(tx.date);
        const yyyy = d.getUTCFullYear();
        const mm   = String(d.getUTCMonth() + 1).padStart(2, '0');
        const key  = `${yyyy}-${mm}`;
        monthlyMap.set(key, (monthlyMap.get(key) || 0) + Number(tx.amount || 0));
      });
      const monthlySavings = Array.from(monthlyMap.entries())
        .sort((a, b) => b[0].localeCompare(a[0]))
        .map(([key, amount]) => {
          const [yr, mo] = key.split('-').map(Number);
          const monthLabel = new Date(yr, mo - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
          return { key, monthLabel, amount };
        });

      // Goal-linked savings
      const goalLinkedMap = new Map<string, number>();
      transactions.forEach((tx: any) => {
        if (tx.goalId) {
          goalLinkedMap.set(tx.goalId, (goalLinkedMap.get(tx.goalId) || 0) + Number(tx.amount || 0));
        }
      });
      const goalLinkedSavings = goals
        .map((g: any) => ({ goalId: g.id, goalName: g.name, totalLinked: goalLinkedMap.get(g.id) || 0 }))
        .filter((gl: any) => gl.totalLinked > 0);

      // Unassigned savings
      const unassignedTotal = transactions
        .filter((tx: any) => !tx.goalId)
        .reduce((sum: number, tx: any) => sum + Number(tx.amount || 0), 0);

      // Insights
      const amounts = transactions.map((tx: any) => Number(tx.amount || 0));
      const largestSingle = amounts.length > 0 ? Math.max(...amounts) : 0;
      const averageSaving = amounts.length > 0
        ? amounts.reduce((a: number, b: number) => a + b, 0) / amounts.length : 0;
      const largestSrc = allTimeSources.length > 0 ? allTimeSources[0].label : 'None';

      let bestMonth = '', bestMonthAmt = 0;
      monthlyMap.forEach((amt, key) => { if (amt > bestMonthAmt) { bestMonthAmt = amt; bestMonth = key; } });
      const bestMonthLabel = bestMonth ? (() => {
        const [yr, mo] = bestMonth.split('-').map(Number);
        return new Date(yr, mo - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      })() : '';

      const insights = {
        totalSavings:   summary.totalAllTime,
        largestSource:  largestSrc,
        activeGoals:    goals.filter((g: any) => g.status === 'ACTIVE').length,
        completedGoals: goals.filter((g: any) => g.status === 'COMPLETED').length,
        largestSingle,
        averageSaving:  Math.round(averageSaving),
        mostSavedMonth: bestMonthLabel,
      };

      // Forecast using rolling avg
      const avgM = summary.avgMonthly || 0;
      const currentSaved = summary.totalAllTime || 0;
      const forecast = avgM > 0 ? {
        current:      currentSaved,
        threeMonths:  Math.round(currentSaved + avgM * 3),
        sixMonths:    Math.round(currentSaved + avgM * 6),
        twelveMonths: Math.round(currentSaved + avgM * 12),
      } : null;

      // Period
      let period = 'All-Time';
      if (transactions.length > 0) {
        const dates = transactions
          .map((t: any) => new Date(t.date))
          .filter((d: Date) => !isNaN(d.getTime()));
        if (dates.length > 0) {
          const earliest = new Date(Math.min(...dates.map((d: Date) => d.getTime())));
          const latest   = new Date(Math.max(...dates.map((d: Date) => d.getTime())));
          const fmtD = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
          period = `${fmtD(earliest)} — ${fmtD(latest)}`;
        }
      }

      const snapshot = {
        generatedAt:      new Date().toISOString(),
        user,
        period,
        summary:          { ...summary, prevMonthTotal: summary.prevMonthTotal ?? 0 },
        growth,
        monthlySavings,
        sources:          allTimeSources,
        goals,
        goalLinkedSavings,
        unassignedTotal,
        transactions,
        insights,
        forecast,
      };

      const today    = new Date().toISOString().slice(0, 10);
      const filename = `FinWise-AI-Savings-Report-${today}.pdf`;

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${filename}"`);

      ReportService.generateSavingsReportPDF(snapshot, res);

    } catch (error: any) {
      console.error('getSavingsReport error:', error);
      return sendError(res, 'Internal server error generating report', 500);
    }
  }
}
