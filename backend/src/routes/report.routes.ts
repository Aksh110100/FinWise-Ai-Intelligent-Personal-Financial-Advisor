import { Router } from 'express';
import { ReportController } from '../controllers/report.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

router.use(requireAuth);

router.get('/overview', ReportController.getOverview);
router.post('/pdf', ReportController.generatePDF);

export default router;
