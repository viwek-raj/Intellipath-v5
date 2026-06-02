/**
 * Transcoding Worker — Separate Node.js process
 * 
 * Connects to Redis + MongoDB independently.
 * Does NOT import Express or app.js.
 * Started via: npm run worker:transcode
 */
import 'dotenv/config';
import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import mongoose from 'mongoose';
import { transcodeToHls } from '../src/services/transcodingService.js';
import Lecture from '../src/models/Lecture.js';

const connection = new IORedis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', {
    maxRetriesPerRequest: null,
});

await mongoose.connect(process.env.MONGO_URI);
console.log('🎬 Transcoding worker connected to MongoDB');

const worker = new Worker('transcoding', async (job) => {
    const { lectureId, inputPath } = job.data;
    console.log(`🎬 Processing transcode job for lecture: ${lectureId}`);

    // Update status to processing
    await Lecture.findByIdAndUpdate(lectureId, { videoStatus: 'processing' });

    try {
        const { hlsPath, duration } = await transcodeToHls(inputPath, lectureId);

        await Lecture.findByIdAndUpdate(lectureId, {
            videoStatus: 'ready',
            videoHlsPath: hlsPath,
            videoDuration: duration,
            isPublished: true,
        });

        console.log(`✅ Transcoding complete: ${lectureId} (${duration}s)`);
        return { lectureId, duration };
    } catch (error) {
        await Lecture.findByIdAndUpdate(lectureId, { videoStatus: 'failed' });
        console.error(`❌ Transcoding failed: ${lectureId}`, error.message);
        throw error; // BullMQ will retry based on attempts config
    }
}, {
    connection,
    concurrency: 1,       // Only 1 transcode at a time (CPU-bound)
    limiter: {
        max: 2,
        duration: 60000,  // Max 2 jobs per minute
    },
});

worker.on('completed', (job) => {
    console.log(`✅ Job ${job.id} completed for lecture ${job.data.lectureId}`);
});

worker.on('failed', (job, err) => {
    console.error(`❌ Job ${job.id} failed for lecture ${job.data.lectureId}:`, err.message);
});

worker.on('error', (err) => {
    console.error('Worker error:', err);
});

console.log('🎬 Transcoding worker started and listening for jobs...');
