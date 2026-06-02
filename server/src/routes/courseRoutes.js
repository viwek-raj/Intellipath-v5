import express from 'express';
import { createCourse, getCourses, getCourseById, getModule, updateModuleStatus, getQuiz, submitQuiz, getAnalytics, deleteCourse } from '../controllers/courseController.js';
import { protect, requireApproved } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/analytics', protect, requireApproved, getAnalytics);
router.route('/')
    .post(protect, requireApproved, createCourse)
    .get(protect, requireApproved, getCourses);

router.route('/:id')
    .get(protect, requireApproved, getCourseById)
    .delete(protect, requireApproved, deleteCourse);

router.get('/:id/modules/:moduleId', protect, requireApproved, getModule);
router.put('/:id/modules/:moduleId', protect, requireApproved, updateModuleStatus);
router.get('/:id/modules/:moduleId/quiz', protect, requireApproved, getQuiz);
router.post('/:id/modules/:moduleId/quiz', protect, requireApproved, submitQuiz);

export default router;
