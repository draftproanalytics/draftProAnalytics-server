import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../../shared/errors/AppError';
import type { ApiResponse } from '../../shared/types/common';

interface HttpError extends Error {
  statusCode?: number;
  details?: unknown;
}

export const errorHandler = (
  error: HttpError,
  _req: Request,
  res: Response<ApiResponse & { details?: unknown }>,
  _next: NextFunction
): void => {
  if (error instanceof AppError) {
    res.status(error.statusCode).json({ success: false, message: error.message, error: error.message });
    return;
  }

  const statusCode = Number.isInteger(error.statusCode) && (error.statusCode ?? 500) >= 400 && (error.statusCode ?? 500) <= 599
    ? error.statusCode ?? 500
    : 500;
  if (statusCode >= 500) console.error('Unexpected error:', error);
  res.status(statusCode).json({
    success: false,
    message: error.message || 'Internal server error',
    error: statusCode < 500 || process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong',
    ...(error.details === undefined ? {} : { details: error.details }),
  });
};
