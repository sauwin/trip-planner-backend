import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

vi.mock('../../src/repositories/trips.repository');
vi.mock('../../src/repositories/expenses.repository');

import app from '../../src/app';
import * as trips from '../../src/repositories/trips.repository';
import * as expenses from '../../src/repositories/expenses.repository';
import { bearer, USER_ID, OTHER_USER_ID, DEST_ID } from '../helpers';

const m = <T extends (...a: never[]) => unknown>(fn: T) => fn as unknown as ReturnType<typeof vi.fn>;

interface FakeTrip {
    id: string;
    userId: string;
    title: string;
    peopleCount: number;
    startDate: Date | null;
    endDate: Date | null;
    budgetTotal?: number;
}
let tripsDb: FakeTrip[];
let expensesDb: Array<{ id: string; tripId: string; description: string; amount: number; category: string }>;
let counter: number;

beforeEach(() => {
    tripsDb = [];
    expensesDb = [];
    counter = 0;

    m(trips.createTripRecord).mockImplementation(async (d: Omit<FakeTrip, 'id'>) => {
        const trip: FakeTrip = { id: `00000000-0000-4000-8000-00000000000${++counter}`, ...d };
        tripsDb.push(trip);
        return trip;
    });
    m(trips.findTripsForUser).mockImplementation(async (userId: string) => tripsDb.filter((t) => t.userId === userId));
    m(trips.findTripForUser).mockImplementation(
        async (userId: string, id: string) => tripsDb.find((t) => t.id === id && t.userId === userId) ?? null,
    );
    m(trips.findTripOwnedByUser).mockImplementation(async (userId: string, id: string) =>
        tripsDb.some((t) => t.id === id && t.userId === userId) ? { id } : null,
    );
    m(trips.findTripDateRangeForUser).mockImplementation(async (userId: string, id: string) => {
        const t = tripsDb.find((x) => x.id === id && x.userId === userId);
        return t ? { startDate: t.startDate, endDate: t.endDate } : null;
    });
    m(trips.deleteTripRecord).mockImplementation(async (id: string) => {
        tripsDb = tripsDb.filter((t) => t.id !== id);
        return { id };
    });
    m(trips.getNextTripDestinationPosition).mockResolvedValue(0);
    m(trips.createTripDestination).mockImplementation(async (d: unknown) => d);
    m(trips.findTripDestinationDateRanges).mockResolvedValue([]);
    m(trips.updateTripRecord).mockImplementation(async (id: string, d: Record<string, unknown>) => {
        const t = tripsDb.find((x) => x.id === id)!;
        Object.assign(t, JSON.parse(JSON.stringify(d)));
        return t;
    });

    m(expenses.createExpenseRecord).mockImplementation(async (d: Record<string, unknown>) => {
        const e = { id: `e${++counter}`, ...d } as (typeof expensesDb)[number];
        expensesDb.push(e);
        return e;
    });
    m(expenses.findTripExpenses).mockImplementation(async (tripId: string) => expensesDb.filter((e) => e.tripId === tripId));
    m(expenses.deleteExpenseRecord).mockImplementation(async (id: string) => {
        expensesDb = expensesDb.filter((e) => e.id !== id);
    });
    });

    async function createTrip(userId = USER_ID, body: object = { title: 'Rím', budgetTotal: 1000, peopleCount: 2 }) {
    return request(app).post('/api/trips').set(bearer(userId)).send(body);
    }

    describe('autentifikácia na /api/trips', () => {
    it.each([
        ['GET', '/api/trips'],
        ['POST', '/api/trips'],
        ['GET', '/api/trips/abc'],
        ['DELETE', '/api/trips/abc'],
    ])('%s %s bez tokenu vráti 401', async (method, url) => {
        const res = await (request(app) as unknown as Record<string, (u: string) => request.Test>)[method.toLowerCase()](url);
        expect(res.status).toBe(401);
    });
    });

    describe('CRUD ciest', () => {
    it('POST vytvorí cestu (201) priradenú prihlásenému používateľovi', async () => {
        const res = await createTrip();
        expect(res.status).toBe(201);
        expect(res.body).toMatchObject({ title: 'Rím', userId: USER_ID, peopleCount: 2 });
    });

    it('POST odmietne prázdny názov (400)', async () => {
        const res = await createTrip(USER_ID, { title: '' });
        expect(res.status).toBe(400);
    });

    it('POST odmietne koniec pred začiatkom (400)', async () => {
        const res = await createTrip(USER_ID, {
            title: 'x',
            startDate: '2026-07-10T00:00:00.000Z',
            endDate: '2026-07-01T00:00:00.000Z',
        });
        expect(res.status).toBe(400);
    });

    it('GET / vráti iba cesty prihláseného používateľa', async () => {
        await createTrip(USER_ID, { title: 'Moja' });
        await createTrip(OTHER_USER_ID, { title: 'Cudzia' });

        const res = await request(app).get('/api/trips').set(bearer());
        expect(res.status).toBe(200);
        expect(res.body.map((t: { title: string }) => t.title)).toEqual(['Moja']);
    });

    it('PATCH zmení názov cesty', async () => {
        const { body: trip } = await createTrip();
        const res = await request(app).patch(`/api/trips/${trip.id}`).set(bearer()).send({ title: 'Nový názov' });

        expect(res.status).toBe(200);
        expect(res.body.title).toBe('Nový názov');
    });

    it('DELETE zmaže vlastnú cestu (204)', async () => {
        const { body: trip } = await createTrip();
        const res = await request(app).delete(`/api/trips/${trip.id}`).set(bearer());

        expect(res.status).toBe(204);
        expect(tripsDb).toHaveLength(0);
    });
    });

    describe('izolácia používateľov (autorizácia na úrovni objektov)', () => {
    it('cudzí používateľ nevidí detail cesty (404)', async () => {
        const { body: trip } = await createTrip(USER_ID);
        const res = await request(app).get(`/api/trips/${trip.id}`).set(bearer(OTHER_USER_ID));
        expect(res.status).toBe(404);
    });

    it('cudzí používateľ nemôže cestu zmazať ani upraviť', async () => {
        const { body: trip } = await createTrip(USER_ID);

        const del = await request(app).delete(`/api/trips/${trip.id}`).set(bearer(OTHER_USER_ID));
        const patch = await request(app).patch(`/api/trips/${trip.id}`).set(bearer(OTHER_USER_ID)).send({ title: 'hack' });

        expect(del.status).toBe(404);
        expect(patch.status).toBe(404);
        expect(tripsDb[0].title).toBe('Rím');
    });

    it('cudzí používateľ nemôže pridať destináciu ani výdavok', async () => {
        const { body: trip } = await createTrip(USER_ID);

        const dest = await request(app)
        .post(`/api/trips/${trip.id}/destinations`)
        .set(bearer(OTHER_USER_ID))
        .send({ destinationId: DEST_ID });
        const exp = await request(app)
        .post(`/api/trips/${trip.id}/expenses`)
        .set(bearer(OTHER_USER_ID))
        .send({ description: 'x', amount: 5 });

        expect(dest.status).toBe(404);
        expect(exp.status).toBe(404);
        expect(expensesDb).toHaveLength(0);
    });
    });

    describe('destinácie v ceste', () => {
    it('POST pridá destináciu (201)', async () => {
        const { body: trip } = await createTrip();
        const res = await request(app)
        .post(`/api/trips/${trip.id}/destinations`)
        .set(bearer())
        .send({ destinationId: DEST_ID, accommodationName: 'Hotel', accommodationPrice: 80 });

        expect(res.status).toBe(201);
        expect(res.body).toMatchObject({ destinationId: DEST_ID, accommodationName: 'Hotel' });
    });

    it('POST odmietne neplatné UUID (400)', async () => {
        const { body: trip } = await createTrip();
        const res = await request(app)
        .post(`/api/trips/${trip.id}/destinations`)
        .set(bearer())
        .send({ destinationId: 'nie-uuid' });
        expect(res.status).toBe(400);
    });

    it('POST odmietne dátumy mimo rozsahu cesty (400)', async () => {
        const { body: trip } = await createTrip(USER_ID, {
            title: 'Rím',
            startDate: '2026-07-01T00:00:00.000Z',
            endDate: '2026-07-10T00:00:00.000Z',
        });
        const res = await request(app)
        .post(`/api/trips/${trip.id}/destinations`)
        .set(bearer())
        .send({ destinationId: DEST_ID, plannedDateStart: '2026-09-01T00:00:00.000Z' });

        expect(res.status).toBe(400);
        expect(res.body.error).toBe('Destination dates must be within the trip dates');
    });

    it('POST vráti 409, ak je destinácia už v ceste (Prisma P2002)', async () => {
        m(trips.createTripDestination).mockRejectedValue({ code: 'P2002' });
        const { body: trip } = await createTrip();
        const res = await request(app).post(`/api/trips/${trip.id}/destinations`).set(bearer()).send({ destinationId: DEST_ID });
        expect(res.status).toBe(409);
    });

    it('DELETE vráti 404, ak destinácia v ceste nie je', async () => {
        m(trips.deleteTripDestination).mockResolvedValue({ count: 0 });
        const { body: trip } = await createTrip();
        const res = await request(app).delete(`/api/trips/${trip.id}/destinations/${DEST_ID}`).set(bearer());
        expect(res.status).toBe(404);
    });

    it('DELETE odstráni destináciu (204)', async () => {
        m(trips.deleteTripDestination).mockResolvedValue({ count: 1 });
        const { body: trip } = await createTrip();
        const res = await request(app).delete(`/api/trips/${trip.id}/destinations/${DEST_ID}`).set(bearer());
        expect(res.status).toBe(204);
    });
    });

    describe('výdavky', () => {
    it('POST vytvorí výdavok s predvolenou kategóriou OTHER', async () => {
        const { body: trip } = await createTrip();
        const res = await request(app)
        .post(`/api/trips/${trip.id}/expenses`)
        .set(bearer())
        .send({ description: 'Taxi', amount: 25 });

        expect(res.status).toBe(201);
        expect(res.body).toMatchObject({ description: 'Taxi', amount: 25, category: 'OTHER' });
    });

    it.each([
        ['nulová suma', { description: 'x', amount: 0 }],
        ['záporná suma', { description: 'x', amount: -5 }],
        ['neznáma kategória', { description: 'x', amount: 5, category: 'PARTY' }],
        ['chýbajúci popis', { amount: 5 }],
    ])('POST odmietne: %s (400)', async (_name, body) => {
        const { body: trip } = await createTrip();
        const res = await request(app).post(`/api/trips/${trip.id}/expenses`).set(bearer()).send(body);
        expect(res.status).toBe(400);
    });

    it('GET vráti výdavky cesty', async () => {
        const { body: trip } = await createTrip();
        await request(app).post(`/api/trips/${trip.id}/expenses`).set(bearer()).send({ description: 'A', amount: 1, category: 'FOOD' });
        await request(app).post(`/api/trips/${trip.id}/expenses`).set(bearer()).send({ description: 'B', amount: 2 });

        const res = await request(app).get(`/api/trips/${trip.id}/expenses`).set(bearer());
        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(2);
    });

    it('DELETE zmaže výdavok (204)', async () => {
        const { body: trip } = await createTrip();
        const { body: expense } = await request(app)
        .post(`/api/trips/${trip.id}/expenses`)
        .set(bearer())
        .send({ description: 'A', amount: 1 });

        const res = await request(app).delete(`/api/trips/${trip.id}/expenses/${expense.id}`).set(bearer());
        expect(res.status).toBe(204);
        expect(expensesDb).toHaveLength(0);
    });
});