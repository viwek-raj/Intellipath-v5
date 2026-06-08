import express from 'express';
import { authUser, googleAuth, registerUser, deleteAccount, changePassword, verifyEmail, subscribeNewsletter } from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';
import { validateRegistration, validateLogin } from '../middleware/inputValidator.js';

const router = express.Router();

router.post('/register', validateRegistration, registerUser);
router.post('/login', validateLogin, authUser);
router.post('/google', googleAuth);
router.post('/verify-email', verifyEmail);
router.post('/subscribe', subscribeNewsletter);
router.delete('/profile', protect, deleteAccount);
router.put('/change-password', protect, changePassword);

export default router;
