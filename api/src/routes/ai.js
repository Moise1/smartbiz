import { Router } from 'express';
import { body } from 'express-validator';
import { getRecommendations, improveSearch } from '../controllers/aiController.js';
import { validate } from '../middleware/validate.js';

const router = Router();

router.post('/recommendations', [
  body('preferences').trim().notEmpty(),
  validate,
], getRecommendations);

router.post('/search', [
  body('query').trim().notEmpty(),
  validate,
], improveSearch);

export default router;
