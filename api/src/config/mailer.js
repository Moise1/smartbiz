import nodemailer from 'nodemailer';

// Where contact-form messages are delivered.
export const CONTACT_TO = process.env.CONTACT_TO || 'nuby.chartine@gmail.com';

// ── Email delivery ──────────────────────────────────────────────────────────
// Two providers, in priority order:
//   1. Brevo HTTP API (works on hosts that block outbound SMTP, e.g. Render's
//      free tier). Set BREVO_API_KEY and BREVO_SENDER (a verified sender email).
//   2. SMTP via nodemailer (great locally). Set SMTP_HOST/USER/PASS.
// If neither is configured, messages are logged instead of sent (dev mode).

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const BREVO_SENDER = process.env.BREVO_SENDER || process.env.SMTP_FROM || process.env.SMTP_USER;
const SENDER_NAME = process.env.MAIL_FROM_NAME || 'SmartBiz';

let transporter = null;
const smtpConfigured = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
if (smtpConfigured) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true' || Number(process.env.SMTP_PORT) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    // Some hosts have no working IPv6 route out — Gmail's SMTP resolves to IPv6
    // and the connection fails with ENETUNREACH. Force IPv4.
    family: 4,
    // Fail fast when a host blocks outbound SMTP (e.g. Render), so the request
    // returns in seconds instead of hanging ~2 minutes. Use Brevo there.
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });
}

export const mailerConfigured = Boolean(BREVO_API_KEY) || smtpConfigured;

// Send one email through whichever provider is configured. Throws on failure.
async function deliver({ to, subject, text, html, replyTo }) {
  if (BREVO_API_KEY) {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': BREVO_API_KEY,
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        sender: { name: SENDER_NAME, email: BREVO_SENDER },
        to: [{ email: to }],
        ...(replyTo ? { replyTo: { email: replyTo } } : {}),
        subject,
        textContent: text,
        ...(html ? { htmlContent: html } : {}),
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Brevo ${res.status}: ${body}`);
    }
    return;
  }

  if (transporter) {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || `${SENDER_NAME} <${process.env.SMTP_USER}>`,
      to,
      subject,
      text,
      ...(html ? { html } : {}),
      ...(replyTo ? { replyTo } : {}),
    });
    return;
  }

  throw new Error('no email provider configured');
}

// Send a contact-form message. Returns { delivered } — false means email isn't
// configured or the send failed (the form still works either way).
export async function sendContactEmail({ name, email, message }) {
  const subject = `SmartBiz contact — ${name}`;
  const text = `From: ${name} <${email}>\n\n${message}`;

  if (!mailerConfigured) {
    console.warn(`[contact] Email not configured — message NOT sent. To ${CONTACT_TO}:\n${text}`);
    return { delivered: false };
  }
  try {
    await deliver({ to: CONTACT_TO, subject, text, replyTo: email });
    return { delivered: true };
  } catch (err) {
    console.error(`[contact] Failed to send contact email:`, err.message);
    return { delivered: false };
  }
}

// Welcome a newly-created business owner with their login details. Returns
// { delivered }. Never throws: account creation must not fail because email did.
export async function sendWelcomeEmail({ name, email, password }) {
  const loginUrl = `${(process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/$/, '')}/login`;
  const subject = 'Welcome to SmartBiz 🎉';
  const text = [
    `Hi ${name},`,
    '',
    'Congratulations — your SmartBiz business owner account has been created!',
    'You can now sign in and list your businesses so customers across Rwanda can find you.',
    '',
    'Your login details:',
    `  Email: ${email}`,
    `  Temporary password: ${password}`,
    '',
    `Sign in here: ${loginUrl}`,
    '',
    'For your security, please change your password after your first sign-in',
    '(open the profile menu at the top right → Edit profile).',
    '',
    'Welcome aboard,',
    'The SmartBiz team',
  ].join('\n');

  const html = `
    <div style="font-family:system-ui,Segoe UI,Arial,sans-serif;max-width:520px;margin:0 auto;color:#1c2621">
      <h2 style="color:#16a34a;margin:0 0 12px">Welcome to SmartBiz 🎉</h2>
      <p>Hi ${name},</p>
      <p>Congratulations — your SmartBiz business owner account has been created!
      You can now sign in and list your businesses so customers across Rwanda can find you.</p>
      <table style="border-collapse:collapse;background:#f6f9f6;border-radius:8px;padding:8px;margin:16px 0">
        <tr><td style="padding:6px 12px;color:#5c6b62">Email</td><td style="padding:6px 12px;font-weight:600">${email}</td></tr>
        <tr><td style="padding:6px 12px;color:#5c6b62">Temporary password</td><td style="padding:6px 12px;font-weight:600">${password}</td></tr>
      </table>
      <p><a href="${loginUrl}" style="display:inline-block;background:#16a34a;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:600">Sign in to SmartBiz</a></p>
      <p style="color:#5c6b62;font-size:14px">For your security, please change your password after your first sign-in
      (open the profile menu at the top right → Edit profile).</p>
      <p style="margin-top:20px">Welcome aboard,<br/>The SmartBiz team</p>
    </div>`;

  if (!mailerConfigured) {
    console.warn(`[welcome] Email not configured — welcome email NOT sent to ${email}.`);
    return { delivered: false };
  }
  try {
    await deliver({ to: email, subject, text, html });
    return { delivered: true };
  } catch (err) {
    console.error(`[welcome] Failed to send welcome email to ${email}:`, err.message);
    return { delivered: false };
  }
}
