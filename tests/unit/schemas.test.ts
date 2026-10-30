import { describe, it, expect } from 'vitest';
import { registerSchema, loginSchema, resetPasswordSchema, forgotPasswordSchema } from '../../src/schemas/auth.schema';
import { createTripSchema, updateTripSchema, addDestinationSchema, updateTripDestinationDetailsSchema } from '../../src/schemas/trips.schema';
import { createExpenseSchema } from '../../src/schemas/expenses.schema';
import { listRecommendationsQuerySchema } from '../../src/schemas/recommendation.schema';
import { listDestinationsQuerySchema } from '../../src/schemas/destinations.schema';

describe('auth schémy', () => {
    const valid = { email: ' User@Example.COM ', username: 'Max', password: 'Heslo1234' };

    it('registerSchema normalizuje e-mail (trim + lowercase)', () => {
        const r = registerSchema.parse(valid);
        expect(r.email).toBe('user@example.com');
    });

    it.each([
        ['krátke heslo', 'Ab1'],
        ['bez veľkého písmena', 'heslo1234'],
        ['bez čísla', 'HesloHeslo'],
    ])('registerSchema odmietne heslo: %s', (_name, password) => {
        expect(registerSchema.safeParse({ ...valid, password }).success).toBe(false);
    });

    it('registerSchema odmietne neplatný e-mail', () => {
        expect(registerSchema.safeParse({ ...valid, email: 'not-an-email' }).success).toBe(false);
    });

    it('registerSchema odmietne príliš krátke aj príliš dlhé meno', () => {
        expect(registerSchema.safeParse({ ...valid, username: 'M' }).success).toBe(false);
        expect(registerSchema.safeParse({ ...valid, username: 'x'.repeat(31) }).success).toBe(false);
    });

    it('loginSchema vyžaduje neprázdne heslo', () => {
        expect(loginSchema.safeParse({ email: 'a@b.sk', password: '' }).success).toBe(false);
        expect(loginSchema.safeParse({ email: 'a@b.sk', password: 'x' }).success).toBe(true);
    });

    it('resetPasswordSchema uplatňuje rovnaké pravidlá silného hesla', () => {
        expect(resetPasswordSchema.safeParse({ token: 't', newPassword: 'slabe' }).success).toBe(false);
        expect(resetPasswordSchema.safeParse({ token: 't', newPassword: 'Silne1234' }).success).toBe(true);
    });

    it('forgotPasswordSchema vyžaduje platný e-mail', () => {
        expect(forgotPasswordSchema.safeParse({ email: 'zle' }).success).toBe(false);
    });
});

describe('trips schémy', () => {
    it('createTripSchema akceptuje len názov', () => {
        expect(createTripSchema.safeParse({ title: 'Rím' }).success).toBe(true);
    });

    it('createTripSchema odmietne prázdny názov a záporný rozpočet', () => {
        expect(createTripSchema.safeParse({ title: '   ' }).success).toBe(false);
        expect(createTripSchema.safeParse({ title: 'x', budgetTotal: -5 }).success).toBe(false);
    });

    it('createTripSchema odmietne desatinný počet ľudí', () => {
        expect(createTripSchema.safeParse({ title: 'x', peopleCount: 1.5 }).success).toBe(false);
    });

    it('createTripSchema odmietne koniec pred začiatkom', () => {
        const r = createTripSchema.safeParse({
            title: 'x',
            startDate: '2026-07-10T00:00:00.000Z',
            endDate: '2026-07-01T00:00:00.000Z',
        });
        expect(r.success).toBe(false);
    });

    it('updateTripSchema povolí null pre dátumy a rozpočet', () => {
        expect(updateTripSchema.safeParse({ startDate: null, endDate: null, budgetTotal: null }).success).toBe(true);
    });

    it('addDestinationSchema vyžaduje UUID a platnú URL ubytovania', () => {
        expect(addDestinationSchema.safeParse({ destinationId: 'nie-uuid' }).success).toBe(false);
        expect(
            addDestinationSchema.safeParse({ destinationId: '44444444-4444-4444-8444-444444444444', accommodationUrl: 'zle' })
            .success,
        ).toBe(false);
        expect(
            addDestinationSchema.safeParse({ destinationId: '44444444-4444-4444-8444-444444444444', accommodationPrice: 0 })
            .success,
        ).toBe(true);
    });
});

describe('expenses schéma', () => {
    it('odmietne nulovú sumu a neznámu kategóriu', () => {
        expect(createExpenseSchema.safeParse({ description: 'x', amount: 0 }).success).toBe(false);
        expect(createExpenseSchema.safeParse({ description: 'x', amount: 5, category: 'PARTY' }).success).toBe(false);
    });

    it('akceptuje platný výdavok', () => {
        expect(createExpenseSchema.safeParse({ description: 'Obed', amount: 12.5, category: 'FOOD' }).success).toBe(true);
    });
});

describe('recommendation query schéma', () => {
    it('použije predvolené hodnoty limit=10 a offset=0', () => {
        const r = listRecommendationsQuerySchema.parse({});
        expect(r.limit).toBe(10);
        expect(r.offset).toBe(0);
        expect(r.featureIds).toBeUndefined();
    });

    it('prevedie reťazce na čísla a rozdelí featureIds', () => {
        const r = listRecommendationsQuerySchema.parse({ limit: '5', offset: '2', featureIds: 'a, b ,,c' });
        expect(r).toMatchObject({ limit: 5, offset: 2, featureIds: ['a', 'b', 'c'] });
    });

    it('odmietne limit mimo rozsahu 1 až 50', () => {
        expect(listRecommendationsQuerySchema.safeParse({ limit: '0' }).success).toBe(false);
        expect(listRecommendationsQuerySchema.safeParse({ limit: '51' }).success).toBe(false);
    });
});
describe('ďalšie vetvy dátumových schém', () => {
    it('updateTripSchema odmietne koniec cesty pred začiatkom', () => {
        const result = updateTripSchema.safeParse({
            startDate: '2026-07-10T00:00:00.000Z',
            endDate: '2026-07-01T00:00:00.000Z',
        });
        expect(result.success).toBe(false);
    });

    it('addDestinationSchema odmietne koniec destinácie pred začiatkom', () => {
        const result = addDestinationSchema.safeParse({
            destinationId: '44444444-4444-4444-8444-444444444444',
            plannedDateStart: '2026-07-10T00:00:00.000Z',
            plannedDateEnd: '2026-07-01T00:00:00.000Z',
        });
        expect(result.success).toBe(false);
    });

    it('updateTripDestinationDetailsSchema odmietne nesprávny rozsah dátumov', () => {
        const result = updateTripDestinationDetailsSchema.safeParse({
            plannedDateStart: '2026-07-10T00:00:00.000Z',
            plannedDateEnd: '2026-07-01T00:00:00.000Z',
        });
        expect(result.success).toBe(false);
    });
});

describe('featureIds transform – prázdne hodnoty', () => {
    it('destinations schema prevedie prázdny zoznam na undefined', () => {
        expect(listDestinationsQuerySchema.parse({ featureIds: ' , , ' }).featureIds).toBeUndefined();
        expect(listDestinationsQuerySchema.parse({ featureIds: '' }).featureIds).toBeUndefined();
    });

    it('recommendation schema prevedie prázdny zoznam na undefined', () => {
        expect(listRecommendationsQuerySchema.parse({ featureIds: ' , ' }).featureIds).toBeUndefined();
        expect(listRecommendationsQuerySchema.parse({ featureIds: '' }).featureIds).toBeUndefined();
    });
});
