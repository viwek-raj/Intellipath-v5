import NodeCache from 'node-cache';

// ============================================================
// CACHE CONFIGURATION
// TTL values in seconds
// ============================================================
const TTL = {
    LANDING_STATS:    10 * 60,   // 10 minutes  — public stats rarely change
    FEATURED_BATCHES: 10 * 60,   // 10 minutes  — batch list changes infrequently
    BROWSE_BATCHES:    5 * 60,   //  5 minutes  — paginated browse results
    STUDENT_ANALYTICS: 2 * 60,   //  2 minutes  — personal dashboard analytics
    STUDENT_ACTIVITY:  5 * 60,   //  5 minutes  — activity heatmap data
    BATCH_DETAIL:      3 * 60,   //  3 minutes  — individual batch page
    MY_BATCHES:        3 * 60,   //  3 minutes  — instructor's batch list
    ENROLLED_BATCHES:  3 * 60,   //  3 minutes  — student's enrolled batches
    DEFAULT:           2 * 60,   //  2 minutes  — fallback
};

// Create the cache instance
// checkperiod: how often (seconds) the cache auto-prunes expired keys
const cache = new NodeCache({ stdTTL: TTL.DEFAULT, checkperiod: 120 });

// ============================================================
// CORE CACHE OPERATIONS
// ============================================================

/**
 * Get a value from cache
 * @param {string} key - Cache key
 * @returns {any|undefined} - Cached value or undefined if miss
 */
const get = (key) => {
    return cache.get(key);
};

/**
 * Set a value in cache
 * @param {string} key   - Cache key
 * @param {any}    value - Value to cache
 * @param {number} [ttl] - TTL override in seconds (uses default if omitted)
 */
const set = (key, value, ttl) => {
    if (ttl !== undefined) {
        cache.set(key, value, ttl);
    } else {
        cache.set(key, value);
    }
};

/**
 * Delete a specific key
 * @param {string} key
 */
const del = (key) => {
    cache.del(key);
};

/**
 * Delete all keys that start with a given prefix.
 * This is the primary invalidation mechanism — when a batch is updated,
 * we call invalidateByPrefix('batch:') to wipe all batch-related cache entries.
 * @param {string} prefix
 */
const invalidateByPrefix = (prefix) => {
    const keys = cache.keys();
    const matching = keys.filter(k => k.startsWith(prefix));
    if (matching.length > 0) {
        cache.del(matching);
        console.log(`[Cache] Invalidated ${matching.length} keys with prefix "${prefix}"`);
    }
};

/**
 * Flush the entire cache
 */
const flush = () => {
    cache.flushAll();
    console.log('[Cache] Flushed all cached data');
};

/**
 * Get cache stats (hits, misses, key count)
 */
const stats = () => {
    return cache.getStats();
};

// ============================================================
// HELPER: "get or fetch" pattern
// If the key exists in cache, return it immediately.
// Otherwise, call the async fetchFn, cache the result, and return it.
// ============================================================

/**
 * @param {string}   key      - Cache key
 * @param {Function} fetchFn  - Async function that returns the data to cache
 * @param {number}   [ttl]    - TTL override in seconds
 * @returns {Promise<any>}
 */
const getOrFetch = async (key, fetchFn, ttl) => {
    const cached = get(key);
    if (cached !== undefined) {
        return cached;
    }
    const freshData = await fetchFn();
    set(key, freshData, ttl);
    return freshData;
};

// ============================================================
// NAMESPACE HELPERS (for structured key naming)
// ============================================================

const keys = {
    landingStats:       () => 'public:landing-stats',
    featuredBatches:    () => 'public:featured-batches',
    browseBatches:      (page, limit, search) => `batch:browse:${page}:${limit}:${search || ''}`,
    batchDetail:        (batchId, userId) => `batch:detail:${batchId}:${userId}`,
    myBatches:          (userId) => `batch:my:${userId}`,
    enrolledBatches:    (userId) => `batch:enrolled:${userId}`,
    studentAnalytics:   (userId) => `student:analytics:${userId}`,
    studentActivity:    (userId) => `student:activity:${userId}`,
};

export default {
    get,
    set,
    del,
    invalidateByPrefix,
    flush,
    stats,
    getOrFetch,
    keys,
    TTL,
};
