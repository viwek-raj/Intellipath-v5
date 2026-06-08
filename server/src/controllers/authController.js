import crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import User from '../models/User.js';
import Course from '../models/Course.js';
import generateToken from '../utils/generateToken.js';
import { safeEnqueue } from '../config/queue.js';
import { getVerificationEmailHtml, getNewsletterEmailHtml } from '../services/emailService.js';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
const authUser = async (req, res) => {
    const { email, password } = req.body;

    // Use findOne with explicit includeDeleted: false (default via plugin)
    const user = await User.findOne({ email });

    if (!user) {
        return res.status(401).json({ message: 'Invalid email or password' });
    }

    if (!(await user.matchPassword(password))) {
        return res.status(401).json({ message: 'Invalid email or password' });
    }

    if (!user.isEmailVerified) {
        return res.status(403).json({ message: 'Please verify your email address before logging in.' });
    }

    // Block suspended users
    if (user.accountStatus === 'suspended') {
        return res.status(403).json({
            message: 'Your account has been suspended',
            suspendReason: user.suspendReason || '',
        });
    }

    res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        accountStatus: user.accountStatus,
        mustChangePassword: user.mustChangePassword || false,
        token: generateToken(res, user._id),
    });
};

// @desc    Auth user with Google OAuth
// @route   POST /api/auth/google
// @access  Public
const googleAuth = async (req, res) => {
    const { credential } = req.body;

    if (!credential) {
        return res.status(400).json({ message: 'Google credential is required' });
    }

    try {
        // Verify the Google ID token
        const ticket = await googleClient.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();
        const { sub: googleId, email, name, email_verified } = payload;

        if (!email_verified) {
            return res.status(401).json({ message: 'Google email is not verified' });
        }

        // Look up user by email
        let user = await User.findOne({ email }).setOptions({ includeDeleted: true });

        if (user && user.isDeleted) {
            // Previously soft-deleted account — remove it so we can re-create
            await User.deleteOne({ _id: user._id });
            user = null;
        }

        if (user) {
            // Existing user — link Google if not already linked
            if (!user.googleId) {
                user.googleId = googleId;
                user.authProvider = user.authProvider === 'local' ? 'local' : 'google';
                await user.save();
            }

            // Block suspended users
            if (user.accountStatus === 'suspended') {
                return res.status(403).json({
                    message: 'Your account has been suspended',
                    suspendReason: user.suspendReason || '',
                });
            }
        } else {
            // New user — auto-register as student
            user = await User.create({
                name: name || email.split('@')[0],
                email,
                googleId,
                authProvider: 'google',
                role: 'student',
                accountStatus: 'active',
                isEmailVerified: true, // Google already verified the email
            });
        }

        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            accountStatus: user.accountStatus,
            mustChangePassword: false,
            token: generateToken(res, user._id),
        });
    } catch (error) {
        console.error('Google Auth Error:', error);
        return res.status(401).json({ message: 'Invalid Google credential' });
    }
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
    const { name, email, password, role } = req.body;

    // Block instructor/admin self-registration
    if (role === 'instructor' || role === 'admin') {
        return res.status(403).json({ message: 'Cannot self-register as instructor or admin' });
    }

    const userExists = await User.findOne({ email }).setOptions({ includeDeleted: true });

    if (userExists) {
        if (userExists.isDeleted) {
            await User.deleteOne({ _id: userExists._id });
        } else {
            return res.status(400).json({ message: 'User already exists' });
        }
    }

    // Generate secure token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const tokenExpires = new Date();
    tokenExpires.setHours(tokenExpires.getHours() + 24); // Expires in 24 hours

    const user = await User.create({
        name,
        email,
        password,
        role: 'student',
        accountStatus: 'active',
        isEmailVerified: false,
        verificationToken,
        verificationTokenExpires: tokenExpires
    });

    if (user) {
        // Enqueue email job
        const verificationUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/verify-email?token=${verificationToken}`;
        
        await safeEnqueue('email', 'verification-email', {
            to: user.email,
            subject: 'Verify your Intellipath account',
            html: getVerificationEmailHtml(user.name, verificationUrl)
        });

        res.status(201).json({
            message: 'Registration successful! Please check your email to verify your account.',
            email: user.email
        });
    } else {
        res.status(400).json({ message: 'Invalid user data' });
    }
};

// @desc    Verify user email
// @route   POST /api/auth/verify-email
// @access  Public
const verifyEmail = async (req, res) => {
    const { token } = req.body;

    if (!token) {
        return res.status(400).json({ message: 'Verification token is required' });
    }

    const user = await User.findOne({
        verificationToken: token,
        verificationTokenExpires: { $gt: Date.now() }
    });

    if (!user) {
        return res.status(400).json({ message: 'Invalid or expired verification token' });
    }

    user.isEmailVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpires = undefined;
    await user.save();

    res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        accountStatus: user.accountStatus,
        token: generateToken(res, user._id),
    });
};

// @desc    Delete user account and all associated data
// @route   DELETE /api/auth/profile
// @access  Private
const deleteAccount = async (req, res) => {
    const user = await User.findById(req.user._id);

    if (user) {
        await Course.deleteMany({ user: user._id });
        await user.deleteOne();
        res.json({ message: 'User and all associated data removed' });
    } else {
        res.status(404).json({ message: 'User not found' });
    }
};

/**
 * @desc    Change password
 * @route   PUT /api/auth/change-password
 * @access  Private
 */
const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: 'Current and new password are required' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ message: 'New password must be at least 6 characters' });
        }

        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const isMatch = await user.matchPassword(currentPassword);
        if (!isMatch) {
            return res.status(401).json({ message: 'Current password is incorrect' });
        }

        user.password = newPassword;
        user.mustChangePassword = false;
        await user.save();

        res.json({ message: 'Password changed successfully' });
    } catch (error) {
        console.error('Change Password Error:', error);
        res.status(500).json({ message: 'Failed to change password' });
    }
};

/**
 * @desc    Subscribe to newsletter
 * @route   POST /api/auth/subscribe
 * @access  Public
 */
const subscribeNewsletter = async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ message: 'Email is required' });
    }

    // Usually you'd save this to a Newsletter collection, but for now we just send the email
    await safeEnqueue('email', 'newsletter-email', {
        to: email,
        subject: 'Welcome to the Intellipath Newsletter!',
        html: getNewsletterEmailHtml(email)
    });

    res.status(200).json({ message: 'Successfully subscribed to the newsletter' });
};

export { authUser, googleAuth, registerUser, verifyEmail, deleteAccount, changePassword, subscribeNewsletter };
