import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import softDeletePlugin from './plugins/softDeletePlugin.js';

const userSchema = mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
        },
        email: {
            type: String,
            required: true,
            unique: true,
        },
        password: {
            type: String,
            required: true,
        },
        role: {
            type: String,
            enum: ['student', 'instructor', 'admin'],
            default: 'student',
        },

        // ── Account approval workflow ────────────────
        accountStatus: {
            type: String,
            enum: ['active', 'suspended'],
            default: 'active',
        },
        suspendedAt: { type: Date },
        suspendReason: { type: String },

        // ── Profile fields ───────────────────────────
        bio: { type: String, default: '' },
        specializations: [{ type: String }],

        // ── Security ─────────────────────────────────
        mustChangePassword: { type: Boolean, default: false },

        // ── Email Verification ───────────────────────
        isEmailVerified: { type: Boolean, default: false },
        verificationToken: { type: String },
        verificationTokenExpires: { type: Date },
    },
    {
        timestamps: true,
    }
);

// ── Apply soft-delete plugin ────────────────────
userSchema.plugin(softDeletePlugin);

userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

userSchema.pre('save', async function () {
    if (!this.isModified('password')) {
        return;
    }

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

const User = mongoose.model('User', userSchema);

export default User;

