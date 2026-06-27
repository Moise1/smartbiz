import { Router } from 'express';
import { body } from 'express-validator';
import { getBusinessReviews, createReview, deleteReview } from '../controllers/reviewController.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router({ mergeParams: true });

router.get('/', getBusinessReviews);
router.post('/', authenticate, [
  body('rating').isInt({ min: 1, max: 5 }),
  body('comment').trim().notEmpty(),
  validate,
], createReview);
router.delete('/:id', authenticate, deleteReview);

export default router;
