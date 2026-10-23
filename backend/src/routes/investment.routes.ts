import { Router } from 'express';
import { investmentController } from '../controllers/investment.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

router.use(requireAuth);

router.get('/summary', investmentController.getSummary);
router.get('/allocation', investmentController.getAllocation);
router.get('/performance', investmentController.getPerformance);
router.get('/review', investmentController.getReview);

router.get('/plans', investmentController.getPlans);
router.post('/plans', investmentController.createPlan);

router.get('/', investmentController.getInvestments);
router.post('/', investmentController.createInvestment);
router.get('/:id', investmentController.getInvestmentById);
router.patch('/:id', investmentController.updateInvestment);
router.delete('/:id', investmentController.deleteInvestment);

export default router;
