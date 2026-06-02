import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User',
    },
    text: {
        type: String,
        required: true,
    }
}, { timestamps: true });

const querySchema = new mongoose.Schema({
    student: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User',
    },
    instructor: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User',
    },
    batch: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Batch',
    },
    title: {
        type: String,
        required: true,
        trim: true,
    },
    description: {
        type: String,
        required: true,
    },
    status: {
        type: String,
        enum: ['open', 'resolved'],
        default: 'open',
    },
    resolvedByStudent: {
        type: Boolean,
        default: false,
    },
    resolvedByInstructor: {
        type: Boolean,
        default: false,
    },
    messages: [messageSchema],
    liveMeetUrl: {
        type: String,
        default: null,
    }
}, {
    timestamps: true,
});

const Query = mongoose.model('Query', querySchema);

export default Query;
