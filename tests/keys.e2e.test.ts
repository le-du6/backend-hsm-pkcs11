import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';

// Ces tests ne couvrent pas l'interaction réelle PKCS#11 sans module chargé.
// Ils vérifient pour l'instant la route health comme placeholder.

describe('Health', () => {
  it('GET /api/v1/health', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});
