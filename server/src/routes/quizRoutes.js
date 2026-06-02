import express from 'express';
import { protect, requireRole } from '../middleware/authMiddleware.js';
import {
    createQuiz,
    getInstructorQuizzes,
    getQuizSubmissions,
    evaluateSubmission,
    getStudentQuizzes,
    startQuiz,
    submitQuiz,
    reopenSubmission
} from '../controllers/quizController.js';

const router = express.Router();

// INSTRUCTOR
router.post('/', protect, requireRole('instructor', 'admin'), createQuiz);
router.get('/batch/:batchId/instructor', protect, requireRole('instructor', 'admin'), getInstructorQuizzes);
router.get('/:id/submissions', protect, requireRole('instructor', 'admin'), getQuizSubmissions);
router.post('/:id/submissions/:subId/evaluate', protect, requireRole('instructor', 'admin'), evaluateSubmission);
router.post('/:id/submissions/:subId/reopen', protect, requireRole('instructor', 'admin'), reopenSubmission);

// STUDENT
router.get('/batch/:batchId', protect, getStudentQuizzes);
router.post('/:id/start', protect, startQuiz);
router.post('/:id/submit', protect, submitQuiz);

export default router;
