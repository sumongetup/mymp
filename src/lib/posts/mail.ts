import { SITE_EMAIL } from '@/lib/site';

/**
 * Sends the sync's summary to the site's inbox through Resend's HTTP API
 * (the project has no other mailer). Needs RESEND_API_KEY. MAIL_FROM is the
 * sender: a verified mymp.bd address once the domain is added in Resend;
 * until then Resend's test sender, which only delivers to the address the
 * Resend account was opened with, so open it with mymp.bangladesh@gmail.com.
 * Returns what happened, for the run's log; never throws.
 */
export async function sendSyncMail(subject: string, text: string): Promise<string> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return 'not sent: RESEND_API_KEY is not set';
  const from = process.env.MAIL_FROM || 'আমার এমপি <onboarding@resend.dev>';
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [SITE_EMAIL], subject, text }),
      signal: AbortSignal.timeout(20_000),
    });
    return res.ok ? `sent to ${SITE_EMAIL}` : `not sent: Resend answered ${res.status} ${(await res.text()).slice(0, 200)}`;
  } catch (e) {
    return `not sent: ${(e as Error).message}`;
  }
}
