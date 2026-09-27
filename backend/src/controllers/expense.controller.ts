import { Request, Response } from 'express';
import { sendSuccess, sendError } from '../utils/response';
import { ExpenseService } from '../services/expense.service';
import { createExpenseSchema, updateExpenseSchema, expenseQuerySchema, summaryQuerySchema } from '../validators/expense.validator';
import { ZodError } from 'zod';

export class ExpenseController {
  static async createExpense(req: Request, res: Response) {
    try {
      const parsed = createExpenseSchema.parse(req.body);
      const userId = (req as any).user.id;

      const expense = await ExpenseService.createExpense(userId, parsed);
      return sendSuccess(res, { expense }, 'Expense created successfully', 201);
    } catch (error) {
      if (error instanceof ZodError) {
        return sendError(res, 'Validation error', 400, error.errors);
      }
      console.error('Error creating expense:', error);
      return sendError(res, 'Internal server error: ' + String(error), 500);
    }
  }

  static async getExpenses(req: Request, res: Response) {
    try {
      const parsedQuery = expenseQuerySchema.parse(req.query);
      const userId = (req as any).user.id;

      const result = await ExpenseService.getExpenses(userId, parsedQuery);
      return sendSuccess(res, result);
    } catch (error) {
      if (error instanceof ZodError) {
        return sendError(res, 'Validation error', 400, error.errors);
      }
      console.error('Error fetching expenses:', error);
      return sendError(res, 'Internal server error', 500);
    }
  }

  static async getExpenseById(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const { id } = req.params;

      const expense = await ExpenseService.getExpenseById(userId, id);
      if (!expense) return sendError(res, 'Expense not found', 404);

      return sendSuccess(res, { expense });
    } catch (error) {
      console.error('Error fetching expense:', error);
      return sendError(res, 'Internal server error', 500);
    }
  }

  static async updateExpense(req: Request, res: Response) {
    try {
      const parsed = updateExpenseSchema.parse(req.body);
      const userId = (req as any).user.id;
      const { id } = req.params;

      const updated = await ExpenseService.updateExpense(userId, id, parsed);
      if (!updated) return sendError(res, 'Expense not found', 404);

      return sendSuccess(res, { expense: updated }, 'Expense updated successfully');
    } catch (error) {
      if (error instanceof ZodError) {
        return sendError(res, 'Validation error', 400, error.errors);
      }
      console.error('Error updating expense:', error);
      return sendError(res, 'Internal server error', 500);
    }
  }

  static async deleteExpense(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const { id } = req.params;

      const deleted = await ExpenseService.deleteExpense(userId, id);
      if (!deleted) return sendError(res, 'Expense not found', 404);

      return sendSuccess(res, null, 'Expense deleted successfully');
    } catch (error) {
      console.error('Error deleting expense:', error);
      return sendError(res, 'Internal server error', 500);
    }
  }

  static async getSummary(req: Request, res: Response) {
    try {
      const { from, to } = summaryQuerySchema.parse(req.query);
      const userId = (req as any).user.id;

      const summary = await ExpenseService.getSummary(userId, from, to);
      return sendSuccess(res, summary);
    } catch (error) {
      if (error instanceof ZodError) {
        return sendError(res, 'Validation error', 400, error.errors);
      }
      console.error('Error fetching summary:', error);
      return sendError(res, 'Internal server error', 500);
    }
  }

  static async getSpendingOverview(req: Request, res: Response) {
    try {
      const range = (req.query.range as string) || '1M';
      const categoryName = req.query.categoryName as string;
      const paymentMethod = req.query.paymentMethod as string;
      const userId = (req as any).user.id;

      const overview = await ExpenseService.getSpendingOverview(userId, range, categoryName, paymentMethod);
      return sendSuccess(res, { range, points: overview });
    } catch (error) {
      console.error('Error fetching spending overview:', error);
      return sendError(res, 'Internal server error', 500);
    }
  }

  static async getCategoryComparison(req: Request, res: Response) {
    try {
      const range = (req.query.range as string) || '1M';
      const userId = (req as any).user.id;

      const comparison = await ExpenseService.getCategoryComparison(userId, range);
      return sendSuccess(res, comparison);
    } catch (error) {
      console.error('Error fetching category comparison:', error);
      return sendError(res, 'Internal server error', 500);
    }
  }

  static async getRoomToSave(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const result = await ExpenseService.getRoomToSave(userId);
      return sendSuccess(res, result);
    } catch (error) {
      console.error('Error calculating room to save:', error);
      return sendError(res, 'Internal server error', 500);
    }
  }
}
