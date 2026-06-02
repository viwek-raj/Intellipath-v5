import mongoose from 'mongoose';
import softDeletePlugin from './plugins/softDeletePlugin.js';

const questionSchema = new mongoose.Schema({
    questionText: { type: String, required: true },
    options: [{ type: String }], // For MCQ
    correctOptionIndex: { type: Number }, // For MCQ, 0-indexed
    maxPoints: { type: Number, default: 1 } // For subjective (and standard 1 for MCQ)
});

const quizSchema = new mongoose.Schema({
    batch: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch', required: true, index: true },
    instructor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    quizType: { type: String, enum: ['mcq', 'subjective'], required: true },
    isEvaluated: { type: Boolean, default: false }, // Only relevant for subjective (or if instructor wants to manually trigger MCQ grades)
    
    // Timer Constraints
    availableFrom: { type: Date, required: true },
    availableUntil: { type: Date, required: true },
    timeLimitMinutes: { type: Number, required: true },
    
    questions: [questionSchema]
}, {
    timestamps: true
});

quizSchema.plugin(softDeletePlugin);

const Quiz = mongoose.model('Quiz', quizSchema);
export default Quiz;
