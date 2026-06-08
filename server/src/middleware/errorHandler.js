/**
 * @module errorHandler
 * @description Centralized Express error handler and custom AppError class.
 *
 * Features:
 *  - Structured JSON error responses
 *  - Handles Mongoose-specific errors (validation, cast, duplicate key)
 *  - Stack traces only in development mode
 *  - Custom AppError class for throwing HTTP-aware errors
 */

/**
 * Custom application error class.
 * Throw this in controllers/services for clean, HTTP-aware error responses.
 *
 * @example
 *   throw new AppError('Batch not found', 404);
 */
export class AppError extends Error {
    constructor(message, statusCode = 500) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true; // Distinguishes expected errors from bugs
        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * Centralized error handling middleware.
 * Must be registered AFTER all routes in app.js.
 *
 * @param {Error} err
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export const errorHandler = (err, req, res, next) => {
    let statusCode = err.statusCode || 500;
    let message = err.message || 'Internal Server Error';

    // ── Mongoose: Validation Error ──────────────────────────────────
    if (err.name === 'ValidationError') {
        statusCode = 400;
        const fields = Object.values(err.errors).map(e => ({
            field: e.path,
            message: e.message,
        }));
        message = 'Validation failed';
        return res.status(statusCode).json({
            success: false,
            message,
            errors: fields,
        });
    }

    // ── Mongoose: CastError (invalid ObjectId) ─────────────────────
    if (err.name === 'CastError' && err.kind === 'ObjectId') {
        statusCode = 400;
        message = `Invalid ID format: ${err.value}`;
    }

    // ── Mongoose: Duplicate Key Error ──────────────────────────────
    if (err.code === 11000) {
        statusCode = 409;
        const field = Object.keys(err.keyValue || {})[0];
        message = `Duplicate value for field "${field}". This ${field} already exists.`;
    }

    // ── JWT Errors ─────────────────────────────────────────────────
    if (err.name === 'JsonWebTokenError') {
        statusCode = 401;
        message = 'Invalid authentication token';
    }

    if (err.name === 'TokenExpiredError') {
        statusCode = 401;
        message = 'Authentication token has expired';
    }

    // ── Log server errors ──────────────────────────────────────────
    if (statusCode >= 500) {
        console.error(`[ERROR] ${req.method} ${req.originalUrl}`, err);
    }

    // ── Send response ──────────────────────────────────────────────
    res.status(statusCode).json({
        success: false,
        message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
};
