import express from 'express';
import { getLandingPageStats, getFeaturedBatches } from '../controllers/publicController.js';

const router = express.Router();

router.get('/stats', getLandingPageStats);
router.get('/batches/featured', getFeaturedBatches);

export default router;
