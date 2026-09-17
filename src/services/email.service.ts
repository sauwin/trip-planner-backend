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

export async function sendPasswordResetEmail(to: string, resetLink: string) {
  await transporter.sendMail({
    from: process.env.SMTP_FROM || '"TripPlanner" <no-reply@tripplanner.local>',
    to,
    subject: 'Reset Password — TripPlanner',
    html: `
      <p>Someone (hopefully you) requested a password reset for your TripPlanner account associated with this email address.</p>
      <p><a href="${resetLink}">Click here to set a new password</a></p>
      <p>The link will expire in 30 minutes. If you didn't request this, please ignore this email and your password will remain unchanged.</p>
    `,
  });
}