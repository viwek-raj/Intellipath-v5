import Quiz from '../models/Quiz.js';
import QuizSubmission from '../models/QuizSubmission.js';
import Batch from '../models/Batch.js';
import { safeEnqueue } from '../config/queue.js';
import { getQuizCreatedEmailHtml, getAssignmentGradedEmailHtml } from '../services/emailService.js';

// INSTRUCTOR

export const createQuiz = async (req, res) => {
    try {
        const { batchId, title, description, quizType, availableFrom, availableUntil, timeLimitMinutes, questions } = req.body;
        
        const batch = await Batch.findById(batchId);
        if (!batch) return res.status(404).json({ message: 'Batch not found' });
        
        if (batch.instructor.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const quiz = await Quiz.create({
            batch: batchId,
            instructor: req.user._id,
            title,
            description,
            quizType,
            availableFrom,
            availableUntil,
            timeLimitMinutes,
            questions
        });

        // Enqueue email to students
        const populatedBatch = await Batch.findById(batchId).populate('students', 'email');
        for (const student of populatedBatch.students) {
            safeEnqueue('email', 'quiz-created', {
                to: student.email,
                subject: `New Quiz: ${title}`,
                html: getQuizCreatedEmailHtml(batch.title, title)
            });
        }

        res.status(201).json(quiz);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to create quiz' });
    }
};

export const getInstructorQuizzes = async (req, res) => {
    try {
        const quizzes = await Quiz.find({ batch: req.params.batchId }).sort({ createdAt: -1 });
        res.json(quizzes);
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch quizzes' });
    }
};

export const getQuizSubmissions = async (req, res) => {
    try {
        const submissions = await QuizSubmission.find({ quiz: req.params.id })
            .populate('student', 'name email')
            .sort({ submittedAt: -1 });
        res.json(submissions);
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch submissions' });
    }
};

export const evaluateSubmission = async (req, res) => {
    try {
        const { score, feedback } = req.body;
        const submission = await QuizSubmission.findById(req.params.subId).populate('quiz');
        if (!submission) return res.status(404).json({ message: 'Submission not found' });
        
        if (submission.quiz.instructor.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized' });
        }

        if (submission.quiz.quizType === 'mcq') {
            // Auto evaluate MCQ
            let autoScore = 0;
            submission.answers.forEach((ans, idx) => {
                const correctIdx = submission.quiz.questions[idx]?.correctOptionIndex;
                if (correctIdx !== undefined && ans !== null && ans !== '' && Number(ans) === correctIdx) {
                    autoScore += 1;
                }
            });
            submission.score = autoScore;
        } else {
            // Manual evaluate Subjective
            submission.score = score || 0;
            // Optionally add feedback field to schema if needed later, right now we just do score
        }
        
        submission.status = 'graded';
        submission.gradedBy = req.user._id;
        await submission.save();

        // Enqueue graded email (using assignment graded email template since the format is the same)
        const populatedSub = await QuizSubmission.findById(submission._id).populate('student', 'email name').populate('quiz', 'title');
        safeEnqueue('email', 'quiz-graded', {
            to: populatedSub.student.email,
            subject: `Quiz Graded: ${populatedSub.quiz.title}`,
            html: getAssignmentGradedEmailHtml(populatedSub.student.name, populatedSub.quiz.title, submission.score)
        });

        res.json(submission);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to evaluate' });
    }
};

export const reopenSubmission = async (req, res) => {
    try {
        const submission = await QuizSubmission.findById(req.params.subId).populate('quiz');
        if (!submission) return res.status(404).json({ message: 'Submission not found' });
        
        if (submission.quiz.instructor.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const { timeLimitOverride } = req.body;

        // Reset submission state
        submission.status = 'pending';
        submission.answers = new Array(submission.quiz.questions.length).fill(null);
        submission.score = 0;
        submission.startedAt = undefined;
        submission.submittedAt = undefined;
        submission.gradedBy = undefined;
        if (timeLimitOverride) {
            submission.timeLimitOverride = timeLimitOverride;
        } else {
            submission.timeLimitOverride = undefined;
        }

        await submission.save();

        res.json({ message: 'Submission reopened successfully. Student can now reattempt.', submission });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to reopen submission' });
    }
};

// STUDENT

export const getStudentQuizzes = async (req, res) => {
    try {
        const batch = await Batch.findById(req.params.batchId);
        if (!batch) return res.status(404).json({ message: 'Batch not found' });

        if (!batch.students.includes(req.user._id)) {
            return res.status(403).json({ message: 'Not enrolled' });
        }

        // Don't strip correctOptionIndex initially here, we will handle it in mapping
        const quizzes = await Quiz.find({ batch: req.params.batchId });
        
        // Merge with submissions
        const submissions = await QuizSubmission.find({ batch: req.params.batchId, student: req.user._id });
        const subMap = submissions.reduce((acc, sub) => {
            acc[sub.quiz.toString()] = sub;
            return acc;
        }, {});

        const result = quizzes.map(q => {
            const quizObj = q.toObject();
            quizObj.submission = subMap[q._id.toString()] || null;
            // Only expose correct options if the submission is graded
            if (!quizObj.submission || quizObj.submission.status !== 'graded') {
                quizObj.questions.forEach(question => {
                    delete question.correctOptionIndex;
                });
            }
            return quizObj;
        });

        res.json(result);
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch quizzes' });
    }
};

export const startQuiz = async (req, res) => {
    try {
        const quiz = await Quiz.findById(req.params.id);
        if (!quiz) return res.status(404).json({ message: 'Quiz not found' });

        const now = new Date();
        if (now < quiz.availableFrom || now > quiz.availableUntil) {
            return res.status(400).json({ message: 'Quiz is not available at this time' });
        }

        let submission = await QuizSubmission.findOne({ quiz: quiz._id, student: req.user._id });
        if (submission) {
            // If it was reopened, startedAt will be missing
            if (!submission.startedAt) {
                submission.startedAt = now;
                await submission.save();
            }
            return res.status(200).json({
                submission,
                serverTime: new Date()
            }); // Already started
        }

        submission = await QuizSubmission.create({
            student: req.user._id,
            quiz: quiz._id,
            batch: quiz.batch,
            startedAt: now,
            status: 'pending',
            answers: new Array(quiz.questions.length).fill(null)
        });

        res.status(201).json({
            submission,
            serverTime: new Date()
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to start quiz' });
    }
};

export const submitQuiz = async (req, res) => {
    try {
        const { answers } = req.body;
        const submission = await QuizSubmission.findOne({ quiz: req.params.id, student: req.user._id }).populate('quiz');
        if (!submission) return res.status(404).json({ message: 'Quiz not started' });

        if (submission.status !== 'pending') {
            return res.status(400).json({ message: 'Quiz already submitted' });
        }

        const now = new Date();
        const timeElapsed = (now - submission.startedAt) / 60000;
        
        const limit = submission.timeLimitOverride || submission.quiz.timeLimitMinutes;
        // Add 1 minute buffer for network latency
        if (timeElapsed > limit + 1) {
            return res.status(400).json({ message: 'Time limit exceeded' });
        }

        submission.answers = answers;
        submission.submittedAt = now;
        
        if (submission.quiz.quizType === 'mcq') {
            let autoScore = 0;
            answers.forEach((ans, idx) => {
                const correctIdx = submission.quiz.questions[idx]?.correctOptionIndex;
                if (correctIdx !== undefined && ans !== null && ans !== '' && Number(ans) === correctIdx) {
                    autoScore += 1;
                }
            });
            submission.score = autoScore;
            submission.status = 'graded';
        } else {
            submission.status = 'submitted';
        }
        
        await submission.save();

        res.json(submission);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to submit quiz' });
    }
};
