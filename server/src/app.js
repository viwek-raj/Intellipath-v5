import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import path from 'path';
import { fileURLToPath } from 'url';

// Middleware
import { globalLimiter, authLimiter } from './middleware/rateLimiter.js';
import { errorHandler } from './middleware/errorHandler.js';
import { logActivity } from './middleware/activityLogger.js';

// Routes
import authRoutes from './routes/authRoutes.js';
import courseRoutes from './routes/courseRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import batchRoutes from './routes/batchRoutes.js';
import lectureRoutes from './routes/lectureRoutes.js';
import taxonomyRoutes from './routes/taxonomyRoutes.js';
import quizRoutes from './routes/quizRoutes.js';
import assignmentRoutes from './routes/assignmentRoutes.js';
import studentRoutes from './routes/studentRoutes.js';
import queryRoutes from './routes/queryRoutes.js';
import publicRoutes from './routes/publicRoutes.js';
import healthRoutes from './routes/healthRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// ============================================================
// SECURITY MIDDLEWARE
// ============================================================

// Helmet — sets secure HTTP headers (CSP, HSTS, X-Frame-Options, etc.)
app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // Allow cross-origin for uploaded media
}));

// CORS — restrict to known origins
app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
}));

// Global rate limiter — 100 requests per 15 minutes per IP
app.use(globalLimiter);

// NoSQL injection prevention — strips $ and . from req.body/params
// Note: express-mongo-sanitize is incompatible with Express 5 (read-only req.query),
// so we use a custom sanitizer that cleans only mutable objects.
const sanitize = (obj) => {
    if (obj && typeof obj === 'object') {
        for (const key of Object.keys(obj)) {
            if (key.startsWith('$') || key.includes('.')) {
                delete obj[key];
            } else if (typeof obj[key] === 'object') {
                sanitize(obj[key]);
            }
        }
    }
};
app.use((req, res, next) => {
    if (req.body) sanitize(req.body);
    if (req.params) sanitize(req.params);
    next();
});

// ============================================================
// BODY PARSING & COMPRESSION
// ============================================================

// Gzip compression — reduces response payload by ~70%
app.use(compression());

// Parse JSON and URL-encoded bodies with size limits
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// ============================================================
// REQUEST LOGGING
// ============================================================

app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        const statusColor = res.statusCode >= 400 ? '🔴' : '🟢';
        console.log(`${statusColor} ${req.method} ${req.originalUrl} → ${res.statusCode} (${duration}ms)`);
    });
    next();
});

// Activity logger
app.use(logActivity);

// ============================================================
// STATIC FILE SERVING
// ============================================================

app.use('/uploads', express.static(path.join(__dirname, '../uploads'), {
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.m3u8')) {
            res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
        }
        if (filePath.endsWith('.ts')) {
            res.setHeader('Content-Type', 'video/mp2t');
        }
    },
}));

// ============================================================
// ROUTES
// ============================================================

// Auth routes (with strict rate limiting for brute-force protection)
app.use('/api/auth', authLimiter, authRoutes);

// API routes
app.use('/api/courses', courseRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/batches', batchRoutes);
app.use('/api/lectures', lectureRoutes);
app.use('/api/taxonomy', taxonomyRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/queries', queryRoutes);
app.use('/api/public', publicRoutes);

// System routes
app.use('/api/health', healthRoutes);

// Root
app.get('/', (req, res) => {
    res.json({
        name: 'Intellipath API',
        version: '5.0.0',
        status: 'running',
        docs: '/api/health',
    });
});

// ============================================================
// CENTRALIZED ERROR HANDLER (must be registered LAST)
// ============================================================

app.use(errorHandler);

export default app;
