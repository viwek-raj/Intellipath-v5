/**
 * @module queue
 * @description Shared BullMQ queue definitions for background job processing.
 *
 * Queues are created lazily — the Redis connection is only established
 * when a job is actually enqueued, so the API server starts fine
 * even if Redis is temporarily unavailable.
 *
 * Queues:
 *  - transcodingQueue – video transcoding jobs (raw → HLS)
 *  - cleanupQueue     – file / resource cleanup jobs
 */

import { Queue } from 'bullmq';
import IORedis from 'ioredis';

let _connection = null;
let _transcodingQueue = null;
let _cleanupQueue = null;
let _emailQueue = null;

/**
 * Get or create the shared Redis connection.
 * Lazy — only connects on first use.
 */
function getConnection() {
    if (!_connection) {
        _connection = new IORedis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', {
            maxRetriesPerRequest: null, // Required by BullMQ
            retryStrategy(times) {
                // Exponential backoff capped at 30s
                const delay = Math.min(times * 500, 30000);
                return delay;
            },
            lazyConnect: true,
        });

        _connection.on('error', (err) => {
            console.warn(`⚠️ Redis connection error: ${err.message}. Queue jobs will retry when Redis is available.`);
        });

        _connection.on('connect', () => {
            console.log('✅ Redis connected for BullMQ queues');
        });
    }
    return _connection;
}

/**
 * Get the transcoding queue. Creates on first access.
 */
function getTranscodingQueue() {
    if (!_transcodingQueue) {
        _transcodingQueue = new Queue('transcoding', { connection: getConnection() });
    }
    return _transcodingQueue;
}

/**
 * Get the cleanup queue. Creates on first access.
 */
function getCleanupQueue() {
    if (!_cleanupQueue) {
        _cleanupQueue = new Queue('cleanup', { connection: getConnection() });
    }
    return _cleanupQueue;
}

/**
 * Get the email queue. Creates on first access.
 */
function getEmailQueue() {
    if (!_emailQueue) {
        _emailQueue = new Queue('email', { connection: getConnection() });
    }
    return _emailQueue;
}

/**
 * Safely enqueue a job — swallows Redis/BullMQ errors so that the
 * calling controller can still return a success response.
 * Returns the BullMQ Job on success, or null on failure.
 *
 * @param {'transcoding' | 'cleanup' | 'email'} queueName
 * @param {string} jobName
 * @param {object} data
 * @param {object} [opts]
 * @returns {Promise<import('bullmq').Job | null>}
 */
async function safeEnqueue(queueName, jobName, data, opts = {}) {
    try {
        let queue;
        if (queueName === 'transcoding') queue = getTranscodingQueue();
        else if (queueName === 'cleanup') queue = getCleanupQueue();
        else if (queueName === 'email') queue = getEmailQueue();
        else throw new Error(`Unknown queue name: ${queueName}`);
        
        return await queue.add(jobName, data, opts);
    } catch (err) {
        console.warn(`⚠️ Failed to enqueue "${jobName}" on "${queueName}" queue: ${err.message}`);
        console.warn('   The job will not be processed until Redis ≥ 5.0 is available and the worker is running.');

        // Fallback for emails: process synchronously if Redis fails
        if (queueName === 'email') {
            console.log('🔄 Redis is unavailable. Processing email job synchronously as a fallback...');
            try {
                const { sendEmail } = await import('../services/emailService.js');
                await sendEmail(data);
                console.log('✅ Synchronous email processing succeeded.');
            } catch (fallbackErr) {
                console.error('❌ Synchronous email processing failed:', fallbackErr.message);
            }
        }

        return null;
    }
}

export { getConnection, getTranscodingQueue, getCleanupQueue, getEmailQueue, safeEnqueue };
