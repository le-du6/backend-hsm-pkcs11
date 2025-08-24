import type { Request, Response, NextFunction } from 'express';
import { keyService } from '../services/key.service.js';
import { z } from 'zod';

const createSchema = z.object({
  label: z.string().min(1).optional(),
  id: z
    .string()
    .regex(/^[0-9a-fA-F]+$/)
    .optional(),
  curve: z.literal('P-256').optional(),
});

export async function createKey(req: Request, res: Response, next: NextFunction) {
  try {
    const body = createSchema.parse(req.body);
    const result = await keyService.createECKeyPair(body);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

export async function listKeys(_req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await keyService.listKeys());
  } catch (err) {
    next(err);
  }
}

export async function getKey(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await keyService.getKeyById(req.params.id));
  } catch (err) {
    next(err);
  }
}

export async function deleteKey(req: Request, res: Response, next: NextFunction) {
  try {
    await keyService.deleteKeyById(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
