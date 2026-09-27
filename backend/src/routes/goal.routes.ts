import { Router } from 'express';
import { GoalController } from '../controllers/goal.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

router.use(requireAuth);

router.post('/', GoalController.createGoal);
router.get('/', GoalController.getGoals);
router.get('/:id', GoalController.getGoalById);
router.patch('/:id', GoalController.updateGoal);
router.delete('/:id', GoalController.deleteGoal);

export default router;
