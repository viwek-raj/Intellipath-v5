/**
 * @module healthRoutes
 * @description System health check endpoint for monitoring and interviews.
 *
 * GET /api/health returns:
 *  - Server uptime
 *  - Memory usage (RSS, heap)
 *  - MongoDB connection state
 *  - Redis connection state
 *  - Cache hit/miss stats
 *  - Node.js version
 *  - Environment
 */

import express from 'express';
import mongoose from 'mongoose';
import cache from '../services/cacheService.js';

const router = express.Router();

/**
 * @desc    System health check
 * @route   GET /api/health
 * @access  Public
 */
router.get('/', (req, res) => {
    const memUsage = process.memoryUsage();
    const cacheStats = cache.stats();

    // MongoDB connection states: 0=disconnected, 1=connected, 2=connecting, 3=disconnecting
    const mongoStates = ['disconnected', 'connected', 'connecting', 'disconnecting'];
    const mongoState = mongoose.connection.readyState;

    res.json({
        success: true,
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: {
            seconds: Math.floor(process.uptime()),
            human: formatUptime(process.uptime()),
        },
        environment: process.env.NODE_ENV || 'development',
        nodeVersion: process.version,
        database: {
            status: mongoStates[mongoState] || 'unknown',
            host: mongoose.connection.host || 'N/A',
            name: mongoose.connection.name || 'N/A',
        },
        cache: {
            hits: cacheStats.hits,
            misses: cacheStats.misses,
            keys: cacheStats.keys,
            hitRate: cacheStats.hits + cacheStats.misses > 0
                ? `${Math.round((cacheStats.hits / (cacheStats.hits + cacheStats.misses)) * 100)}%`
                : '0%',
        },
        memory: {
            rss: `${Math.round(memUsage.rss / 1024 / 1024)} MB`,
            heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)} MB`,
            heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)} MB`,
            external: `${Math.round(memUsage.external / 1024 / 1024)} MB`,
        },
    });
});

/**
 * Format seconds into a human-readable string.
 * @param {number} seconds
 * @returns {string}
 */
function formatUptime(seconds) {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const parts = [];
    if (d > 0) parts.push(`${d}d`);
    if (h > 0) parts.push(`${h}h`);
    if (m > 0) parts.push(`${m}m`);
    parts.push(`${s}s`);
    return parts.join(' ');
}

export default router;
