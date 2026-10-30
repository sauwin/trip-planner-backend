import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

vi.mock('../../src/repositories/meta.repository');

import app from '../../src/app';
import * as meta from '../../src/repositories/meta.repository';

const m = <T extends (...a: never[]) => unknown>(fn: T) => fn as unknown as ReturnType<typeof vi.fn>;

describe('GET /api/feature-categories (verejné)', () => {
    beforeEach(() => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    it('vráti kategórie s funkciami bez tokenu', async () => {
        const categories = [{ id: 'c1', key: 'nature', features: [{ id: 'f1', key: 'beach' }] }];
        m(meta.findFeatureCategoriesWithFeatures).mockResolvedValue(categories);
        const res = await request(app).get('/api/feature-categories');

        expect(res.status).toBe(200);
        expect(res.body).toEqual(categories);
    });

    it('chyba DB vráti 500', async () => {
        m(meta.findFeatureCategoriesWithFeatures).mockRejectedValue(new Error('db down'));
        const res = await request(app).get('/api/feature-categories');

        expect(res.status).toBe(500);
        expect(res.body.error).toBe('Failed to fetch feature categories');
    });
});

describe('POST /api/contact', () => {
    const valid = { name: 'Max', email: 'Max@Example.com', subject: 'Otázka', message: 'Dobrý deň, mám otázku k aplikácii.' };

    let freshApp: typeof app;
    let sendContactEmail: ReturnType<typeof vi.fn>;

    beforeEach(async () => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
        vi.resetModules();
        freshApp = (await import('../../src/app')).default;
        sendContactEmail = (await import('../../src/services/email.service')).sendContactEmail as unknown as ReturnType<typeof vi.fn>;
        sendContactEmail.mockResolvedValue(undefined);
    });

    it('odošle správu a normalizuje e-mail na malé písmená', async () => {
        const res = await request(freshApp).post('/api/contact').send(valid);

        expect(res.status).toBe(200);
        expect(res.body).toEqual({ message: 'Message sent' });
        expect(sendContactEmail).toHaveBeenCalledWith({
            name: 'Max',
            email: 'max@example.com',
            subject: 'Otázka',
            message: valid.message,
        });
    });

    it('honeypot: vyplnené pole website vráti úspech, ale e-mail sa neodošle', async () => {
        const res = await request(freshApp).post('/api/contact').send({ ...valid, website: 'http://spam.example' });

        expect(res.status).toBe(200);
        expect(res.body).toEqual({ message: 'Message sent' });
        expect(sendContactEmail).not.toHaveBeenCalled();
    });

    it.each([
        ['krátke meno', { ...valid, name: 'M' }],
        ['neplatný e-mail', { ...valid, email: 'nie-email' }],
        ['krátky predmet', { ...valid, subject: 'ab' }],
        ['krátka správa', { ...valid, message: 'krátka' }],
    ])('odmietne: %s (400)', async (_name, body) => {
        const res = await request(freshApp).post('/api/contact').send(body);

        expect(res.status).toBe(400);
        expect(sendContactEmail).not.toHaveBeenCalled();
    });

    it('chyba odoslania e-mailu vráti 500', async () => {
        sendContactEmail.mockRejectedValueOnce(new Error('smtp down'));
        const res = await request(freshApp).post('/api/contact').send(valid);

        expect(res.status).toBe(500);
        expect(res.body.error).toBe('Failed to send message');
    });

    it('po 5 požiadavkách z jednej IP vráti 429 (rate limit)', async () => {
        const statuses: number[] = [];
        for (let i = 0; i < 6; i++) {
            statuses.push((await request(freshApp).post('/api/contact').send(valid)).status);
        }

        expect(statuses).toEqual([200, 200, 200, 200, 200, 429]);
        expect(sendContactEmail).toHaveBeenCalledTimes(5);
    });

    it('429 má zrozumiteľnú chybu', async () => {
        for (let i = 0; i < 5; i++) await request(freshApp).post('/api/contact').send(valid);
        const res = await request(freshApp).post('/api/contact').send(valid);

        expect(res.body.error).toBe('Too many messages, please try again later');
    });
});