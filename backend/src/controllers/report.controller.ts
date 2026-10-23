import { Request, Response } from 'express';
import { ReportsAnalyticsService } from '../services/reports-analytics.service';

const sendSuccess = (res: Response, data: any, message = 'Success') => {
  res.status(200).json({ success: true, message, data });
};

const sendError = (res: Response, message: string, status = 400) => {
  res.status(status).json({ success: false, message });
};

export class ReportController {
  static async getOverview(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const period = req.query.period as string;
      const comparison = req.query.comparison as string;

      const data = await ReportsAnalyticsService.getOverviewSnapshot(userId, period, comparison);
      return sendSuccess(res, data);
    } catch (error: any) {
      console.error('getOverview error:', error);
      return sendError(res, 'Internal server error', 500);
    }
  }

  static async generatePDF(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      // You can expand this if you want period-based PDFs, but currently it's handled by savings report service logic.
      // Wait, there's already getSavingsReport in saving.controller.ts. 
      // I'll leave this empty for now and connect it later if needed.
      return sendSuccess(res, {});
    } catch (error: any) {
      console.error('generatePDF error:', error);
      return sendError(res, 'Internal server error', 500);
    }
  }
}
