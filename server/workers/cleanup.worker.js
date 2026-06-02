/**
 * Cleanup Worker — Separate Node.js process
 * 
 * Handles cascade hard-deletes after soft delete.
 * Cleans up files (HLS, raw video, PDFs) and DB records out-of-band.
 * Started via: npm run worker:cleanup
 */
import 'dotenv/config';
import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import mongoose from 'mongoose';
import User from '../src/models/User.js';
import Batch from '../src/models/Batch.js';
import Lecture from '../src/models/Lecture.js';
import WatchHistory from '../src/models/WatchHistory.js';
import Course from '../src/models/Course.js';
import { deleteHlsFiles, deleteRawFile, deletePdfFile } from '../src/services/transcodingService.js';

const connection = new IORedis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', {
    maxRetriesPerRequest: null,
});

await mongoose.connect(process.env.MONGO_URI);
console.log('🧹 Cleanup worker connected to MongoDB');

/**
 * Hard-delete a single lecture and its associated files
 */
async function handleLectureCleanup(lectureId) {
    // Query including soft-deleted records
    const lectures = await Lecture.findDeleted({ _id: lectureId });
    const lecture = lectures[0];
    if (!lecture) return;

    // Delete HLS files from disk
    try {
        if (lecture.videoHlsPath) await deleteHlsFiles(lecture._id.toString());
    } catch (e) {
        console.warn(`  ⚠️ HLS cleanup warning for ${lectureId}:`, e.message);
    }

    // Delete raw video from disk
    try {
        if (lecture.videoOriginalPath) await deleteRawFile(lecture.videoOriginalPath);
    } catch (e) {
        console.warn(`  ⚠️ Raw file cleanup warning for ${lectureId}:`, e.message);
    }

    // Delete PDF from disk
    try {
        if (lecture.notesPath) await deletePdfFile(lecture.notesPath);
    } catch (e) {
        console.warn(`  ⚠️ PDF cleanup warning for ${lectureId}:`, e.message);
    }

    // Hard delete watch history for this lecture
    await WatchHistory.deleteMany({ lecture: lectureId });

    // Hard delete the lecture document
    await Lecture.deleteOne({ _id: lectureId });
    console.log(`  🗑️ Lecture ${lectureId} hard-deleted`);
}

/**
 * Hard-delete a batch and cascade through its lectures
 */
async function handleBatchCleanup(batchId) {
    // Find all lectures in this batch (including soft-deleted)
    const lectures = await Lecture.findDeleted({ batch: batchId });
    for (const lecture of lectures) {
        await handleLectureCleanup(lecture._id);
    }

    // Hard delete watch history for this batch
    await WatchHistory.deleteMany({ batch: batchId });

    // Hard delete the batch document
    await Batch.deleteOne({ _id: batchId });
    console.log(`  🗑️ Batch ${batchId} hard-deleted`);
}

/**
 * Hard-delete a user and cascade through their data
 */
async function handleUserCleanup({ userId, role }) {
    if (role === 'instructor') {
        // Find all batches by this instructor (including soft-deleted)
        const batches = await Batch.findDeleted({ instructor: userId });
        for (const batch of batches) {
            await handleBatchCleanup(batch._id);
        }
        // Clean up any remaining batches
        await Batch.deleteMany({ instructor: userId });
    }

    if (role === 'student') {
        // Remove from all batch rosters (bypass soft delete filter with native driver)
        await mongoose.connection.db.collection('batches').updateMany(
            {},
            { $pull: { students: new mongoose.Types.ObjectId(userId) } }
        );

        // Hard delete watch history
        await WatchHistory.deleteMany({ student: userId });

        // Hard delete AI-generated courses
        await Course.deleteMany({ user: userId });
    }

    // Hard delete the user document
    await User.deleteOne({ _id: userId });
    console.log(`  🗑️ User ${userId} (${role}) hard-deleted`);
}

const worker = new Worker('cleanup', async (job) => {
    console.log(`🧹 Processing cleanup job: ${job.name} (${job.id})`);

    switch (job.name) {
        case 'cleanup-user':
            await handleUserCleanup(job.data);
            break;
        case 'cleanup-batch':
            await handleBatchCleanup(job.data.batchId);
            break;
        case 'cleanup-lecture':
            await handleLectureCleanup(job.data.lectureId);
            break;
        default:
            console.warn(`Unknown cleanup job type: ${job.name}`);
    }
}, {
    connection,
    concurrency: 2,
});

worker.on('completed', (job) => {
    console.log(`✅ Cleanup job ${job.id} (${job.name}) completed`);
});

worker.on('failed', (job, err) => {
    console.error(`❌ Cleanup job ${job.id} (${job.name}) failed:`, err.message);
});

worker.on('error', (err) => {
    console.error('Worker error:', err);
});

console.log('🧹 Cleanup worker started and listening for jobs...');
