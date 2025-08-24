import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { loggingMiddleware } from './middlewares/logging.middleware.js';
import { securityHeaders } from './middlewares/security.middleware.js';
import { errorHandler } from './middlewares/error.middleware.js';
import { keysRouter } from './routes/keys.routes.js';
import { signRouter } from './routes/sign.routes.js';
import type { Request, Response } from 'express';

const app = express();

app.use(express.json({ limit: '1mb' }));
app.use(loggingMiddleware);
app.use(securityHeaders);
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(helmet());
app.use(rateLimit({ windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS||900000), max: Number(process.env.RATE_LIMIT_MAX||100) }));

app.get('/api/v1/health', (_req: Request, res: Response) => res.json({ status: 'ok'}));
app.use('/api/v1/keys', keysRouter);
app.use('/api/v1/sign', signRouter);

app.use(errorHandler);

export default app;
