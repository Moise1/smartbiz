import { Router } from 'express';
import { body } from 'express-validator';
import { submitContact } from '../controllers/contactController.js';
import { validate } from '../middleware/validate.js';

const router = Router();

router.post(
  '/',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('A valid email is required').normalizeEmail({ gmail_remove_dots: false }),
    body('message').trim().notEmpty().withMessage('Message is required'),
    validate,
  ],
  submitContact
);

export default router;
