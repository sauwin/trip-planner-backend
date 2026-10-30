import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/repositories/admin.repository');
vi.mock('../../src/repositories/preferences.repository');

import * as adminRepo from '../../src/repositories/admin.repository';
import * as preferencesRepo from '../../src/repositories/preferences.repository';
import { changeManagedUserRole, searchManagedUsers } from '../../src/services/admin.service';
import { getUserPreferences, saveUserPreferences } from '../../src/services/preferences.service';

const m = <T extends (...a: never[]) => unknown>(fn: T) => fn as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
    vi.clearAllMocks();
});

describe('admin.service', () => {
    it('vyhľadá používateľov aj bez filtra', async () => {
        m(adminRepo.findManagedUsers).mockResolvedValue([]);
        await expect(searchManagedUsers()).resolves.toEqual([]);
        expect(adminRepo.findManagedUsers).toHaveBeenCalledWith(undefined);
    });

    it('vyhodí USER_NOT_FOUND pre neexistujúceho používateľa', async () => {
        m(adminRepo.findManagedUser).mockResolvedValue(null);
        await expect(changeManagedUserRole('admin', 'missing', 'USER')).rejects.toThrow('USER_NOT_FOUND');
    });

    it('nedovolí meniť vlastnú rolu', async () => {
        m(adminRepo.findManagedUser).mockResolvedValue({ id: 'admin', role: 'ADMIN' });
        await expect(changeManagedUserRole('admin', 'admin', 'USER')).rejects.toThrow('CANNOT_CHANGE_SELF');
    });

    it('nedovolí zmeniť rolu poslednému SUPER_ADMIN', async () => {
        m(adminRepo.findManagedUser).mockResolvedValue({ id: 'root', role: 'SUPER_ADMIN' });
        m(adminRepo.countSuperAdmins).mockResolvedValue(1);
        await expect(changeManagedUserRole('admin', 'root', 'ADMIN')).rejects.toThrow('LAST_SUPER_ADMIN');
    });

    it('nedovolí spravovať SUPER_ADMIN, ak existuje viacero super adminov', async () => {
        m(adminRepo.findManagedUser).mockResolvedValue({ id: 'root', role: 'SUPER_ADMIN' });
        m(adminRepo.countSuperAdmins).mockResolvedValue(2);
        await expect(changeManagedUserRole('admin', 'root', 'ADMIN')).rejects.toThrow('SUPER_ADMIN_MANAGEMENT_DISABLED');
    });

    it('neaktualizuje používateľa, ak už má požadovanú rolu', async () => {
        const user = { id: 'u2', role: 'ADMIN' };
        m(adminRepo.findManagedUser).mockResolvedValue(user);
        await expect(changeManagedUserRole('root', 'u2', 'ADMIN')).resolves.toBe(user);
        expect(adminRepo.updateManagedUserRole).not.toHaveBeenCalled();
    });
});

describe('preferences.service', () => {
    const preferences = [{ categoryId: 'cat1', featureId: 'feature1' }];

    it('odmietne duplicitnú kombináciu kategórie a funkcie', async () => {
        await expect(saveUserPreferences('u1', [...preferences, ...preferences])).rejects.toThrow('INVALID_PREFERENCES');
        expect(preferencesRepo.findUserId).not.toHaveBeenCalled();
    });

    it('vyhodí USER_NOT_FOUND, ak používateľ neexistuje', async () => {
        m(preferencesRepo.findUserId).mockResolvedValue(null);
        await expect(saveUserPreferences('missing', preferences)).rejects.toThrow('USER_NOT_FOUND');
    });

    it('odmietne funkciu, ktorá patrí do inej kategórie', async () => {
        m(preferencesRepo.findUserId).mockResolvedValue({ id: 'u1' });
        m(preferencesRepo.findFeaturesByIds).mockResolvedValue([{ id: 'feature1', categoryId: 'other-category' }]);
        await expect(saveUserPreferences('u1', preferences)).rejects.toThrow('INVALID_PREFERENCES');
        expect(preferencesRepo.replaceUserPreferences).not.toHaveBeenCalled();
    });

    it('uloží platné preferencie', async () => {
        m(preferencesRepo.findUserId).mockResolvedValue({ id: 'u1' });
        m(preferencesRepo.findFeaturesByIds).mockResolvedValue([{ id: 'feature1', categoryId: 'cat1' }]);
        m(preferencesRepo.replaceUserPreferences).mockResolvedValue([{ categoryId: 'cat1', featureId: 'feature1' }]);
        await expect(saveUserPreferences('u1', preferences)).resolves.toEqual(preferences);
        expect(preferencesRepo.replaceUserPreferences).toHaveBeenCalledWith('u1', preferences);
    });

    it('načíta preferencie používateľa', async () => {
        m(preferencesRepo.findUserPreferences).mockResolvedValue(preferences);
        await expect(getUserPreferences('u1')).resolves.toEqual(preferences);
    });
});
