import nodemailer from 'nodemailer';

// Where contact-form messages are delivered.
export const CONTACT_TO = process.env.CONTACT_TO || 'nuby.chartine@gmail.com';

// Build a transporter from SMTP env vars. For Gmail set:
//   SMTP_HOST=smtp.gmail.com  SMTP_PORT=465  SMTP_SECURE=true
//   SMTP_USER=<your gmail>    SMTP_PASS=<16-char app password>
// If SMTP isn't configured, we fall back to logging the message (dev mode).
let transporter = null;
export const mailerConfigured = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

if (mailerConfigured) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true' || Number(process.env.SMTP_PORT) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

// Send a contact-form message. Returns { delivered } — false means SMTP isn't
// configured and the message was only logged (so the form still works in dev).
export async function sendContactEmail({ name, email, message }) {
  const subject = `SmartBiz contact — ${name}`;
  const text = `From: ${name} <${email}>\n\n${message}`;

  if (!transporter) {
    console.warn(`[contact] SMTP not configured — message NOT emailed. To ${CONTACT_TO}:\n${text}`);
    return { delivered: false };
  }

  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: CONTACT_TO,
    replyTo: `${name} <${email}>`,
    subject,
    text,
  });
  return { delivered: true };
}
