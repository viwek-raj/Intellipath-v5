/**
 * @module dbIndexes
 * @description Ensures compound indexes exist on high-traffic collections.
 *
 * Called once at server startup. Mongoose handles index creation idempotently,
 * so calling this multiple times is safe — it only creates indexes that don't
 * already exist.
 *
 * Performance Impact:
 *  - WatchHistory queries (student + batch lookups) go from collection scan → index seek
 *  - QuizSubmission duplicate checks become O(log n) instead of O(n)
 *  - AssignmentSubmission grading lookups are indexed
 */

import mongoose from 'mongoose';

const ensureIndexes = async () => {
    try {
        const db = mongoose.connection.db;
        if (!db) {
            console.warn('[Indexes] Database not connected yet. Skipping index creation.');
            return;
        }

        console.log('[Indexes] Ensuring compound indexes on high-traffic collections...');

        // WatchHistory: frequently queried by student+batch and by lecture
        const watchHistory = db.collection('watchhistories');
        await watchHistory.createIndex({ student: 1, batch: 1 }, { background: true });
        await watchHistory.createIndex({ student: 1, lecture: 1 }, { unique: true, background: true });
        await watchHistory.createIndex({ lecture: 1 }, { background: true });

        // QuizSubmission: queried by student+quiz (uniqueness) and student+batch
        const quizSubmissions = db.collection('quizsubmissions');
        await quizSubmissions.createIndex({ student: 1, quiz: 1 }, { background: true });
        await quizSubmissions.createIndex({ student: 1, batch: 1 }, { background: true });

        // AssignmentSubmission: queried by student+assignment and student+batch
        const assignmentSubmissions = db.collection('assignmentsubmissions');
        await assignmentSubmissions.createIndex({ student: 1, assignment: 1 }, { background: true });
        await assignmentSubmissions.createIndex({ student: 1, batch: 1 }, { background: true });

        // Activity: queried by user + sorted by date
        const activities = db.collection('activities');
        await activities.createIndex({ user: 1, date: 1 }, { background: true });

        // Batches: queried by students array (enrollment checks)
        const batches = db.collection('batches');
        await batches.createIndex({ students: 1 }, { background: true });
        await batches.createIndex({ instructor: 1 }, { background: true });

        console.log('[Indexes] ✅ All compound indexes verified.');
    } catch (error) {
        // Non-fatal: the app can still run without custom indexes
        console.error('[Indexes] ⚠️ Failed to ensure indexes:', error.message);
    }
};

export default ensureIndexes;
