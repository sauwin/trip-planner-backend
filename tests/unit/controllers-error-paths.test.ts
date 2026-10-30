import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/services/admin.service');
vi.mock('../../src/services/auth.service');
vi.mock('../../src/services/destinations.service');
vi.mock('../../src/services/expenses.service');
vi.mock('../../src/services/interactions.service');
vi.mock('../../src/services/preferences.service');
vi.mock('../../src/services/reviews.service');
vi.mock('../../src/services/trips.service');

import * as adminService from '../../src/services/admin.service';
import * as authService from '../../src/services/auth.service';
import * as destinationsService from '../../src/services/destinations.service';
import * as expensesService from '../../src/services/expenses.service';
import * as interactionsService from '../../src/services/interactions.service';
import * as preferencesService from '../../src/services/preferences.service';
import * as reviewsService from '../../src/services/reviews.service';
import * as tripsService from '../../src/services/trips.service';

import { listManagedUsers, updateManagedUser } from '../../src/controllers/admin.controller';
import { register, currentUser, login, refresh, forgotPassword, resetPasswordHandler, logout } from '../../src/controllers/auth.controller';
import {
    listDestinations, searchDestinations, getDestination, createDestinationHandler,
    updateDestinationHandler, deleteDestinationHandler as deleteSavedDestinationHandler, getSavedDestination,
} from '../../src/controllers/destinations.controller';
import {
    createExpenseHandler, listExpensesHandler, updateExpenseHandler, deleteExpenseHandler,
} from '../../src/controllers/expenses.controller';
import {
    recordInteractionHandler, removeInteractionHandler, listInteractions, getDestinationStatusHandler,
} from '../../src/controllers/interactions.controller';
import { savePreferences, getPreferences } from '../../src/controllers/preferences.controller';
import {
    listDestinationReviews, createReview, updateReview, deleteOwnReview, adminDeleteReview,
} from '../../src/controllers/reviews.controller';
import {
    createTripHandler, listTripsHandler, getTripHandler, addDestinationHandler,
    updateTripDestinationDetailsHandler, deleteTripHandler, deleteDestinationHandler, updateTripHandler,
} from '../../src/controllers/trips.controller';

const m = <T extends (...a: never[]) => unknown>(fn: T) => fn as unknown as ReturnType<typeof vi.fn>;

function response() {
    const res: any = { status: vi.fn(), json: vi.fn(), send: vi.fn() };
    res.status.mockReturnValue(res);
    res.json.mockReturnValue(res);
    res.send.mockReturnValue(res);
    return res;
}

function request(data: Record<string, any> = {}) {
    return {
        body: {},
        params: {},
        validatedQuery: {},
        userId: 'u1',
        ...data,
    } as any;
}

beforeEach(() => {
    vi.clearAllMocks();
});

describe('admin.controller – chybové vetvy', () => {
    it('spracuje chybu pri vyhľadávaní používateľov', async () => {
        m(adminService.searchManagedUsers).mockRejectedValue(new Error('db error'));
        const res = response();
        await listManagedUsers(request(), res);
        expect(res.status).toHaveBeenCalledWith(500);
    });

    it('odmietne neplatné id používateľa', async () => {
        const res = response();
        await updateManagedUser(request({ params: { id: ['bad', 'id'] } }), res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ error: 'Invalid user id' });
    });

    it.each(['USER_NOT_FOUND', 'CANNOT_CHANGE_SELF', 'LAST_SUPER_ADMIN', 'SUPER_ADMIN_MANAGEMENT_DISABLED'])(
        'namapuje chybu %s pri zmene roly', async (error) => {
            m(adminService.changeManagedUserRole).mockRejectedValue(new Error(error));
            const res = response();
            await updateManagedUser(request({ params: { id: 'u2' }, body: { role: 'ADMIN' } }), res);
            expect(res.status).toHaveBeenCalled();
        },
    );
});

describe('auth.controller – chybové vetvy', () => {
    it('namapuje chybu registrácie', async () => {
        m(authService.registerUser).mockRejectedValue(new Error('EMAIL_TAKEN'));
        const res = response();
        await register(request({ body: { email: 'a@b.sk', password: 'Password123', username: 'A' } }), res);
        expect(res.status).toHaveBeenCalledWith(409);
    });

    it('vráti 401, ak aktuálny používateľ už neexistuje', async () => {
        m(authService.getAuthenticatedUser).mockResolvedValue(null);
        const res = response();
        await currentUser(request(), res);
        expect(res.status).toHaveBeenCalledWith(401);
    });

    it('spracuje chybu pri načítaní aktuálneho používateľa', async () => {
        m(authService.getAuthenticatedUser).mockRejectedValue(new Error('db error'));
        const res = response();
        await currentUser(request(), res);
        expect(res.status).toHaveBeenCalledWith(500);
    });

    it('namapuje nesprávne prihlasovacie údaje', async () => {
        m(authService.loginUser).mockRejectedValue(new Error('INVALID_CREDENTIALS'));
        const res = response();
        await login(request({ body: { email: 'a@b.sk', password: 'bad' } }), res);
        expect(res.status).toHaveBeenCalledWith(401);
    });

    it('odmietne refresh bez tokenu', async () => {
        const res = response();
        await refresh(request(), res);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it('namapuje neplatný refresh token', async () => {
        m(authService.refreshTokens).mockRejectedValue(new Error('INVALID_REFRESH_TOKEN'));
        const res = response();
        await refresh(request({ body: { refreshToken: 'bad' } }), res);
        expect(res.status).toHaveBeenCalledWith(401);
    });

    it('neprezradí chybu pri požiadavke na obnovu hesla', async () => {
        m(authService.requestPasswordReset).mockRejectedValue(new Error('mail down'));
        vi.spyOn(console, 'error').mockImplementation(() => {});
        const res = response();
        await forgotPassword(request({ body: { email: 'a@b.sk' } }), res);
        expect(res.json).toHaveBeenCalledWith({ message: 'If this email is registered, a reset link has been sent.' });
    });

    it('namapuje neplatný reset token', async () => {
        m(authService.resetPassword).mockRejectedValue(new Error('INVALID_RESET_TOKEN'));
        const res = response();
        await resetPasswordHandler(request({ body: { token: 'bad', newPassword: 'Password123' } }), res);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it('spracuje chybu pri odhlásení', async () => {
        m(authService.logoutUser).mockRejectedValue(new Error('db error'));
        const res = response();
        await logout(request({ body: { refreshToken: 'token' } }), res);
        expect(res.status).toHaveBeenCalledWith(500);
    });
});

describe('destinations.controller – chybové vetvy', () => {
    it('spracuje chybu pri načítaní a vyhľadávaní destinácií', async () => {
        m(destinationsService.getAllDestinations).mockRejectedValue(new Error('db error'));
        m(destinationsService.searchDestinations).mockRejectedValue(new Error('db error'));
        const listRes = response();
        await listDestinations(request({ validatedQuery: {} }), listRes);
        expect(listRes.status).toHaveBeenCalledWith(500);
        const searchRes = response();
        await searchDestinations(request({ validatedQuery: {} }), searchRes);
        expect(searchRes.status).toHaveBeenCalledWith(500);
    });

    it('vráti 400 pre pole id a 404 pre neexistujúcu destináciu', async () => {
        const badRes = response();
        await getDestination(request({ params: { id: ['x', 'y'] } }), badRes);
        expect(badRes.status).toHaveBeenCalledWith(400);

        m(destinationsService.getDestinationById).mockResolvedValue(null);
        const missingRes = response();
        await getDestination(request({ params: { id: 'missing' } }), missingRes);
        expect(missingRes.status).toHaveBeenCalledWith(404);
    });

    it('spracuje chybu pri načítaní detailu destinácie', async () => {
        m(destinationsService.getDestinationById).mockRejectedValue(new Error('db error'));
        const res = response();
        await getDestination(request({ params: { id: 'd1' } }), res);
        expect(res.status).toHaveBeenCalledWith(500);
    });

    it.each(['P2002', 'INVALID_DESTINATION_FEATURES'])(
        'namapuje chybu %s pri vytváraní destinácie', async (error) => {
            m(destinationsService.createDestination).mockRejectedValue(new Error(error));
            const res = response();
            await createDestinationHandler(request(), res);
            expect(res.status).toHaveBeenCalled();
        },
    );

    it('odmietne neplatné id pri aktualizácii a odstránení', async () => {
        const updateRes = response();
        await updateDestinationHandler(request({ params: { id: ['bad', 'id'] } }), updateRes);
        expect(updateRes.status).toHaveBeenCalledWith(400);
        const deleteRes = response();
        await deleteSavedDestinationHandler(request({ params: { id: ['bad', 'id'] } }), deleteRes);
        expect(deleteRes.status).toHaveBeenCalledWith(400);
    });

    it.each(['P2002', 'P2025', 'INVALID_DESTINATION_FEATURES'])(
        'namapuje chybu %s pri aktualizácii destinácie', async (error) => {
            m(destinationsService.updateDestination).mockRejectedValue(new Error(error));
            const res = response();
            await updateDestinationHandler(request({ params: { id: 'd1' } }), res);
            expect(res.status).toHaveBeenCalled();
        },
    );

    it('namapuje P2025 pri mazaní a chybu pri načítaní uložených destinácií', async () => {
        m(destinationsService.deleteDestination).mockRejectedValue(new Error('P2025'));
        const deleteRes = response();
        await deleteSavedDestinationHandler(request({ params: { id: 'd1' } }), deleteRes);
        expect(deleteRes.status).toHaveBeenCalledWith(404);

        m(destinationsService.getSavedDestinations).mockRejectedValue(new Error('db error'));
        const savedRes = response();
        await getSavedDestination(request(), savedRes);
        expect(savedRes.status).toHaveBeenCalledWith(500);
    });
});

describe('expenses.controller – chybové vetvy', () => {
    it('odmietne prázdne id cesty alebo výdavku', async () => {
        const createRes = response();
        await createExpenseHandler(request({ params: { tripId: [] } }), createRes);
        expect(createRes.status).toHaveBeenCalledWith(400);

        const updateRes = response();
        await updateExpenseHandler(request({ params: { tripId: 't1', expenseId: [] } }), updateRes);
        expect(updateRes.status).toHaveBeenCalledWith(400);

        const deleteRes = response();
        await deleteExpenseHandler(request({ params: { tripId: 't1', expenseId: [] } }), deleteRes);
        expect(deleteRes.status).toHaveBeenCalledWith(400);
    });

    it('spracuje chyby služieb pri vytvorení, načítaní, úprave a mazaní', async () => {
        m(expensesService.createExpense).mockRejectedValue(new Error('TRIP_NOT_FOUND'));
        const createRes = response();
        await createExpenseHandler(request({ params: { tripId: 't1' } }), createRes);
        expect(createRes.status).toHaveBeenCalledWith(404);

        m(expensesService.getTripExpenses).mockRejectedValue(new Error('TRIP_NOT_FOUND'));
        const listRes = response();
        await listExpensesHandler(request({ params: { tripId: 't1' } }), listRes);
        expect(listRes.status).toHaveBeenCalledWith(404);

        m(expensesService.updateExpense).mockRejectedValue({ code: 'P2025' });
        const updateRes = response();
        await updateExpenseHandler(request({ params: { tripId: 't1', expenseId: 'e1' } }), updateRes);
        expect(updateRes.status).toHaveBeenCalledWith(404);

        m(expensesService.deleteExpense).mockRejectedValue({ code: 'P2025' });
        const deleteRes = response();
        await deleteExpenseHandler(request({ params: { tripId: 't1', expenseId: 'e1' } }), deleteRes);
        expect(deleteRes.status).toHaveBeenCalledWith(404);
    });
});

describe('interactions.controller – chybové vetvy', () => {
    it('odmietne neplatný typ pri zaznamenaní a odstránení interakcie', async () => {
        const recordRes = response();
        await recordInteractionHandler(request({ body: { destinationId: 'd1', type: 'INVALID' } }), recordRes);
        expect(recordRes.status).toHaveBeenCalledWith(400);

        const removeRes = response();
        await removeInteractionHandler(request({ params: { destinationId: 'd1', type: 'INVALID' } }), removeRes);
        expect(removeRes.status).toHaveBeenCalledWith(400);
    });

    it('namapuje chyby pri vytváraní a odstraňovaní interakcie', async () => {
        m(interactionsService.recordInteraction).mockRejectedValue({ code: 'P2003' });
        const recordRes = response();
        await recordInteractionHandler(request({ body: { destinationId: 'd1', type: 'VIEW' } }), recordRes);
        expect(recordRes.status).toHaveBeenCalledWith(404);

        m(interactionsService.removeInteraction).mockRejectedValue(new Error('NOT_REMOVABLE'));
        const removeRes = response();
        await removeInteractionHandler(request({ params: { destinationId: 'd1', type: 'VIEW' } }), removeRes);
        expect(removeRes.status).toHaveBeenCalledWith(400);
    });

    it('spracuje chyby pri načítaní interakcií a stavu destinácie', async () => {
        m(interactionsService.getUserInteractions).mockRejectedValue(new Error('db error'));
        const listRes = response();
        await listInteractions(request(), listRes);
        expect(listRes.status).toHaveBeenCalledWith(500);

        m(interactionsService.getDestinationStatus).mockRejectedValue(new Error('db error'));
        const statusRes = response();
        await getDestinationStatusHandler(request({ params: { destinationId: 'd1' } }), statusRes);
        expect(statusRes.status).toHaveBeenCalledWith(500);
    });
});

describe('preferences.controller – chybové vetvy', () => {
    it('vráti 401, ak chýba userId', async () => {
        const res = response();
        await savePreferences(request({ userId: undefined }), res);
        expect(res.status).toHaveBeenCalledWith(401);
    });

    it.each(['USER_NOT_FOUND', 'INVALID_PREFERENCES'])(
        'namapuje chybu %s pri ukladaní preferencií', async (error) => {
            m(preferencesService.saveUserPreferences).mockRejectedValue(new Error(error));
            const res = response();
            await savePreferences(request({ body: { preferences: [] } }), res);
            expect(res.status).toHaveBeenCalled();
        },
    );

    it('spracuje chybu pri načítaní preferencií', async () => {
        m(preferencesService.getUserPreferences).mockRejectedValue(new Error('db error'));
        const res = response();
        await getPreferences(request(), res);
        expect(res.status).toHaveBeenCalledWith(500);
    });
});

describe('reviews.controller – chybové vetvy', () => {
    it('odmietne neplatné id destinácie a recenzie', async () => {
        const listRes = response();
        await listDestinationReviews(request({ params: { destinationId: ['d1', 'd2'] } }), listRes);
        expect(listRes.status).toHaveBeenCalledWith(400);

        const createRes = response();
        await createReview(request({ params: { destinationId: ['d1', 'd2'] } }), createRes);
        expect(createRes.status).toHaveBeenCalledWith(400);

        const updateRes = response();
        await updateReview(request({ params: { reviewId: ['r1', 'r2'] } }), updateRes);
        expect(updateRes.status).toHaveBeenCalledWith(400);

        const ownDeleteRes = response();
        await deleteOwnReview(request({ params: { reviewId: ['r1', 'r2'] } }), ownDeleteRes);
        expect(ownDeleteRes.status).toHaveBeenCalledWith(400);

        const adminDeleteRes = response();
        await adminDeleteReview(request({ params: { reviewId: ['r1', 'r2'] } }), adminDeleteRes);
        expect(adminDeleteRes.status).toHaveBeenCalledWith(400);
    });

    it('namapuje konfliktnú a chýbajúcu destináciu pri vytváraní recenzie', async () => {
        m(reviewsService.addDestinationReview).mockRejectedValue({ code: 'P2002' });
        const duplicateRes = response();
        await createReview(request({ params: { destinationId: 'd1' } }), duplicateRes);
        expect(duplicateRes.status).toHaveBeenCalledWith(409);

        m(reviewsService.addDestinationReview).mockRejectedValue({ code: 'P2003' });
        const missingRes = response();
        await createReview(request({ params: { destinationId: 'd1' } }), missingRes);
        expect(missingRes.status).toHaveBeenCalledWith(404);
    });

    it('vráti 404, ak recenzia pri úprave alebo mazaní neexistuje', async () => {
        m(reviewsService.editDestinationReview).mockResolvedValue(null);
        const updateRes = response();
        await updateReview(request({ params: { reviewId: 'r1' } }), updateRes);
        expect(updateRes.status).toHaveBeenCalledWith(404);

        m(reviewsService.removeDestinationReview).mockResolvedValue(null);
        const ownDeleteRes = response();
        await deleteOwnReview(request({ params: { reviewId: 'r1' } }), ownDeleteRes);
        expect(ownDeleteRes.status).toHaveBeenCalledWith(404);

        const adminDeleteRes = response();
        await adminDeleteReview(request({ params: { reviewId: 'r1' } }), adminDeleteRes);
        expect(adminDeleteRes.status).toHaveBeenCalledWith(404);
    });

    it('namapuje P2025 pri úprave recenzie', async () => {
        m(reviewsService.editDestinationReview).mockRejectedValue({ code: 'P2025' });
        const res = response();
        await updateReview(request({ params: { reviewId: 'r1' } }), res);
        expect(res.status).toHaveBeenCalledWith(404);
    });

    it('spracuje chyby pri načítaní a mazaní recenzií', async () => {
        m(reviewsService.getDestinationReviews).mockRejectedValue(new Error('db error'));
        const listRes = response();
        await listDestinationReviews(request({ params: { destinationId: 'd1' } }), listRes);
        expect(listRes.status).toHaveBeenCalledWith(500);

        m(reviewsService.removeDestinationReview).mockRejectedValue(new Error('db error'));
        const ownDeleteRes = response();
        await deleteOwnReview(request({ params: { reviewId: 'r1' } }), ownDeleteRes);
        expect(ownDeleteRes.status).toHaveBeenCalledWith(500);

        const adminDeleteRes = response();
        await adminDeleteReview(request({ params: { reviewId: 'r1' } }), adminDeleteRes);
        expect(adminDeleteRes.status).toHaveBeenCalledWith(500);
    });
});

describe('trips.controller – chybové vetvy', () => {
    it('spracuje chybu pri vytvorení a načítaní ciest', async () => {
        m(tripsService.createTrip).mockRejectedValue(new Error('db error'));
        const createRes = response();
        await createTripHandler(request({ body: { title: 'Trip' } }), createRes);
        expect(createRes.status).toHaveBeenCalledWith(500);

        m(tripsService.getUserTrips).mockRejectedValue(new Error('db error'));
        const listRes = response();
        await listTripsHandler(request(), listRes);
        expect(listRes.status).toHaveBeenCalledWith(500);
    });

    it('odmietne prázdne id a vráti 404 pre neexistujúcu cestu', async () => {
        const invalidRes = response();
        await getTripHandler(request({ params: { id: [] } }), invalidRes);
        expect(invalidRes.status).toHaveBeenCalledWith(400);

        m(tripsService.getTripById).mockResolvedValue(null);
        const missingRes = response();
        await getTripHandler(request({ params: { id: 't1' } }), missingRes);
        expect(missingRes.status).toHaveBeenCalledWith(404);
    });

    it('namapuje chyby pri pridávaní destinácie do cesty', async () => {
        m(tripsService.addDestinationToTrip).mockRejectedValue(new Error('DESTINATION_DATES_OUTSIDE_TRIP'));
        const dateRes = response();
        await addDestinationHandler(request({ params: { id: 't1' }, body: { destinationId: 'd1' } }), dateRes);
        expect(dateRes.status).toHaveBeenCalledWith(400);

        m(tripsService.addDestinationToTrip).mockRejectedValue({ code: 'P2002' });
        const duplicateRes = response();
        await addDestinationHandler(request({ params: { id: 't1' }, body: { destinationId: 'd1' } }), duplicateRes);
        expect(duplicateRes.status).toHaveBeenCalledWith(409);
    });

    it('odmietne chýbajúce id pri úprave detailov destinácie', async () => {
        const tripIdRes = response();
        await updateTripDestinationDetailsHandler(request({ params: { id: [], destinationId: 'd1' } }), tripIdRes);
        expect(tripIdRes.status).toHaveBeenCalledWith(400);

        const destinationIdRes = response();
        await updateTripDestinationDetailsHandler(request({ params: { id: 't1', destinationId: [] } }), destinationIdRes);
        expect(destinationIdRes.status).toHaveBeenCalledWith(400);
    });

    it('namapuje chyby pri úprave detailov destinácie', async () => {
        m(tripsService.updateTripDestinationDetails).mockRejectedValue(new Error('DESTINATION_NOT_FOUND'));
        const res = response();
        await updateTripDestinationDetailsHandler(request({ params: { id: 't1', destinationId: 'd1' } }), res);
        expect(res.status).toHaveBeenCalledWith(404);
    });

    it('namapuje neplatný rozsah dátumov pri úprave detailov destinácie', async () => {
        m(tripsService.updateTripDestinationDetails).mockRejectedValue(new Error('INVALID_DATE_RANGE'));
        const res = response();
        await updateTripDestinationDetailsHandler(request({ params: { id: 't1', destinationId: 'd1' } }), res);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it('odmietne prázdne id pri mazaní cesty alebo destinácie', async () => {
        const tripRes = response();
        await deleteTripHandler(request({ params: { id: [] } }), tripRes);
        expect(tripRes.status).toHaveBeenCalledWith(400);

        const destinationRes = response();
        await deleteDestinationHandler(request({ params: { id: 't1', destinationId: [] } }), destinationRes);
        expect(destinationRes.status).toHaveBeenCalledWith(400);
    });

    it('namapuje chyby pri mazaní destinácie a aktualizácii cesty', async () => {
        m(tripsService.deleteDestinationFromTrip).mockRejectedValue(new Error('DESTINATION_NOT_FOUND'));
        const deleteRes = response();
        await deleteDestinationHandler(request({ params: { id: 't1', destinationId: 'd1' } }), deleteRes);
        expect(deleteRes.status).toHaveBeenCalledWith(404);

        m(tripsService.updateTrip).mockRejectedValue(new Error('TRIP_DATE_RANGE_CONFLICT'));
        const updateRes = response();
        await updateTripHandler(request({ params: { id: 't1' } }), updateRes);
        expect(updateRes.status).toHaveBeenCalledWith(400);
    });

    it('spracuje chybu pri mazaní cesty a chýbajúcu cestu pri aktualizácii', async () => {
        m(tripsService.deleteTrip).mockRejectedValue(new Error('TRIP_NOT_FOUND'));
        const deleteRes = response();
        await deleteTripHandler(request({ params: { id: 't1' } }), deleteRes);
        expect(deleteRes.status).toHaveBeenCalledWith(404);

        m(tripsService.updateTrip).mockRejectedValue(new Error('TRIP_NOT_FOUND'));
        const updateRes = response();
        await updateTripHandler(request({ params: { id: 't1' } }), updateRes);
        expect(updateRes.status).toHaveBeenCalledWith(404);
    });
});


describe('trips.controller – úspešné vetvy', () => {
    it('vráti detail existujúcej cesty', async () => {
        const trip = { id: 't1', title: 'Rím' };
        m(tripsService.getTripById).mockResolvedValue(trip);
        const res = response();

        await getTripHandler(request({ params: { id: 't1' } }), res);

        expect(res.json).toHaveBeenCalledWith(trip);
    });

    it('vráti aktualizované detaily destinácie', async () => {
        const result = { tripId: 't1', destinationId: 'd1', accommodationName: 'Hotel' };
        m(tripsService.updateTripDestinationDetails).mockResolvedValue(result);
        const res = response();

        await updateTripDestinationDetailsHandler(
            request({ params: { id: 't1', destinationId: 'd1' }, body: { accommodationName: 'Hotel' } }),
            res,
        );

        expect(res.json).toHaveBeenCalledWith(result);
    });
});
