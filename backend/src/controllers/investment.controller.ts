import { Request, Response } from 'express';
import { investmentService } from '../services/investment.service';
import { sendSuccess, sendError } from '../utils/response';

export class InvestmentController {
  
  public getInvestments = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).user.id;
      const investments = await investmentService.getInvestments(userId);
      sendSuccess(res, { data: investments });
    } catch (error: any) {
      sendError(res, error.message, 500);
    }
  };

  public getInvestmentById = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).user.id;
      const id = req.params.id;
      const inv = await investmentService.getInvestmentById(userId, id);
      sendSuccess(res, { data: inv });
    } catch (error: any) {
      sendError(res, error.message, 404);
    }
  };

  public createInvestment = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).user.id;
      const data = req.body;
      const inv = await investmentService.createInvestment(userId, data);
      await investmentService.createSnapshot(userId);
      sendSuccess(res, { data: inv }, 'Created successfully', 201);
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  };

  public updateInvestment = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).user.id;
      const id = req.params.id;
      const data = req.body;
      const inv = await investmentService.updateInvestment(userId, id, data);
      await investmentService.createSnapshot(userId);
      sendSuccess(res, { data: inv });
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  };

  public deleteInvestment = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).user.id;
      const id = req.params.id;
      await investmentService.deleteInvestment(userId, id);
      await investmentService.createSnapshot(userId);
      sendSuccess(res, null, 'Deleted successfully');
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  };

  public getSummary = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).user.id;
      const summary = await investmentService.getSummary(userId);
      sendSuccess(res, { data: summary });
    } catch (error: any) {
      sendError(res, error.message, 500);
    }
  };

  public getAllocation = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).user.id;
      const alloc = await investmentService.getAllocation(userId);
      sendSuccess(res, { data: alloc });
    } catch (error: any) {
      sendError(res, error.message, 500);
    }
  };

  public getPerformance = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).user.id;
      const range = (req.query.range as string) || '1M';
      const perf = await investmentService.getPerformance(userId, range);
      sendSuccess(res, { data: perf });
    } catch (error: any) {
      sendError(res, error.message, 500);
    }
  };

  public getPlans = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).user.id;
      const plans = await investmentService.getPlans(userId);
      sendSuccess(res, { data: plans });
    } catch (error: any) {
      sendError(res, error.message, 500);
    }
  };

  public createPlan = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).user.id;
      const data = req.body;
      const plan = await investmentService.createPlan(userId, data);
      sendSuccess(res, { data: plan }, 'Created successfully', 201);
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  };

  public getReview = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).user.id;
      const review = await investmentService.getReview(userId);
      sendSuccess(res, { data: review });
    } catch (error: any) {
      sendError(res, error.message, 500);
    }
  };
}

export const investmentController = new InvestmentController();
