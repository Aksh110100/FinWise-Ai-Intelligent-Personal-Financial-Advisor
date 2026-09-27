import { Request, Response } from 'express';
import { BudgetService } from '../services/budget.service';
import { createBudgetSchema, updateBudgetSchema } from '../validators/budget.validators';
import { sendSuccess, sendError } from '../utils/response';

export class BudgetController {
  static async createBudget(req: Request, res: Response) {
    try {
      const parsed = createBudgetSchema.parse(req.body);
      const userId = (req as any).user.id;
      const budget = await BudgetService.createBudget(userId, parsed);
      return sendSuccess(res, budget, 'Budget created successfully', 201);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return sendError(res, 'Validation failed', 400, error.errors);
      }
      if (error.message === 'A budget already exists for this category and period.' || error.message === 'Invalid category') {
        return sendError(res, error.message, 400);
      }
      console.error(error);
      return sendError(res, 'Internal server error', 500);
    }
  }

  static async getBudgets(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const result = await BudgetService.getBudgets(userId, req.query);
      return sendSuccess(res, result);
    } catch (error) {
      console.error(error);
      return sendError(res, 'Internal server error', 500);
    }
  }

  static async getBudgetById(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const budget = await BudgetService.getBudgetById(userId, req.params.id);
      if (!budget) return sendError(res, 'Not found', 404);
      return sendSuccess(res, budget);
    } catch (error) {
      console.error(error);
      return sendError(res, 'Internal server error', 500);
    }
  }

  static async updateBudget(req: Request, res: Response) {
    try {
      const parsed = updateBudgetSchema.parse(req.body);
      const userId = (req as any).user.id;
      const budget = await BudgetService.updateBudget(userId, req.params.id, parsed);
      return sendSuccess(res, budget, 'Budget updated successfully');
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return sendError(res, 'Validation failed', 400, error.errors);
      }
      if (error.message === 'Not found') return sendError(res, 'Not found', 404);
      if (error.message === 'A budget already exists for this category and period.' || error.message === 'Invalid category') {
        return sendError(res, error.message, 400);
      }
      console.error(error);
      return sendError(res, 'Internal server error', 500);
    }
  }

  static async deleteBudget(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      await BudgetService.deleteBudget(userId, req.params.id);
      return sendSuccess(res, null, 'Budget deleted successfully');
    } catch (error: any) {
      if (error.message === 'Not found') return sendError(res, 'Not found', 404);
      console.error(error);
      return sendError(res, 'Internal server error', 500);
    }
  }

  static async getSummary(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const month = req.query.month ? parseInt(req.query.month as string) : undefined;
      const year = req.query.year ? parseInt(req.query.year as string) : undefined;
      const summary = await BudgetService.getSummary(userId, month, year);
      return sendSuccess(res, summary);
    } catch (error) {
      console.error(error);
      return sendError(res, 'Internal server error', 500);
    }
  }

  static async getBudgetVsActual(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const months = req.query.months ? parseInt(req.query.months as string) : 6;
      const data = await BudgetService.getBudgetVsActual(userId, months);
      return sendSuccess(res, { data });
    } catch (error) {
      console.error('Error in getBudgetVsActual:', error);
      return sendError(res, 'Internal server error', 500);
    }
  }
}
