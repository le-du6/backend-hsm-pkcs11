import { Router } from 'express';
import { signData } from '../controllers/sign.controller.js';

export const signRouter = Router();
signRouter.post('/', signData);
