import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendPasswordResetEmail(to: string, resetLink: string, expiresInMinutes: number) {
  await transporter.sendMail({
    from: process.env.SMTP_FROM || '"TripPlanner" <no-reply@tripplanner.local>',
    to,
    subject: 'Reset Password — TripPlanner',
    html: `
      <p>Someone (hopefully you) requested a password reset for your TripPlanner account associated with this email address.</p>
      <p><a href="${resetLink}">Click here to set a new password</a></p>
      <p>The link will expire in ${expiresInMinutes} minutes. If you didn't request this, please ignore this email and your password will remain unchanged.</p>
    `,
  });
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function sendContactEmail(input: { name: string; email: string; subject: string; message: string }) {
  const to = process.env.CONTACT_EMAIL || process.env.SMTP_USER;
  if (!to) {
    throw new Error('CONTACT_EMAIL or SMTP_USER must be set');
  }

  const name = escapeHtml(input.name);
  const email = escapeHtml(input.email);
  const message = escapeHtml(input.message).replace(/\n/g, '<br>');
  const subject = input.subject.replace(/[\r\n]+/g, ' ');

  await transporter.sendMail({
    from: process.env.SMTP_FROM || '"TripPlanner" <no-reply@tripplanner.local>',
    to,
    replyTo: `"${input.name.replace(/["\r\n]/g, '')}" <${input.email}>`,
    subject: `[TripPlanner contact] ${subject}`,
    html: `
      <p><strong>From:</strong> ${name} (<a href="mailto:${email}">${email}</a>)</p>
      <p><strong>Subject:</strong> ${escapeHtml(subject)}</p>
      <hr>
      <p>${message}</p>
    `,
  });
}