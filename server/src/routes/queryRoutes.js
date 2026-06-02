import express from 'express';
import { protect, requireApproved, requireRole } from '../middleware/authMiddleware.js';
import {
    createQuery,
    getQueries,
    getQueryById,
    replyToQuery,
    scheduleMeet,
    resolveQuery
} from '../controllers/queryController.js';

const router = express.Router();

router.route('/')
    .post(protect, requireApproved, requireRole('student'), createQuery)
    .get(protect, requireApproved, getQueries);

router.route('/:id')
    .get(protect, requireApproved, getQueryById);

router.post('/:id/reply', protect, requireApproved, replyToQuery);
router.put('/:id/meet', protect, requireApproved, requireRole('instructor'), scheduleMeet);
router.put('/:id/resolve', protect, requireApproved, resolveQuery);

export default router;
