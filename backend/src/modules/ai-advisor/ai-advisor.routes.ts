import { Router } from 'express';
import { AIAdvisorController } from './ai-advisor.controller';
import { requireAuth } from '../../middleware/auth.middleware';

const router = Router();
const aiAdvisorController = new AIAdvisorController();

router.use(requireAuth);

router.post('/chat', aiAdvisorController.chat);
router.get('/conversations', aiAdvisorController.getConversations);
router.get('/conversations/:conversationId', aiAdvisorController.getConversation);
router.delete('/conversations/:conversationId', aiAdvisorController.deleteConversation);
router.patch('/conversations/:conversationId', aiAdvisorController.renameConversation);

export default router;
