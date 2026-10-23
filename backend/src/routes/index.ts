import { Router } from 'express';
import authRoutes from './auth.routes';
import healthRoutes from './health.routes';
import expenseRoutes from './expense.routes';
import budgetRoutes from './budget.routes';
import savingsRoutes from './savings.routes';
import goalRoutes from './goal.routes';
import reportRoutes from './report.routes';
import investmentRoutes from './investment.routes';
import dashboardRoutes from './dashboard.routes';
import aiAdvisorRoutes from '../modules/ai-advisor/ai-advisor.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/expenses', expenseRoutes);
router.use('/budgets', budgetRoutes);
router.use('/savings', savingsRoutes);
router.use('/goals', goalRoutes);
router.use('/reports', reportRoutes);
router.use('/investments', investmentRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/ai', aiAdvisorRoutes);
router.use('/', healthRoutes); // Has /health and potentially /health/db

export default router;
