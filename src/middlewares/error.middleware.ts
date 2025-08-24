import type { Request, Response, NextFunction } from 'express';
import pino from 'pino';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

export class ApiError extends Error {
  status: number;
  details?: any;
  constructor(status: number, message: string, details?: any) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

// Basic PKCS#11 error mapping placeholder
function mapError(err: any): ApiError {
  if (err instanceof ApiError) return err;
  const message = err?.message || 'Internal Server Error';
  return new ApiError(500, message);
}

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  const apiErr = mapError(err);
  const payload: any = { error: apiErr.message };
  if (process.env.NODE_ENV !== 'production' && apiErr.details) payload.details = apiErr.details;
  logger.error({ err: apiErr, status: apiErr.status }, 'request_error');
  res.status(apiErr.status).json(payload);
}
