import { Router } from 'express';
import { body } from 'express-validator';
import {
  getBusinesses, getBusinessById, createBusiness,
  updateBusiness, deleteBusiness, getMyBusinesses,
  getFeaturedBusinesses, getMyBusinessViews, setCoverPhoto,
} from '../controllers/businessController.js';
import { authenticate, optionalAuthenticate, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { uploadImage } from '../middleware/upload.js';

const router = Router();

const businessValidation = [
  body('name').trim().notEmpty().withMessage('Business name is required'),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('category_id').isInt().withMessage('Please select a category'),
  body('phone').optional({ values: 'falsy' }).trim(),
  body('email').optional({ values: 'falsy' }).isEmail().withMessage('Email must be valid').normalizeEmail({ gmail_remove_dots: false }),
  body('city').trim().notEmpty().withMessage('City is required'),
  body('latitude').optional({ values: 'falsy' }).isFloat({ min: -90, max: 90 }).withMessage('Latitude must be a number between -90 and 90'),
  body('longitude').optional({ values: 'falsy' }).isFloat({ min: -180, max: 180 }).withMessage('Longitude must be a number between -180 and 180'),
  validate,
];

router.get('/', getBusinesses);
router.get('/featured', getFeaturedBusinesses);
router.get('/mine', authenticate, requireRole('business_owner', 'admin'), getMyBusinesses);
router.get('/mine/views', authenticate, requireRole('business_owner', 'admin'), getMyBusinessViews);
router.get('/:id', optionalAuthenticate, getBusinessById);
router.post('/', authenticate, requireRole('business_owner', 'admin'), businessValidation, createBusiness);
router.post(
  '/:id/cover',
  authenticate,
  requireRole('business_owner', 'admin'),
  uploadImage.single('image'),
  setCoverPhoto
);
router.put('/:id', authenticate, businessValidation, updateBusiness);
router.delete('/:id', authenticate, deleteBusiness);

export default router;
