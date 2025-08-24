import pino from 'pino';
import { randomUUID } from 'node:crypto';
const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
export function loggingMiddleware(req, res, next) {
    const start = Date.now();
    const requestId = req.header('X-Request-ID') || randomUUID();
    req.requestId = requestId;
    res.setHeader('X-Request-ID', requestId);
    res.on('finish', () => {
        logger.info({
            req: { method: req.method, url: req.originalUrl },
            res: { statusCode: res.statusCode },
            durationMs: Date.now() - start,
            requestId,
        }, 'request');
    });
    next();
}
//# sourceMappingURL=logging.middleware.js.map