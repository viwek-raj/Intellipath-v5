import express from 'express';
import {
    uploadLecture,
    getUploadStatus,
    updateLecture,
    deleteLecture,
    reorderLectures,
    getLectureAnalytics,
    getLecturesByBatch,
    getLectureById,
    streamVideo,
    streamOriginalVideo,
    downloadNotes,
    updateWatchProgress,
    getWatchProgress,
    searchByTag,
    attachVideo,
    attachNotes,
    generateMuxUploadUrl,
    syncMuxStatus,
    createLiveStream,
    completeLiveStream
} from '../controllers/lectureController.js';
import { protect, requireApproved, requireRole } from '../middleware/authMiddleware.js';
import { uploadLectureFiles } from '../config/storage.js';

const router = express.Router();

// ── Static / non-parameterized routes FIRST ──────────────

// Instructor
router.post('/upload-url', protect, requireApproved, requireRole('instructor'), generateMuxUploadUrl);
router.post('/live', protect, requireApproved, requireRole('instructor'), createLiveStream);
router.post('/:id/end-live', protect, requireApproved, requireRole('instructor'), completeLiveStream);
router.post('/:id/sync-mux', protect, requireApproved, syncMuxStatus);
router.put('/reorder', protect, requireApproved, requireRole('instructor'), reorderLectures);
router.post('/', protect, requireApproved, requireRole('instructor'), uploadLectureFiles, uploadLecture);

// Student — batch/tag queries
router.get('/batch/:batchId', protect, requireApproved, getLecturesByBatch);
router.get('/tag/:tagId', protect, requireApproved, searchByTag);

// ── Parameterized routes ─────────────────────────────────

// Instructor
router.get('/:id/status', protect, requireApproved, requireRole('instructor'), getUploadStatus);
router.get('/:id/analytics', protect, requireApproved, requireRole('instructor'), getLectureAnalytics);
router.put('/:id', protect, requireApproved, requireRole('instructor'), updateLecture);
router.put('/:id/video', protect, requireApproved, requireRole('instructor'), uploadLectureFiles, attachVideo);
router.put('/:id/notes', protect, requireApproved, requireRole('instructor'), uploadLectureFiles, attachNotes);
router.delete('/:id', protect, requireApproved, requireRole('instructor'), deleteLecture);

// Student — streaming, notes, progress
router.get('/:id/stream-original', protect, requireApproved, streamOriginalVideo);
router.get('/:id/stream/{*path}', protect, requireApproved, streamVideo);
router.get('/:id/notes', protect, requireApproved, downloadNotes);
router.post('/:id/progress', protect, requireApproved, updateWatchProgress);
router.get('/:id/progress', protect, requireApproved, getWatchProgress);

// Student — single lecture detail (LAST — catch-all for /:id)
router.get('/:id', protect, requireApproved, getLectureById);

export default router;
