import nodemailer from 'nodemailer';
import { env } from './env.js';

const transporter = env.SMTP_HOST
  ? nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
      },
    })
  : null;

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
}) {
  if (!transporter) {
    console.warn('[email] SMTP not configured, skipping:', opts.subject);
    return;
  }

  await transporter.sendMail({
    from: env.EMAIL_FROM,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
  });
}
