import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

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
import { logActivity } from './middleware/activityLogger.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(logActivity);

// Static file serving for uploads (HLS segments, etc.)
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

// Routes
app.use('/api/auth', authRoutes);
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

// Basic Route
app.get('/', (req, res) => {
    res.send('Intellipath API is running...');
});

export default app;
