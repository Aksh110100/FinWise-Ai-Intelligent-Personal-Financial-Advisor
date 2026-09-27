import { Router, Request, Response } from 'express';
import { prisma } from '../config/prisma';

const router = Router();

router.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'FinWise AI backend is running',
  });
});

router.get('/health/db', async (req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({
      success: true,
      database: 'connected',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      database: 'disconnected',
    });
  }
});

export default router;
