import { Router } from 'express';
import { createKey, listKeys, getKey, deleteKey } from '../controllers/keys.controller.js';

export const keysRouter = Router();
keysRouter.post('/', createKey);
keysRouter.get('/', listKeys);
keysRouter.get('/:id', getKey);
keysRouter.delete('/:id', deleteKey);
