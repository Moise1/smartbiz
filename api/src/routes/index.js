import { Router } from 'express';
import authRoutes from './auth.js';
import businessRoutes from './businesses.js';
import categoryRoutes from './categories.js';
import reviewRoutes from './reviews.js';
import aiRoutes from './ai.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/businesses', businessRoutes);
router.use('/businesses/:business_id/reviews', reviewRoutes);
router.use('/categories', categoryRoutes);
router.use('/ai', aiRoutes);

export default router;
