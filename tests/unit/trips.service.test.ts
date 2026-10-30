import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/repositories/trips.repository');

import {
    addDestinationToTrip,
    updateTrip,
    updateTripDestinationDetails,
    deleteTrip,
    deleteDestinationFromTrip,
    createTrip,
} from '../../src/services/trips.service';
import * as repo from '../../src/repositories/trips.repository';

const m = <T extends (...a: never[]) => unknown>(fn: T) => fn as unknown as ReturnType<typeof vi.fn>;

const trip = { startDate: new Date('2026-07-01T00:00:00Z'), endDate: new Date('2026-07-10T00:00:00Z') };

beforeEach(() => {
    m(repo.findTripDateRangeForUser).mockResolvedValue(trip);
    m(repo.getNextTripDestinationPosition).mockResolvedValue(0);
    m(repo.createTripDestination).mockImplementation(async (d: unknown) => d);
    m(repo.findTripDestinationDateRanges).mockResolvedValue([]);
    m(repo.findTripOwnedByUser).mockResolvedValue({ id: 't1' });
    m(repo.updateTripRecord).mockImplementation(async (_id: string, d: unknown) => d);
});

describe('createTrip', () => {
    it('nastaví peopleCount na 1, ak nie je zadaný', async () => {
        m(repo.createTripRecord).mockImplementation(async (d: unknown) => d);
        const result = (await createTrip('u1', 'Rím')) as unknown as { peopleCount: number; userId: string };
        expect(result.peopleCount).toBe(1);
        expect(result.userId).toBe('u1');
    });

    it('prevedie reťazce dátumov na Date', async () => {
        m(repo.createTripRecord).mockImplementation(async (d: unknown) => d);
        const result = (await createTrip('u1', 'Rím', 500, 2, '2026-07-01T00:00:00.000Z', '2026-07-05T00:00:00.000Z')) as unknown as {
            startDate: Date;
        };
        expect(result.startDate).toBeInstanceOf(Date);
    });
});

describe('addDestinationToTrip', () => {
    it('pridá destináciu s dátumami v rámci cesty a priradí pozíciu', async () => {
        m(repo.getNextTripDestinationPosition).mockResolvedValue(3);
        const result = (await addDestinationToTrip('u1', 't1', 'd1', {
            plannedDateStart: '2026-07-02T00:00:00.000Z',
            plannedDateEnd: '2026-07-04T00:00:00.000Z',
        })) as unknown as { position: number };
        expect(result.position).toBe(3);
        expect(repo.createTripDestination).toHaveBeenCalled();
    });

    it('vyhodí TRIP_NOT_FOUND, ak cesta nepatrí používateľovi', async () => {
        m(repo.findTripDateRangeForUser).mockResolvedValue(null);
        await expect(addDestinationToTrip('u1', 't1', 'd1')).rejects.toThrow('TRIP_NOT_FOUND');
        expect(repo.createTripDestination).not.toHaveBeenCalled();
    });

    it('vyhodí DESTINATION_DATES_OUTSIDE_TRIP, ak začiatok je pred cestou', async () => {
        await expect(
            addDestinationToTrip('u1', 't1', 'd1', { plannedDateStart: '2026-06-01T00:00:00.000Z' }),
        ).rejects.toThrow('DESTINATION_DATES_OUTSIDE_TRIP');
    });

    it('vyhodí DESTINATION_DATES_OUTSIDE_TRIP, ak koniec je po skončení cesty', async () => {
        await expect(
            addDestinationToTrip('u1', 't1', 'd1', { plannedDateEnd: '2026-08-01T00:00:00.000Z' }),
        ).rejects.toThrow('DESTINATION_DATES_OUTSIDE_TRIP');
    });

    it('povolí ľubovoľné dátumy, ak cesta nemá dátumy', async () => {
        m(repo.findTripDateRangeForUser).mockResolvedValue({ startDate: null, endDate: null });
        await expect(
            addDestinationToTrip('u1', 't1', 'd1', { plannedDateStart: '2030-01-01T00:00:00.000Z' }),
        ).resolves.toBeDefined();
    });
});

describe('updateTrip', () => {
    it('vyhodí TRIP_NOT_FOUND pre cudziu cestu', async () => {
        m(repo.findTripDateRangeForUser).mockResolvedValue(null);
        await expect(updateTrip('u1', 't1', { title: 'x' })).rejects.toThrow('TRIP_NOT_FOUND');
    });

    it('vyhodí INVALID_DATE_RANGE, ak koniec je pred začiatkom', async () => {
        await expect(
            updateTrip('u1', 't1', { startDate: '2026-07-10T00:00:00.000Z', endDate: '2026-07-01T00:00:00.000Z' }),
        ).rejects.toThrow('INVALID_DATE_RANGE');
    });

    it('vyhodí TRIP_DATE_RANGE_CONFLICT, ak by zmena vylúčila existujúcu destináciu', async () => {
        m(repo.findTripDestinationDateRanges).mockResolvedValue([
            { plannedDateStart: new Date('2026-07-08T00:00:00Z'), plannedDateEnd: new Date('2026-07-09T00:00:00Z') },
        ]);
        await expect(updateTrip('u1', 't1', { endDate: '2026-07-05T00:00:00.000Z' })).rejects.toThrow(
            'TRIP_DATE_RANGE_CONFLICT',
        );
        expect(repo.updateTripRecord).not.toHaveBeenCalled();
    });

    it('uloží zmenu názvu bez zásahu do dátumov', async () => {
        const result = (await updateTrip('u1', 't1', { title: 'Nový názov' })) as unknown as Record<string, unknown>;
        expect(result.title).toBe('Nový názov');
        expect(result.startDate).toBeUndefined();
    });

    it('umožní vynulovať dátumy hodnotou null', async () => {
        const result = (await updateTrip('u1', 't1', { startDate: null, endDate: null })) as unknown as Record<string, unknown>;
        expect(result.startDate).toBeNull();
        expect(result.endDate).toBeNull();
    });
});

describe('updateTripDestinationDetails', () => {
    it('vyhodí DESTINATION_NOT_FOUND, ak destinácia nie je v ceste', async () => {
        m(repo.findTripDestinationDates).mockResolvedValue(null);
        await expect(updateTripDestinationDetails('u1', 't1', 'd1', { accommodationName: 'Hotel' })).rejects.toThrow(
            'DESTINATION_NOT_FOUND',
        );
    });

    it('vyhodí INVALID_DATE_RANGE, ak koniec je pred začiatkom', async () => {
        m(repo.findTripDestinationDates).mockResolvedValue({ plannedDateStart: null, plannedDateEnd: null });
        await expect(
        updateTripDestinationDetails('u1', 't1', 'd1', {
            plannedDateStart: '2026-07-05T00:00:00.000Z',
            plannedDateEnd: '2026-07-03T00:00:00.000Z',
        }),
        ).rejects.toThrow('INVALID_DATE_RANGE');
    });

    it('zachová existujúci začiatok pri zmene len konca', async () => {
        m(repo.findTripDestinationDates).mockResolvedValue({
            plannedDateStart: new Date('2026-07-05T00:00:00Z'),
            plannedDateEnd: null,
        });
        await expect(
            updateTripDestinationDetails('u1', 't1', 'd1', { plannedDateEnd: '2026-07-03T00:00:00.000Z' }),
        ).rejects.toThrow('INVALID_DATE_RANGE');
    });
});

describe('deleteTrip a deleteDestinationFromTrip', () => {
    it('deleteTrip overí vlastníctvo a odmietne cudziu cestu', async () => {
        m(repo.findTripOwnedByUser).mockResolvedValue(null);
        await expect(deleteTrip('u1', 't1')).rejects.toThrow('TRIP_NOT_FOUND');
        expect(repo.deleteTripRecord).not.toHaveBeenCalled();
    });

    it('deleteTrip zmaže vlastnú cestu', async () => {
        m(repo.deleteTripRecord).mockResolvedValue({ id: 't1' });
        await deleteTrip('u1', 't1');
        expect(repo.deleteTripRecord).toHaveBeenCalledWith('t1');
    });

    it('deleteDestinationFromTrip vyhodí DESTINATION_NOT_FOUND, ak sa nič nezmazalo', async () => {
        m(repo.deleteTripDestination).mockResolvedValue({ count: 0 });
        await expect(deleteDestinationFromTrip('u1', 't1', 'd1')).rejects.toThrow('DESTINATION_NOT_FOUND');
    });

    it('deleteDestinationFromTrip vráti výsledok pri úspešnom zmazaní', async () => {
        m(repo.deleteTripDestination).mockResolvedValue({ count: 1 });
        await expect(deleteDestinationFromTrip('u1', 't1', 'd1')).resolves.toEqual({ count: 1 });
    });
});