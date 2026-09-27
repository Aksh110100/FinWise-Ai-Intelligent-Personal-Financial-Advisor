import { Router } from 'express';
import { SavingController } from '../controllers/saving.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// All savings routes require authentication
router.use(requireAuth);

// Analytics (must be registered before /:id to avoid conflicts)
router.get('/summary',   SavingController.getSummary);
router.get('/growth',    SavingController.getGrowth);
router.get('/breakdown', SavingController.getBreakdown);
router.get('/report/pdf', SavingController.getSavingsReport);

// CRUD
router.post('/',     SavingController.createSaving);
router.get('/',      SavingController.getSavings);
router.get('/:id',   SavingController.getSavingById);
router.patch('/:id', SavingController.updateSaving);
router.delete('/:id', SavingController.deleteSaving);

export default router;
