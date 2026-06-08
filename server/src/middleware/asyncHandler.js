/**
 * @module asyncHandler
 * @description Wraps async Express route handlers so that rejected promises
 * are automatically forwarded to the centralized error handler instead of
 * causing unhandled promise rejections.
 *
 * Usage:
 *   import asyncHandler from '../middleware/asyncHandler.js';
 *   router.get('/route', asyncHandler(async (req, res) => { ... }));
 */

const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

export default asyncHandler;
