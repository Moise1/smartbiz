import { Router } from 'express';
import { getUsers, getUserById } from '../controllers/userController.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();

router.get('/', authenticate, requireRole('admin'), getUsers);
router.get('/:id', authenticate, requireRole('admin'), getUserById);

export default router;
