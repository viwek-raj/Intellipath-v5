import mongoose from 'mongoose';

const activitySchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User',
    },
    date: {
        type: String, // Format: YYYY-MM-DD
        required: true,
    },
    count: {
        type: Number,
        default: 1,
    }
}, {
    timestamps: true,
});

// Compound index to quickly find a user's activity for a specific date
activitySchema.index({ user: 1, date: 1 }, { unique: true });

const Activity = mongoose.model('Activity', activitySchema);

export default Activity;
