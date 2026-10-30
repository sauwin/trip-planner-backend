import { vi } from 'vitest';

process.env.JWT_ACCESS_SECRET = 'test-access-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
process.env.JWT_ACCESS_EXPIRES = '15m';
process.env.JWT_REFRESH_EXPIRES = '7d';
process.env.FRONTEND_URL = 'http://localhost:5173';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
delete process.env.SUPER_ADMIN_EMAIL;

vi.mock('../src/lib/prisma', () => ({ prisma: {} }));

vi.mock('../src/services/email.service', () => ({
    sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
    sendContactEmail: vi.fn().mockResolvedValue(undefined),
}));