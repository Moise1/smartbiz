import { Router } from 'express';
import authRoutes from './auth.js';
import businessRoutes from './businesses.js';
import categoryRoutes from './categories.js';
import reviewRoutes from './reviews.js';
import aiRoutes from './ai.js';
import subscriptionRoutes from './subscriptions.js';
import userRoutes from './users.js';
import contactRoutes from './contact.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/businesses', businessRoutes);
router.use('/businesses/:business_id/reviews', reviewRoutes);
router.use('/categories', categoryRoutes);
router.use('/ai', aiRoutes);
router.use('/subscriptions', subscriptionRoutes);
router.use('/users', userRoutes);
router.use('/contact', contactRoutes);

export default router;
