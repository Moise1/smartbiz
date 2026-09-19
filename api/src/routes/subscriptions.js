import { Router } from 'express';
import { body } from 'express-validator';
import { getPlans, subscribe, getMySubscriptions, getSubscriptionStats } from '../controllers/subscriptionController.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();

router.get('/plans', getPlans);
router.get('/mine', authenticate, getMySubscriptions);
router.get('/stats', authenticate, requireRole('admin'), getSubscriptionStats);
router.post(
  '/',
  authenticate,
  requireRole('business_owner', 'admin'),
  [
    body('business_id').isInt().withMessage('business_id is required'),
    body('plan').isIn(['basic', 'standard', 'premium']).withMessage('Choose a valid plan'),
    body('payment_method').isIn(['momo', 'card']).withMessage('Choose a payment method: MoMo or card'),
    validate,
  ],
  subscribe
);

export default router;
