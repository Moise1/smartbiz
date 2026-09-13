import { Router } from 'express';
import { body } from 'express-validator';
import { register, login, me } from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();

// gmail_remove_dots must stay off: the default strips dots from gmail
// addresses ("a.b@gmail.com" → "ab@gmail.com"), so login lookups would miss
// accounts stored with the address the user actually typed.
const emailRule = () => body('email').isEmail().normalizeEmail({ gmail_remove_dots: false });

router.post('/register', [
  body('name').trim().notEmpty(),
  emailRule(),
  body('password').isLength({ min: 6 }),
  validate,
], register);

router.post('/login', [
  emailRule(),
  body('password').notEmpty(),
  validate,
], login);

router.get('/me', authenticate, me);

export default router;
