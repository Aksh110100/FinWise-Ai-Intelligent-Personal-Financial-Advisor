import { Router } from 'express';
import { ExpenseController } from '../controllers/expense.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

router.use(requireAuth);

router.post('/', ExpenseController.createExpense);
router.get('/', ExpenseController.getExpenses);
router.get('/summary', ExpenseController.getSummary);
router.get('/analytics/spending-overview', ExpenseController.getSpendingOverview);
router.get('/analytics/category-comparison', ExpenseController.getCategoryComparison);
router.get('/analytics/room-to-save', ExpenseController.getRoomToSave);
router.get('/:id', ExpenseController.getExpenseById);
router.patch('/:id', ExpenseController.updateExpense);
router.delete('/:id', ExpenseController.deleteExpense);

export default router;
