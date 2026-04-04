import { Resend } from 'resend';
import { env } from './env.js';

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
}) {
  if (!resend) {
    console.warn('[email] RESEND_API_KEY not configured, skipping:', opts.subject);
    return;
  }

  const from = env.EMAIL_FROM || 'DW Church <noreply@truelight.app>';

  await resend.emails.send({
    from,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
  });
}
