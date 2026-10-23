import { Router } from 'express';
import { DashboardController } from '../controllers/dashboard.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

router.use(requireAuth);

router.get('/summary', DashboardController.getSummary);
router.get('/cash-flow', DashboardController.getCashFlow);
router.get('/spending-breakdown', DashboardController.getSpendingBreakdown);
router.get('/insights', DashboardController.getInsights);

export default router;
