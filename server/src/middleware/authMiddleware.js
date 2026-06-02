/**
 * @module authMiddleware
 * @description Express middleware for authentication and authorization.
 *
 * Exports:
 *  - protect          – Verifies JWT and attaches req.user
 *  - requireApproved  – Ensures the user's account is approved
 *  - requireRole      – Factory that restricts access to specific roles
 */

import jwt from 'jsonwebtoken';
import User from '../models/User.js';

/**
 * Verify the JWT Bearer token and attach the authenticated user to req.user.
 * Sends 401 if the token is missing or invalid.
 */
const protect = async (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        token = req.headers.authorization.split(' ')[1];
    } else if (req.query && req.query.token) {
        token = req.query.token;
    }

    if (token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            req.user = await User.findById(decoded.userId).select('-password');

            if (!req.user) {
                return res.status(401).json({ message: 'Not authorized, user not found' });
            }

            return next();
        } catch (error) {
            console.error(error);
            return res.status(401).json({ message: 'Not authorized, token failed' });
        }
    }

    if (!token) {
        return res.status(401).json({ message: 'Not authorized, no token' });
    }
};

/**
 * Ensure the authenticated user's account has been approved.
 * Must be used AFTER the `protect` middleware so that req.user exists.
 * Sends 403 if the account is not approved.
 */
const requireApproved = (req, res, next) => {
    if (req.user && req.user.accountStatus === 'active') {
        return next();
    }
    return res.status(403).json({
        message: 'Your account has been suspended. Please contact support.',
        code: 'ACCOUNT_SUSPENDED'
    });
};

/**
 * Factory that returns middleware restricting access to the specified roles.
 * Must be used AFTER the `protect` middleware so that req.user exists.
 *
 * @param  {...string} roles - Allowed role names (e.g. 'admin', 'instructor').
 * @returns {Function} Express middleware.
 *
 * @example
 * router.get('/admin-only', protect, requireRole('admin'), handler);
 */
const requireRole = (...roles) => {
    return (req, res, next) => {
        if (req.user && roles.includes(req.user.role)) {
            return next();
        }
        return res.status(403).json({
            message: `Access denied. Required role(s): ${roles.join(', ')}`,
        });
    };
};

export { protect, requireApproved, requireRole };

