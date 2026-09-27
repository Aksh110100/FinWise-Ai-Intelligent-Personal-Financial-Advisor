import { Request, Response } from 'express';
import { GoalService } from '../services/goal.service';
import { createGoalSchema, updateGoalSchema } from '../validators/goal.validators';
import { z } from 'zod';

export class GoalController {
  static async createGoal(req: Request, res: Response) {
    try {
      const input = createGoalSchema.parse(req.body);
      const goal = await GoalService.createGoal((req as any).user!.id, input);
      res.status(201).json({ success: true, data: goal });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(422).json({ success: false, message: 'Validation failed', errors: error.errors });
      }
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async getGoals(req: Request, res: Response) {
    try {
      const goals = await GoalService.getGoals((req as any).user!.id);
      res.json({ success: true, data: { items: goals } });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async getGoalById(req: Request, res: Response) {
    try {
      const goal = await GoalService.getGoalById((req as any).user!.id, req.params.id);
      res.json({ success: true, data: goal });
    } catch (error: any) {
      if (error.message === 'Not found') {
        return res.status(404).json({ success: false, message: 'Goal not found' });
      }
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async updateGoal(req: Request, res: Response) {
    try {
      const input = updateGoalSchema.parse(req.body);
      const goal = await GoalService.updateGoal((req as any).user!.id, req.params.id, input);
      res.json({ success: true, data: goal });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(422).json({ success: false, message: 'Validation failed', errors: error.errors });
      }
      if (error.message === 'Not found') {
        return res.status(404).json({ success: false, message: 'Goal not found' });
      }
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async deleteGoal(req: Request, res: Response) {
    try {
      await GoalService.deleteGoal((req as any).user!.id, req.params.id);
      res.json({ success: true, message: 'Goal deleted successfully' });
    } catch (error: any) {
      if (error.message === 'Not found') {
        return res.status(404).json({ success: false, message: 'Goal not found' });
      }
      res.status(500).json({ success: false, message: error.message });
    }
  }
}
