import pino from 'pino';
import type { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'node:crypto';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

export function loggingMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  const requestId = req.header('X-Request-ID') || randomUUID();
  (req as any).requestId = requestId;
  res.setHeader('X-Request-ID', requestId);
  res.on('finish', () => {
    logger.info(
      {
        req: { method: req.method, url: req.originalUrl },
        res: { statusCode: res.statusCode },
        durationMs: Date.now() - start,
        requestId,
      },
      'request',
    );
  });
  next();
}
