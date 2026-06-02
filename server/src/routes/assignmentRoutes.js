import express from 'express';
import { protect, requireRole } from '../middleware/authMiddleware.js';
import { uploadAssignmentFile } from '../config/storage.js';
import {
    createAssignment,
    getInstructorAssignments,
    getAssignmentSubmissions,
    evaluateAssignment,
    getStudentAssignments,
    submitAssignment,
    downloadAssignmentFile
} from '../controllers/assignmentController.js';

const router = express.Router();

// INSTRUCTOR
router.post('/', protect, requireRole('instructor', 'admin'), createAssignment);
router.get('/batch/:batchId/instructor', protect, requireRole('instructor', 'admin'), getInstructorAssignments);
router.get('/:id/submissions', protect, requireRole('instructor', 'admin'), getAssignmentSubmissions);
router.post('/:id/submissions/:subId/evaluate', protect, requireRole('instructor', 'admin'), evaluateAssignment);

// STUDENT
router.get('/batch/:batchId', protect, getStudentAssignments);
router.post('/:id/submit', protect, uploadAssignmentFile, submitAssignment);

// BOTH
router.get('/submissions/:subId/download', protect, downloadAssignmentFile);

export default router;
