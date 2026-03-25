import express from 'express';
import { createCourse, getCourses, getCourseById, getModule, getQuiz, submitQuiz, getAnalytics } from '../controllers/courseController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/analytics', protect, getAnalytics);
router.route('/')
    .post(protect, createCourse)
    .get(protect, getCourses);

router.route('/:id')
    .get(protect, getCourseById);

router.get('/:id/modules/:moduleId', protect, getModule);
router.get('/:id/modules/:moduleId/quiz', protect, getQuiz);
router.post('/:id/modules/:moduleId/quiz', protect, submitQuiz);

export default router;
