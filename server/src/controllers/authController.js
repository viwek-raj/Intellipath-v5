import User from '../models/User.js';
import Course from '../models/Course.js';
import generateToken from '../utils/generateToken.js';

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
const authUser = async (req, res) => {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (user && (await user.matchPassword(password))) {
        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            token: generateToken(res, user._id),
        });
    } else {
        res.status(401).json({ message: 'Invalid email or password' });
    }
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
    const { name, email, password } = req.body;

    const userExists = await User.findOne({ email });

    if (userExists) {
        res.status(400).json({ message: 'User already exists' });
        return;
    }

    const user = await User.create({
        name,
        email,
        password,
    });

    if (user) {
        res.status(201).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            token: generateToken(res, user._id),
        });
    } else {
        res.status(400).json({ message: 'Invalid user data' });
    }
};

// @desc    Delete user account and all associated data
// @route   DELETE /api/auth/profile
// @access  Private
const deleteAccount = async (req, res) => {
    const user = await User.findById(req.user._id);

    if (user) {
        // Delete all courses by this user
        await Course.deleteMany({ user: user._id });

        // Delete the user
        await user.deleteOne();

        res.json({ message: 'User and all associated data removed' });
    } else {
        res.status(404);
        throw new Error('User not found');
    }
};

export { authUser, registerUser, deleteAccount };
