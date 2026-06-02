import express from 'express';
import {
    createBatch,
    getMyBatches,
    updateBatch,
    deleteBatch,
    getBatchStudents,
    removeStudentFromBatch,
    getBatchAnalytics,
    browseBatches,
    joinBatch,
    leaveBatch,
    getMyEnrolledBatches,
    getBatchDetail,
} from '../controllers/batchController.js';
import { protect, requireApproved, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

// ── Student routes (protect → requireApproved) ───────────
// Static paths FIRST to avoid /:id catching 'browse', 'enrolled', 'my'
router.get('/browse', protect, requireApproved, browseBatches);
router.get('/enrolled', protect, requireApproved, getMyEnrolledBatches);

// ── Instructor routes (protect → requireApproved → requireRole) ──
router.get('/my', protect, requireApproved, requireRole('instructor'), getMyBatches);
router.post('/', protect, requireApproved, requireRole('instructor'), createBatch);

// ── Parameterized routes ─────────────────────────────────
// Student
router.post('/:id/join', protect, requireApproved, joinBatch);
router.post('/:id/leave', protect, requireApproved, leaveBatch);

// Instructor
router.put('/:id', protect, requireApproved, requireRole('instructor'), updateBatch);
router.delete('/:id', protect, requireApproved, requireRole('instructor'), deleteBatch);
router.get('/:id/students', protect, requireApproved, requireRole('instructor'), getBatchStudents);
router.delete('/:id/students/:studentId', protect, requireApproved, requireRole('instructor'), removeStudentFromBatch);
router.get('/:id/analytics', protect, requireApproved, requireRole('instructor'), getBatchAnalytics);

// Shared detail (enrolled student OR instructor OR admin)
router.get('/:id', protect, requireApproved, getBatchDetail);

export default router;
