import type { Request, Response, NextFunction } from 'express';
import { signService } from '../services/sign.service.js';
import { z } from 'zod';

const signSchema = z.object({
  id: z.string().regex(/^[0-9a-fA-F]+$/),
  data: z.string().min(1),
  encoding: z.enum(['utf8', 'base64']).optional().default('utf8'),
});

export async function signData(req: Request, res: Response, next: NextFunction) {
  try {
    const body = signSchema.parse(req.body);
    const bytes =
      body.encoding === 'base64'
        ? Buffer.from(body.data, 'base64')
        : Buffer.from(body.data, 'utf8');
    const result = await signService.signData(body.id, bytes);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
