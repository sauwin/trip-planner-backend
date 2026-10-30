import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

vi.mock('../../src/repositories/trips.repository');
vi.mock('../../src/repositories/expenses.repository');

import app from '../../src/app';
import * as trips from '../../src/repositories/trips.repository';
import * as expenses from '../../src/repositories/expenses.repository';
import { bearer, USER_ID, OTHER_USER_ID, TRIP_ID } from '../helpers';

const m = <T extends (...a: never[]) => unknown>(fn: T) => fn as unknown as ReturnType<typeof vi.fn>;

const EXPENSE_ID = '77777777-7777-4777-8777-777777777777';
const url = `/api/trips/${TRIP_ID}/expenses/${EXPENSE_ID}`;

beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    m(trips.findTripOwnedByUser).mockImplementation(async (userId: string, id: string) =>
        userId === USER_ID && id === TRIP_ID ? { id } : null,
    );
    m(expenses.updateExpenseRecord).mockImplementation(async (id: string, tripId: string, data: object) => ({
        id,
        tripId,
        ...data,
    }));
    m(expenses.deleteExpenseRecord).mockResolvedValue(undefined);
    m(expenses.createExpenseRecord).mockImplementation(async (d: object) => ({ id: EXPENSE_ID, ...d }));
});

describe('PATCH /api/trips/:tripId/expenses/:expenseId', () => {
    it('bez tokenu vráti 401', async () => {
        const res = await request(app).patch(url).send({ amount: 10 });
        expect(res.status).toBe(401);
    });

    it('upraví popis, sumu a kategóriu', async () => {
        const res = await request(app)
            .patch(url)
            .set(bearer())
            .send({ description: 'Večera', amount: 30, category: 'FOOD' });

        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({ id: EXPENSE_ID, description: 'Večera', amount: 30, category: 'FOOD' });
        expect(expenses.updateExpenseRecord).toHaveBeenCalledWith(EXPENSE_ID, TRIP_ID, {
            description: 'Večera',
            amount: 30,
            category: 'FOOD',
        });
    });

    it('čiastočná úprava (iba suma) je povolená', async () => {
        const res = await request(app).patch(url).set(bearer()).send({ amount: 12.5 });

        expect(res.status).toBe(200);
        expect(m(expenses.updateExpenseRecord).mock.calls[0][2]).toMatchObject({ amount: 12.5 });
    });

    it('cudzí používateľ nemôže upraviť výdavok cudzej cesty (404)', async () => {
        const res = await request(app).patch(url).set(bearer(OTHER_USER_ID)).send({ amount: 1 });

        expect(res.status).toBe(404);
        expect(res.body.error).toBe('Trip not found');
        expect(expenses.updateExpenseRecord).not.toHaveBeenCalled();
    });

    it('404, ak výdavok neexistuje (Prisma P2025)', async () => {
        m(expenses.updateExpenseRecord).mockRejectedValue({ code: 'P2025' });
        const res = await request(app).patch(url).set(bearer()).send({ amount: 5 });

        expect(res.status).toBe(404);
        expect(res.body.error).toBe('Expense not found');
    });

    it.each([
        ['nulová suma', { amount: 0 }],
        ['záporná suma', { amount: -3 }],
        ['suma ako text', { amount: '10' }],
        ['prázdny popis', { description: '' }],
        ['neznáma kategória', { category: 'PARTY' }],
    ])('odmietne: %s (400)', async (_name, body) => {
        const res = await request(app).patch(url).set(bearer()).send(body);

        expect(res.status).toBe(400);
        expect(expenses.updateExpenseRecord).not.toHaveBeenCalled();
    });

    it('neznáma chyba DB vráti 500', async () => {
        m(expenses.updateExpenseRecord).mockRejectedValue(new Error('boom'));
        const res = await request(app).patch(url).set(bearer()).send({ amount: 5 });

        expect(res.status).toBe(500);
        expect(res.body.error).toBe('Failed to update expense');
    });
});

describe('ďalšie vetvy výdavkov', () => {
    it('POST s dátumom ho prevedie na Date', async () => {
        const res = await request(app)
            .post(`/api/trips/${TRIP_ID}/expenses`)
            .set(bearer())
            .send({ description: 'Múzeum', amount: 15, category: 'ACTIVITIES', date: '2026-07-02T10:00:00.000Z' });

        expect(res.status).toBe(201);
        const saved = m(expenses.createExpenseRecord).mock.calls[0][0];
        expect(saved.date).toEqual(new Date('2026-07-02T10:00:00.000Z'));
        expect(saved.category).toBe('ACTIVITIES');
    });

    it('POST odmietne neplatný formát dátumu (400)', async () => {
        const res = await request(app)
            .post(`/api/trips/${TRIP_ID}/expenses`)
            .set(bearer())
            .send({ description: 'x', amount: 1, date: 'včera' });
        expect(res.status).toBe(400);
    });

    it('POST/GET: chyba DB vráti 500', async () => {
        m(expenses.createExpenseRecord).mockRejectedValue(new Error('boom'));
        m(expenses.findTripExpenses).mockRejectedValue(new Error('boom'));

        const post = await request(app).post(`/api/trips/${TRIP_ID}/expenses`).set(bearer()).send({ description: 'x', amount: 1 });
        const get = await request(app).get(`/api/trips/${TRIP_ID}/expenses`).set(bearer());

        expect(post.status).toBe(500);
        expect(get.status).toBe(500);
    });

    it('GET cudzej cesty vráti 404', async () => {
        const res = await request(app).get(`/api/trips/${TRIP_ID}/expenses`).set(bearer(OTHER_USER_ID));
        expect(res.status).toBe(404);
    });

    it('DELETE: 404 pre cudziu cestu a pre neexistujúci výdavok (P2025)', async () => {
        const foreign = await request(app).delete(url).set(bearer(OTHER_USER_ID));
        m(expenses.deleteExpenseRecord).mockRejectedValue({ code: 'P2025' });
        const missing = await request(app).delete(url).set(bearer());

        expect(foreign.status).toBe(404);
        expect(missing.status).toBe(404);
        expect(missing.body.error).toBe('Expense not found');
    });

    it('DELETE: neznáma chyba vráti 500', async () => {
        m(expenses.deleteExpenseRecord).mockRejectedValue(new Error('boom'));
        const res = await request(app).delete(url).set(bearer());
        expect(res.status).toBe(500);
    });
});