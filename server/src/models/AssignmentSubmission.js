import mongoose from 'mongoose';
import softDeletePlugin from './plugins/softDeletePlugin.js';

const assignmentSubmissionSchema = new mongoose.Schema({
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    assignment: { type: mongoose.Schema.Types.ObjectId, ref: 'Assignment', required: true },
    batch: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch', required: true },
    
    submissionType: { type: String, enum: ['file', 'link'], required: true },
    fileUrl: { type: String }, // Path to the uploaded PDF
    externalLink: { type: String }, // Validated URL
    
    status: { type: String, enum: ['submitted', 'graded'], default: 'submitted' },
    gradedScore: { type: Number },
    instructorFeedback: { type: String, default: '' },
    
    gradedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, {
    timestamps: true
});

assignmentSubmissionSchema.plugin(softDeletePlugin);
// One submission per student per assignment
assignmentSubmissionSchema.index({ student: 1, assignment: 1 }, { unique: true });

const AssignmentSubmission = mongoose.model('AssignmentSubmission', assignmentSubmissionSchema);
export default AssignmentSubmission;
