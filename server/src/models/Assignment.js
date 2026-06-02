import mongoose from 'mongoose';
import softDeletePlugin from './plugins/softDeletePlugin.js';

const assignmentSchema = new mongoose.Schema({
    batch: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch', required: true, index: true },
    instructor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true },
    instructions: { type: String, required: true },
    dueDate: { type: Date, required: true },
    allowLateSubmissions: { type: Boolean, default: false },
    maxPoints: { type: Number, default: 100 }
}, {
    timestamps: true
});

assignmentSchema.plugin(softDeletePlugin);

const Assignment = mongoose.model('Assignment', assignmentSchema);
export default Assignment;
