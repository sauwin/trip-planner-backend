import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';

describe('app – predvolená FRONTEND_URL', () => {
    it('použije localhost:5173, ak FRONTEND_URL nie je nastavená', async () => {
        const frontendUrl = process.env.FRONTEND_URL;
        process.env.FRONTEND_URL = '';
        vi.resetModules();
        const { default: app } = await import('../../src/app');

        const res = await request(app).get('/api/health').set('Origin', 'http://localhost:5173');
        expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');

        process.env.FRONTEND_URL = frontendUrl;
    });
});
