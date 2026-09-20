import { Router } from 'express';
import { body } from 'express-validator';
import { getUsers, getUserById, updateUser, deleteUser } from '../controllers/userController.js';
import { createBusinessOwner } from '../controllers/authController.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();

router.get('/', authenticate, requireRole('admin'), getUsers);
router.get('/:id', authenticate, requireRole('admin'), getUserById);

// Admin creates a business-owner account together with their first business
router.post(
  '/business-owners',
  authenticate,
  requireRole('admin'),
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('A valid email is required').normalizeEmail({ gmail_remove_dots: false }),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('business.name').trim().notEmpty().withMessage('Business name is required'),
    body('business.description').trim().notEmpty().withMessage('Business description is required'),
    body('business.category_id').isInt().withMessage('Please select a business category'),
    body('business.city').trim().notEmpty().withMessage('Business city is required'),
    validate,
  ],
  createBusinessOwner
);

// Admin edits or deletes a user
router.put(
  '/:id',
  authenticate,
  requireRole('admin'),
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('A valid email is required').normalizeEmail({ gmail_remove_dots: false }),
    body('role').isIn(['user', 'business_owner']).withMessage('Role must be customer or business owner'),
    validate,
  ],
  updateUser
);
router.delete('/:id', authenticate, requireRole('admin'), deleteUser);

export default router;
