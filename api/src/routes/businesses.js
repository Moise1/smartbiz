import { Router } from 'express';
import { body } from 'express-validator';
import {
  getBusinesses, getBusinessById, createBusiness,
  updateBusiness, deleteBusiness, getMyBusinesses,
} from '../controllers/businessController.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();

const businessValidation = [
  body('name').trim().notEmpty(),
  body('description').trim().notEmpty(),
  body('category_id').isInt(),
  body('phone').optional().trim(),
  body('email').optional().isEmail().normalizeEmail(),
  body('city').trim().notEmpty(),
  validate,
];

router.get('/', getBusinesses);
router.get('/mine', authenticate, requireRole('business_owner', 'admin'), getMyBusinesses);
router.get('/:id', getBusinessById);
router.post('/', authenticate, requireRole('business_owner', 'admin'), businessValidation, createBusiness);
router.put('/:id', authenticate, businessValidation, updateBusiness);
router.delete('/:id', authenticate, deleteBusiness);

export default router;
