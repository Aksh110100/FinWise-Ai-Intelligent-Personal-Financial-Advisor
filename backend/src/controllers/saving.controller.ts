import { Request, Response } from 'express';
import { SavingService } from '../services/saving.service';
import {
  createSavingSchema,
  updateSavingSchema,
  savingsQuerySchema,
} from '../validators/savings.validators';
import { sendSuccess, sendError } from '../utils/response';

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
      const user = (req as any).user;
      
      const { GoalService } = require('../services/goal.service');
      const { ReportService } = require('../services/report.service');
      
      const summary = await SavingService.getSummary(userId);
      const growth = await SavingService.getGrowthData(userId, 'ALL');
      const sources = await SavingService.getBreakdown(userId);
      const goals = await GoalService.getGoals(userId);
      
      const allSavings = await SavingService.getSavings(userId, { page: 1, limit: 10000, sortBy: 'date', sortOrder: 'desc' });
      const transactions = allSavings.data;

      // Build Monthly Savings explicitly with correct year+month logic
      const monthlyMap = new Map<string, number>();
      transactions.forEach((tx: any) => {
        const d = new Date(tx.date);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const key = `${yyyy}-${mm}`;
        monthlyMap.set(key, (monthlyMap.get(key) || 0) + Number(tx.amount || 0));
      });
      
      const monthlySavings = Array.from(monthlyMap.entries())
        .sort((a, b) => b[0].localeCompare(a[0])) // newest first
        .map(([key, amount]) => {
           const [yyyy, mm] = key.split('-');
           const date = new Date(Number(yyyy), Number(mm) - 1, 1);
           const monthLabel = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
           return { monthLabel, amount };
        });

      const snapshot = {
        generatedAt: new Date().toISOString(),
        user,
        summary,
        growth,
        sources,
        goals,
        transactions,
        monthlySavings,
      };

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'inline; filename="FinWise-AI-Savings-Report.pdf"');
      
      ReportService.generateSavingsReportPDF(snapshot, res);
      
    } catch (error: any) {
      console.error('getSavingsReport error:', error);
      return sendError(res, 'Internal server error generating report', 500);
    }
  }
}
