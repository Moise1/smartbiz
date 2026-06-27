import { Router } from 'express';
import { body } from 'express-validator';
import { getCategories, createCategory } from '../controllers/categoryController.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();

router.get('/', getCategories);
router.post('/', authenticate, requireRole('admin'), [
  body('name').trim().notEmpty(),
  validate,
], createCategory);

export default router;
