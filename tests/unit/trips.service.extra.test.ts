import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/repositories/trips.repository');

import * as repo from '../../src/repositories/trips.repository';
import { addDestinationToTrip, updateTripDestinationDetails, updateTrip } from '../../src/services/trips.service';

const m = <T extends (...a: never[]) => unknown>(fn: T) => fn as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
    vi.clearAllMocks();
    m(repo.findTripDateRangeForUser).mockResolvedValue({
        startDate: new Date('2026-07-01T00:00:00Z'),
        endDate: new Date('2026-07-10T00:00:00Z'),
    });
    m(repo.findTripDestinationDates).mockResolvedValue({ plannedDateStart: null, plannedDateEnd: null });
    m(repo.findTripDestinationDateRanges).mockResolvedValue([]);
    m(repo.updateTripDestination).mockImplementation(async (_tripId: string, _destinationId: string, details: unknown) => details);
    m(repo.updateTripRecord).mockImplementation(async (_tripId: string, details: unknown) => details);
});

describe('updateTripDestinationDetails – ďalšie vetvy dátumov', () => {
    it('zachová existujúci koniec, ak sa mení iba ubytovanie', async () => {
        const endDate = new Date('2026-07-08T00:00:00Z');
        m(repo.findTripDestinationDates).mockResolvedValue({ plannedDateStart: null, plannedDateEnd: endDate });
        await updateTripDestinationDetails('u1', 't1', 'd1', { accommodationName: 'Hotel' });
        expect(repo.updateTripDestination).toHaveBeenCalled();
    });

    it('vyhodí chybu, ak aktualizovaný začiatok destinácie je pred dátumom cesty', async () => {
        m(repo.findTripDestinationDates).mockResolvedValue({ plannedDateStart: null, plannedDateEnd: null });
        await expect(updateTripDestinationDetails('u1', 't1', 'd1', {
            plannedDateStart: '2026-06-30T00:00:00.000Z',
        })).rejects.toThrow('DESTINATION_DATES_OUTSIDE_TRIP');
    });

    it('vyhodí chybu, ak aktualizovaný koniec destinácie je po dátume cesty', async () => {
        m(repo.findTripDestinationDates).mockResolvedValue({ plannedDateStart: null, plannedDateEnd: null });
        await expect(updateTripDestinationDetails('u1', 't1', 'd1', {
            plannedDateEnd: '2026-07-11T00:00:00.000Z',
        })).rejects.toThrow('DESTINATION_DATES_OUTSIDE_TRIP');
    });

    it('umožní vymazať dátumy destinácie pomocou null', async () => {
        await updateTripDestinationDetails('u1', 't1', 'd1', { plannedDateStart: null, plannedDateEnd: null });
        expect(repo.updateTripDestination).toHaveBeenCalledWith('t1', 'd1', expect.objectContaining({
            plannedDateStart: null,
            plannedDateEnd: null,
        }));
    });
});

describe('updateTrip – ďalšie vetvy rozsahu', () => {
    it('odmietne skrátenie cesty, ak existujúci dátum destinácie bude pred novým začiatkom', async () => {
        m(repo.findTripDestinationDateRanges).mockResolvedValue([{
            plannedDateStart: new Date('2026-07-02T00:00:00Z'),
            plannedDateEnd: new Date('2026-07-03T00:00:00Z'),
        }]);
        await expect(updateTrip('u1', 't1', { startDate: '2026-07-05T00:00:00.000Z' }))
            .rejects.toThrow('TRIP_DATE_RANGE_CONFLICT');
    });

    it('odmietne skrátenie cesty, ak koniec destinácie presahuje nový koniec', async () => {
        m(repo.findTripDestinationDateRanges).mockResolvedValue([{
            plannedDateStart: new Date('2026-07-05T00:00:00Z'),
            plannedDateEnd: new Date('2026-07-09T00:00:00Z'),
        }]);
        await expect(updateTrip('u1', 't1', { endDate: '2026-07-07T00:00:00.000Z' }))
            .rejects.toThrow('TRIP_DATE_RANGE_CONFLICT');
    });
});


describe('trips.service – vetvy bez detailov a bez cesty', () => {
    it('pridá destináciu aj bez voliteľných detailov', async () => {
        m(repo.findTripDateRangeForUser).mockResolvedValue({ startDate: null, endDate: null });
        m(repo.getNextTripDestinationPosition).mockResolvedValue(2);
        m(repo.createTripDestination).mockResolvedValue({ tripId: 't1', destinationId: 'd1', position: 2 });

        await addDestinationToTrip('u1', 't1', 'd1');

        expect(repo.createTripDestination).toHaveBeenCalledWith({
            tripId: 't1',
            destinationId: 'd1',
            position: 2,
        });
    });

    it('vyhodí TRIP_NOT_FOUND pri úprave destinácie neexistujúcej cesty', async () => {
        m(repo.findTripDateRangeForUser).mockResolvedValue(null);

        await expect(
            updateTripDestinationDetails('u1', 'missing-trip', 'd1', { accommodationName: 'Hotel' }),
        ).rejects.toThrow('TRIP_NOT_FOUND');

        expect(repo.findTripDestinationDates).not.toHaveBeenCalled();
    });
});
