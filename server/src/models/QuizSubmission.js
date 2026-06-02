import mongoose from 'mongoose';
import softDeletePlugin from './plugins/softDeletePlugin.js';

const quizSubmissionSchema = new mongoose.Schema({
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    quiz: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true },
    batch: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch', required: true },
    
    // For MCQ it's an array of indices (or -1 if unanswered). For subjective it's an array of text strings.
    answers: [{ type: mongoose.Schema.Types.Mixed }], 
    
    score: { type: Number, default: 0 },
    status: { type: String, enum: ['pending', 'submitted', 'graded'], default: 'pending' },
    
    // Timer Tracking
    startedAt: { type: Date },
    timeLimitOverride: { type: Number },
    submittedAt: { type: Date },

    gradedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, {
    timestamps: true
});

quizSubmissionSchema.plugin(softDeletePlugin);
// One submission per student per quiz
quizSubmissionSchema.index({ student: 1, quiz: 1 }, { unique: true });

const QuizSubmission = mongoose.model('QuizSubmission', quizSubmissionSchema);
export default QuizSubmission;
