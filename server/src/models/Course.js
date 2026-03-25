import mongoose from 'mongoose';

const questionSchema = mongoose.Schema({
    question: { type: String, required: true },
    options: [{ type: String, required: true }],
    correctAnswer: { type: Number, required: true }, // 0-indexed
}, { _id: false });

const moduleSchema = mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String },
    content: { type: String },
    completed: { type: Boolean, default: false },
    quiz: [questionSchema],
    quizScore: { type: Number }, // Percentage score
});

const courseSchema = mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: 'User',
        },
        title: {
            type: String,
            required: true,
        },
        description: {
            type: String,
            required: true,
        },
        level: {
            type: String,
            required: true,
        },
        modules: [moduleSchema],
        isGenerated: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
    }
);

const Course = mongoose.model('Course', courseSchema);

export default Course;
