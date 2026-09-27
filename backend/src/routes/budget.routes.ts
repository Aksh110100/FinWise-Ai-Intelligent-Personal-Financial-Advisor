import { Router } from 'express';
import { BudgetController } from '../controllers/budget.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

router.use(requireAuth);

router.post('/', BudgetController.createBudget);
router.get('/', BudgetController.getBudgets);
router.get('/summary', BudgetController.getSummary);
router.get('/analytics/budget-vs-actual', BudgetController.getBudgetVsActual);
router.get('/:id', BudgetController.getBudgetById);
router.patch('/:id', BudgetController.updateBudget);
router.delete('/:id', BudgetController.deleteBudget);

export default router;
