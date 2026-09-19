import { Router } from 'express';
import { body } from 'express-validator';
import { getUsers, getUserById } from '../controllers/userController.js';
import { createBusinessOwner } from '../controllers/authController.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();

router.get('/', authenticate, requireRole('admin'), getUsers);
router.get('/:id', authenticate, requireRole('admin'), getUserById);

// Admin creates a business-owner account
router.post(
  '/business-owners',
  authenticate,
  requireRole('admin'),
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('A valid email is required').normalizeEmail({ gmail_remove_dots: false }),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    validate,
  ],
  createBusinessOwner
);

export default router;
