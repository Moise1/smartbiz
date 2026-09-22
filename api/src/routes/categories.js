import { Router } from 'express';
import { body } from 'express-validator';
import { getCategories, createCategory } from '../controllers/categoryController.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();

router.get('/', getCategories);
// Owners can add a category when the one they need isn't listed yet.
router.post('/', authenticate, requireRole('admin', 'business_owner'), [
  body('name').trim().notEmpty().withMessage('Category name is required'),
  validate,
], createCategory);

export default router;
