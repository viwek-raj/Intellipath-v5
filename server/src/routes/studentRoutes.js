import express from 'express';
import { protect, requireApproved, requireRole } from '../middleware/authMiddleware.js';
import { getStudentAnalytics, getStudentActivity, getPendingTasks } from '../controllers/studentController.js';

const router = express.Router();

router.use(protect);
router.use(requireApproved);
router.use(requireRole('student'));

router.get('/dashboard/analytics', getStudentAnalytics);
router.get('/dashboard/activity', getStudentActivity);
router.get('/dashboard/pending-tasks', getPendingTasks);

export default router;
