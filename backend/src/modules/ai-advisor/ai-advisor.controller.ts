import { Request, Response } from 'express';
import { AIAdvisorService } from './ai-advisor.service';

const aiAdvisorService = new AIAdvisorService();

export class AIAdvisorController {
  
  async chat(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const result = await aiAdvisorService.processChat(userId, req.body);
      res.status(200).json(result);
    } catch (error: any) {
      if (error.message === 'Message is required and must not be empty' || error.message.includes('Message is too long')) {
        return res.status(400).json({ success: false, message: error.message });
      }
      if (error.message === 'Conversation not found') {
        return res.status(404).json({ success: false, message: error.message });
      }
      res.status(500).json({ success: false, message: error.message || 'Internal server error' });
    }
  }

  async getConversations(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const conversations = await aiAdvisorService.getConversations(userId);
      res.status(200).json({ success: true, data: conversations });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || 'Internal server error' });
    }
  }

  async getConversation(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const { conversationId } = req.params;
      const conversation = await aiAdvisorService.getConversation(userId, conversationId);
      res.status(200).json({ success: true, data: conversation });
    } catch (error: any) {
      if (error.message === 'Conversation not found') {
        return res.status(404).json({ success: false, message: error.message });
      }
      res.status(500).json({ success: false, message: error.message || 'Internal server error' });
    }
  }

  async deleteConversation(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const { conversationId } = req.params;
      const result = await aiAdvisorService.deleteConversation(userId, conversationId);
      res.status(200).json(result);
    } catch (error: any) {
      if (error.message === 'Conversation not found') {
        return res.status(404).json({ success: false, message: error.message });
      }
      res.status(500).json({ success: false, message: error.message || 'Internal server error' });
    }
  }

  async renameConversation(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const { conversationId } = req.params;
      const { title } = req.body;
      const result = await aiAdvisorService.renameConversation(userId, conversationId, title);
      res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      if (error.message === 'Conversation not found') {
        return res.status(404).json({ success: false, message: error.message });
      }
      if (error.message.includes('Title must be a non-empty string')) {
        return res.status(400).json({ success: false, message: error.message });
      }
      res.status(500).json({ success: false, message: error.message || 'Internal server error' });
    }
  }
}
