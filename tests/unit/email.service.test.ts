import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { sendMailMock } = vi.hoisted(() => ({ sendMailMock: vi.fn() }));

vi.unmock('../../src/services/email.service');

vi.mock('nodemailer', () => ({
    default: {
        createTransport: vi.fn(() => ({ sendMail: sendMailMock })),
    },
}));

import { sendContactEmail, sendPasswordResetEmail } from '../../src/services/email.service';

describe('email.service', () => {
    beforeEach(() => {
        sendMailMock.mockReset();
        sendMailMock.mockResolvedValue({ messageId: 'mail-1' });
        vi.clearAllMocks();
        vi.stubEnv('SMTP_FROM', 'TripPlanner <test@example.com>');
        vi.stubEnv('SMTP_USER', 'smtp@example.com');
        vi.stubEnv('CONTACT_EMAIL', 'contact@example.com');
    });

    afterEach(() => {
        vi.unstubAllEnvs();
    });

    describe('sendPasswordResetEmail', () => {
        it('odošle e-mail s odkazom na obnovu hesla a časom expirácie', async () => {
            sendMailMock.mockResolvedValue({ messageId: 'mail-1' });

            await sendPasswordResetEmail('user@example.com', 'https://app.test/reset?token=abc', 30);

            expect(sendMailMock).toHaveBeenCalledWith(expect.objectContaining({
                from: 'TripPlanner <test@example.com>',
                to: 'user@example.com',
                subject: 'Reset Password — TripPlanner',
                html: expect.stringContaining('https://app.test/reset?token=abc'),
            }));
            expect(sendMailMock.mock.calls[0][0].html).toContain('30 minutes');
        });

        it('použije predvolenú adresu odosielateľa, ak SMTP_FROM nie je nastavené', async () => {
            vi.stubEnv('SMTP_FROM', '');
            await sendPasswordResetEmail('user@example.com', 'https://app.test/reset', 15);
            expect(sendMailMock.mock.calls[0][0].from).toBe('"TripPlanner" <no-reply@tripplanner.local>');
        });

        it('prepošle chybu SMTP', async () => {
            sendMailMock.mockRejectedValue(new Error('SMTP down'));
            await expect(sendPasswordResetEmail('user@example.com', 'link', 30)).rejects.toThrow('SMTP down');
        });
    });

    describe('sendContactEmail', () => {
        const input = {
            name: '<Max>',
            email: 'max@example.com',
            subject: 'Help\nInjected subject',
            message: '<script>alert("x")</script>\nSecond line & more',
        };

        it('odošle kontaktný e-mail s escapovaným HTML a bezpečným predmetom', async () => {
            await sendContactEmail(input);

            const message = sendMailMock.mock.calls[0][0];
            expect(message).toMatchObject({
                from: 'TripPlanner <test@example.com>',
                to: 'contact@example.com',
                subject: '[TripPlanner contact] Help Injected subject',
                replyTo: '"<Max>" <max@example.com>',
            });
            expect(message.html).toContain('&lt;Max&gt;');
            expect(message.html).toContain('&lt;script&gt;');
            expect(message.html).toContain('&quot;x&quot;');
            expect(message.html).toContain('Second line &amp; more');
            expect(message.html).toContain('<br>');
            expect(message.html).not.toContain('<script>');
        });

        it('použije SMTP_USER, ak CONTACT_EMAIL nie je nastavený', async () => {
            vi.stubEnv('CONTACT_EMAIL', '');
            await sendContactEmail({ ...input, subject: 'Question' });
            expect(sendMailMock.mock.calls[0][0].to).toBe('smtp@example.com');
        });

        it('vyhodí chybu, ak nie je nastavený príjemca', async () => {
            vi.stubEnv('CONTACT_EMAIL', '');
            vi.stubEnv('SMTP_USER', '');
            await expect(sendContactEmail(input)).rejects.toThrow('CONTACT_EMAIL or SMTP_USER must be set');
            expect(sendMailMock).not.toHaveBeenCalled();
        });

        it('odstráni úvodzovky a nové riadky z mena v Reply-To', async () => {
            await sendContactEmail({ ...input, name: 'Max"\nBcc: evil@example.com' });
            expect(sendMailMock.mock.calls[0][0].replyTo).toBe('"MaxBcc: evil@example.com" <max@example.com>');
        });

        it('prepošle chybu pri zlyhaní odoslania', async () => {
            sendMailMock.mockRejectedValue(new Error('mail failed'));
            await expect(sendContactEmail(input)).rejects.toThrow('mail failed');
        });
    });

    describe('sendContactEmail – predvolený odosielateľ', () => {
        it('použije predvolenú adresu odosielateľa, ak SMTP_FROM nie je nastavené', async () => {
            sendMailMock.mockReset();
            sendMailMock.mockResolvedValue({ messageId: 'mail-1' });

            vi.stubEnv('CONTACT_EMAIL', 'contact@example.com');
            vi.stubEnv('SMTP_USER', 'smtp@example.com');
            vi.stubEnv('SMTP_FROM', '');

            await sendContactEmail({
                name: 'Max',
                email: 'max@example.com',
                subject: 'Question',
                message: 'Hello',
            });

            expect(sendMailMock).toHaveBeenCalled();
            expect(sendMailMock.mock.calls[0][0].from)
                .toBe('"TripPlanner" <no-reply@tripplanner.local>');
        });
    });
});
