import express from 'express';
import { authUser, registerUser, deleteAccount, changePassword, verifyEmail, subscribeNewsletter } from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', authUser);
router.post('/verify-email', verifyEmail);
router.post('/subscribe', subscribeNewsletter);
router.delete('/profile', protect, deleteAccount);
router.put('/change-password', protect, changePassword);

export default router;
