import { Response } from 'express';

export const sendSuccess = (res: Response, data: any, message?: string, statusCode = 200) => {
  if (res.headersSent) return;
  return res.status(statusCode).json({
    success: true,
    message,
    ...data,
  });
};

export const sendError = (res: Response, message: string, statusCode = 400, errors?: any) => {
  if (res.headersSent) {
    if (!res.writableEnded) res.end();
    return;
  }
  return res.status(statusCode).json({
    success: false,
    message,
    errors,
  });
};
