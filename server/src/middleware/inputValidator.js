/**
 * @module inputValidator
 * @description Reusable input validation middleware using express-validator.
 * 
 * Each validator exports an array of validation chains followed by
 * a handleValidationErrors middleware that returns 400 on failure.
 */

import { body, validationResult } from 'express-validator';

/**
 * Middleware that checks the validation result and returns 400 if there are errors.
 * Must be placed AFTER the validation chains in the middleware array.
 */
export const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array().map(err => ({
                field: err.path,
                message: err.msg,
            })),
        });
    }
    next();
};

/**
 * Validate user registration input.
 */
export const validateRegistration = [
    body('name')
        .trim()
        .notEmpty().withMessage('Name is required')
        .isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),
    body('email')
        .trim()
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Please provide a valid email address')
        .normalizeEmail(),
    body('password')
        .notEmpty().withMessage('Password is required')
        .isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
        .matches(/\d/).withMessage('Password must contain at least one number'),
    body('role')
        .optional()
        .isIn(['student', 'instructor']).withMessage('Role must be student or instructor'),
    handleValidationErrors,
];

/**
 * Validate user login input.
 */
export const validateLogin = [
    body('email')
        .trim()
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Please provide a valid email address'),
    body('password')
        .notEmpty().withMessage('Password is required'),
    handleValidationErrors,
];

/**
 * Validate batch creation input.
 */
export const validateBatchCreate = [
    body('title')
        .trim()
        .notEmpty().withMessage('Batch title is required')
        .isLength({ min: 3, max: 200 }).withMessage('Title must be 3-200 characters'),
    body('startDate')
        .notEmpty().withMessage('Start date is required')
        .isISO8601().withMessage('Start date must be a valid date'),
    body('endDate')
        .notEmpty().withMessage('End date is required')
        .isISO8601().withMessage('End date must be a valid date'),
    body('maxStudents')
        .optional()
        .isInt({ min: 0 }).withMessage('Max students must be a non-negative integer'),
    handleValidationErrors,
];

/**
 * Validate quiz creation input.
 */
export const validateQuizCreate = [
    body('title')
        .trim()
        .notEmpty().withMessage('Quiz title is required')
        .isLength({ min: 3, max: 200 }).withMessage('Title must be 3-200 characters'),
    body('quizType')
        .notEmpty().withMessage('Quiz type is required')
        .isIn(['mcq', 'subjective']).withMessage('Quiz type must be mcq or subjective'),
    body('questions')
        .isArray({ min: 1 }).withMessage('At least one question is required'),
    body('timeLimitMinutes')
        .optional()
        .isInt({ min: 1 }).withMessage('Time limit must be at least 1 minute'),
    handleValidationErrors,
];
