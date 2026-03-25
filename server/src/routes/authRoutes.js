import express from 'express';
import { authUser, registerUser, deleteAccount } from '../controllers/authController.js';

import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', authUser);
router.delete('/profile', protect, deleteAccount);

export default router;
