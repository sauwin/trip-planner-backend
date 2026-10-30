import { signAccessToken } from '../src/lib/jwt';

export const USER_ID = '11111111-1111-4111-8111-111111111111';
export const OTHER_USER_ID = '22222222-2222-4222-8222-222222222222';
export const TRIP_ID = '33333333-3333-4333-8333-333333333333';
export const DEST_ID = '44444444-4444-4444-8444-444444444444';

export function bearer(userId = USER_ID, role: 'USER' | 'ADMIN' | 'SUPER_ADMIN' = 'USER') {
    return { Authorization: `Bearer ${signAccessToken(userId, role)}` };
}