import { sendContactEmail } from '../config/mailer.js';

export async function submitContact(req, res, next) {
  try {
    const { name, email, message } = req.body;
    const { delivered } = await sendContactEmail({ name, email, message });
    res.status(201).json({
      message: delivered
        ? 'Thanks! Your message has been sent.'
        : 'Thanks! Your message has been received.',
      delivered,
    });
  } catch (err) {
    next(err);
  }
}
