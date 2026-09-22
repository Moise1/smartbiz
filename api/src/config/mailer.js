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
    // Some hosts (e.g. Render) have no working IPv6 route out — Gmail's SMTP
    // resolves to IPv6 and the connection fails with ENETUNREACH. Force IPv4.
    family: 4,
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

// Welcome a newly-created business owner with their login details. Returns
// { delivered } — false when SMTP isn't configured (message is only logged).
// Never throws: account creation must not fail because email failed.
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

  if (!transporter) {
    console.warn(`[welcome] SMTP not configured — welcome email NOT sent to ${email}.`);
    return { delivered: false };
  }

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: email,
      subject,
      text,
    });
    return { delivered: true };
  } catch (err) {
    console.error(`[welcome] Failed to send welcome email to ${email}:`, err.message);
    return { delivered: false };
  }
}
