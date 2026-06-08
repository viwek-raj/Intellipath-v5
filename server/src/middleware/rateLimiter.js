/**
 * @module rateLimiter
 * @description Rate limiting middleware to prevent brute-force attacks and API abuse.
 * 
 * Three tiers:
 *  - globalLimiter  → 100 requests per 15 minutes (all routes)
 *  - authLimiter    → 10 requests per 15 minutes (login/register only)
 *  - apiLimiter     → 60 requests per 1 minute (authenticated API calls)
 */

import rateLimit from 'express-rate-limit';

/**
 * Global rate limiter — applied to every request.
 * Generous enough for normal browsing, but blocks automated scanners.
 */
export const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    standardHeaders: true,    // Return rate limit info in `RateLimit-*` headers
    legacyHeaders: false,     // Disable `X-RateLimit-*` headers
    message: {
        success: false,
        message: 'Too many requests from this IP. Please try again after 15 minutes.',
        code: 'RATE_LIMIT_EXCEEDED',
    },
});

/**
 * Strict limiter for authentication endpoints (login, register).
 * Prevents credential-stuffing and brute-force attacks.
 */
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Too many login attempts. Please try again after 15 minutes.',
        code: 'AUTH_RATE_LIMIT_EXCEEDED',
    },
});

/**
 * API limiter for authenticated endpoints.
 * Prevents a single user from hammering the API.
 */
export const apiLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Too many API requests. Please slow down.',
        code: 'API_RATE_LIMIT_EXCEEDED',
    },
});
