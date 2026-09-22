import { Router } from 'express';
import { body } from 'express-validator';
import { register, login, me, updateProfile } from '../controllers/authController.js';
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

router.put('/profile', authenticate, [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('A valid email is required').normalizeEmail({ gmail_remove_dots: false }),
  body('password').optional({ values: 'falsy' }).isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  validate,
], updateProfile);

export default router;
