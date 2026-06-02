/**
 * @module storage
 * @description Multer configuration for lecture video and PDF note uploads.
 *
 * Provides disk storage with structured filenames and directory creation,
 * file-type filtering, and size limits.
 *
 * Exports:
 *  - uploadLectureFiles – multer middleware that accepts `video` and `pdf` fields
 */

import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// ── Resolve project-root-relative paths ─────────
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../..');

const VIDEO_RAW_DIR = path.join(PROJECT_ROOT, 'uploads', 'videos', 'raw');
const NOTES_DIR = path.join(PROJECT_ROOT, 'uploads', 'notes');
const ASSIGNMENT_DIR = path.join(PROJECT_ROOT, 'uploads', 'assignments');

// ── Ensure upload directories exist on import ───
fs.mkdirSync(VIDEO_RAW_DIR, { recursive: true });
fs.mkdirSync(NOTES_DIR, { recursive: true });
fs.mkdirSync(ASSIGNMENT_DIR, { recursive: true });

// ── Helper: build a unique filename ─────────────
/**
 * Creates a filename in the format {userId}_{timestamp}_{originalname}.
 * @param {import('express').Request} req
 * @param {Express.Multer.File} file
 * @param {Function} cb
 */
const buildFilename = (req, file, cb) => {
  const userId = req.user?._id || 'unknown';
  const timestamp = Date.now();
  // Sanitise the original name (replace spaces with underscores)
  const safeName = file.originalname.replace(/\s+/g, '_');
  cb(null, `${userId}_${timestamp}_${safeName}`);
};

// ── Video storage ───────────────────────────────
const videoStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, VIDEO_RAW_DIR),
  filename: buildFilename,
});

// ── PDF / Notes storage ─────────────────────────
const notesStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, NOTES_DIR),
  filename: buildFilename,
});

// ── File filters ────────────────────────────────
const ALLOWED_VIDEO_MIMES = ['video/mp4', 'video/webm', 'video/x-matroska'];
const ALLOWED_PDF_MIMES = ['application/pdf'];

/**
 * Multer file filter that routes video and PDF files to the
 * correct validation logic.
 */
const lectureFileFilter = (_req, file, cb) => {
  if (file.fieldname === 'video') {
    if (ALLOWED_VIDEO_MIMES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid video type: ${file.mimetype}. Allowed: mp4, webm, x-matroska`), false);
    }
  } else if (file.fieldname === 'pdf') {
    if (ALLOWED_PDF_MIMES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type: ${file.mimetype}. Only PDF is allowed.`), false);
    }
  } else {
    cb(new Error(`Unexpected field: ${file.fieldname}`), false);
  }
};

// ── Combined multer instance for lecture uploads ─
// We use a custom storage engine that delegates to the correct
// sub-storage based on the field name.
const lectureStorage = multer.diskStorage({
  destination: (_req, file, cb) => {
    if (file.fieldname === 'video') {
      cb(null, VIDEO_RAW_DIR);
    } else if (file.fieldname === 'pdf') {
      cb(null, NOTES_DIR);
    } else {
      cb(new Error(`Unexpected field: ${file.fieldname}`));
    }
  },
  filename: buildFilename,
});

const lectureUploader = multer({
  storage: lectureStorage,
  fileFilter: lectureFileFilter,
  limits: {
    // Per-field limits aren't natively supported, so we set the
    // global limit to the largest allowed (500 MB for video).
    // Application-level validation can further restrict PDF size.
    fileSize: 500 * 1024 * 1024, // 500 MB
  },
});

/**
 * Express middleware that handles multipart lecture uploads.
 * Accepts up to 1 video file and 1 PDF file.
 */
const uploadLectureFiles = lectureUploader.fields([
  { name: 'video', maxCount: 1 },
  { name: 'pdf', maxCount: 1 },
]);

// ── Assignment file storage (PDF strictly <= 20MB) ──
const assignmentStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, ASSIGNMENT_DIR),
  filename: buildFilename,
});

const uploadAssignmentFile = multer({
  storage: assignmentStorage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type: ${file.mimetype}. Only PDF is allowed for assignments.`), false);
    }
  },
  limits: {
    fileSize: 20 * 1024 * 1024, // 20 MB strictly
  },
}).single('assignment');

export { uploadLectureFiles, uploadAssignmentFile, VIDEO_RAW_DIR, NOTES_DIR, ASSIGNMENT_DIR };
