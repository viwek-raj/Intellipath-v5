import Batch from '../models/Batch.js';
import Assignment from '../models/Assignment.js';
import AssignmentSubmission from '../models/AssignmentSubmission.js';
import Quiz from '../models/Quiz.js';
import QuizSubmission from '../models/QuizSubmission.js';
import Activity from '../models/Activity.js';
import cache from '../services/cacheService.js';

/**
 * @desc    Get dashboard analytics for the student
 * @route   GET /api/student/dashboard/analytics
 * @access  Private/Approved Student
 */
export const getStudentAnalytics = async (req, res) => {
    try {
        const studentId = req.user._id;

        const data = await cache.getOrFetch(
            cache.keys.studentAnalytics(studentId.toString()),
            async () => {
                const totalBatches = await Batch.countDocuments({ students: studentId, isActive: true });
                
                const quizSubmissions = await QuizSubmission.find({ 
                    student: studentId, 
                    status: { $in: ['submitted', 'graded'] } 
                }).populate('quiz');

                const assignmentSubmissions = await AssignmentSubmission.find({ 
                    student: studentId, 
                    status: { $in: ['submitted', 'graded'] } 
                });

                const totalQuizzesTaken = quizSubmissions.length;
                const totalAssignmentsSubmitted = assignmentSubmissions.length;

                let totalQuizScore = 0;
                let gradedQuizzes = 0;

                quizSubmissions.forEach(sub => {
                    if (!sub.quiz) return;

                    let computedScore = sub.score;
                    let isGraded = sub.status === 'graded';

                    if (sub.quiz.quizType === 'mcq' && computedScore == null && sub.status === 'submitted') {
                        let autoScore = 0;
                        if (sub.answers && Array.isArray(sub.answers)) {
                            sub.answers.forEach((ans, idx) => {
                                const correctIdx = sub.quiz.questions[idx]?.correctOptionIndex;
                                if (correctIdx !== undefined && ans !== null && ans !== '' && Number(ans) === correctIdx) {
                                    autoScore += 1;
                                }
                            });
                        }
                        computedScore = autoScore;
                        isGraded = true;
                    }

                    if (isGraded && computedScore != null) {
                        let maxScore = 0;
                        if (sub.quiz.quizType === 'mcq') {
                            maxScore = sub.quiz.questions.length;
                        } else {
                            sub.quiz.questions.forEach(q => maxScore += (q.maxPoints || 1));
                        }
                        
                        if (maxScore > 0) {
                            totalQuizScore += (computedScore / maxScore) * 100;
                            gradedQuizzes++;
                        }
                    }
                });

                const avgQuizScore = gradedQuizzes > 0 ? Math.round(totalQuizScore / gradedQuizzes) : 0;

                return {
                    totalBatches,
                    totalQuizzesTaken,
                    totalAssignmentsSubmitted,
                    avgQuizScore,
                    gradedQuizzes
                };
            },
            cache.TTL.STUDENT_ANALYTICS
        );

        res.json(data);

    } catch (error) {
        console.error('Analytics Error:', error);
        res.status(500).json({ message: 'Failed to fetch analytics' });
    }
};

/**
 * @desc    Get student activity heatmap data
 * @route   GET /api/student/dashboard/activity
 * @access  Private/Approved Student
 */
export const getStudentActivity = async (req, res) => {
    try {
        const studentId = req.user._id;

        const data = await cache.getOrFetch(
            cache.keys.studentActivity(studentId.toString()),
            async () => {
                const activities = await Activity.find({ user: studentId })
                                                 .sort({ date: 1 })
                                                 .select('date count -_id');
                return activities;
            },
            cache.TTL.STUDENT_ACTIVITY
        );

        res.json(data);
    } catch (error) {
        console.error('Activity Fetch Error:', error);
        res.status(500).json({ message: 'Failed to fetch activity' });
    }
};

/**
 * @desc    Get pending tasks (assignments and quizzes) for the student
 * @route   GET /api/student/dashboard/pending-tasks
 * @access  Private/Approved Student
 */
export const getPendingTasks = async (req, res) => {
    try {
        const studentId = req.user._id;
        const now = new Date();

        // 1. Get all active batches the student is enrolled in
        const batches = await Batch.find({ students: studentId, isActive: true }).select('_id title');
        const batchIds = batches.map(b => b._id);

        if (batchIds.length === 0) {
            return res.json([]);
        }

        // 2. Fetch all assignments for these batches
        const assignments = await Assignment.find({ batch: { $in: batchIds } })
            .populate('batch', 'title');
        
        // 3. Fetch all assignment submissions for this student
        const assignmentSubmissions = await AssignmentSubmission.find({ 
            student: studentId,
            batch: { $in: batchIds }
        });
        const submittedAssignmentIds = assignmentSubmissions.map(s => s.assignment.toString());

        // Filter pending assignments (not submitted, and either allow late or due date > now)
        const pendingAssignments = assignments
            .filter(a => !submittedAssignmentIds.includes(a._id.toString()))
            .filter(a => a.allowLateSubmissions || a.dueDate > now)
            .map(a => ({
                id: a._id,
                type: 'assignment',
                title: a.title,
                batchId: a.batch._id,
                batchTitle: a.batch.title,
                dueDate: a.dueDate,
                maxPoints: a.maxPoints
            }));

        // 4. Fetch all available quizzes for these batches
        const quizzes = await Quiz.find({ 
            batch: { $in: batchIds },
            availableFrom: { $lte: now },
            availableUntil: { $gte: now }
        }).populate('batch', 'title');

        // 5. Fetch all quiz submissions for this student
        const quizSubmissions = await QuizSubmission.find({
            student: studentId,
            batch: { $in: batchIds }
        });
        // We consider it submitted if status is 'submitted' or 'graded'
        const completedQuizIds = quizSubmissions
            .filter(s => s.status === 'submitted' || s.status === 'graded')
            .map(s => s.quiz.toString());

        // Filter pending quizzes
        const pendingQuizzes = quizzes
            .filter(q => !completedQuizIds.includes(q._id.toString()))
            .map(q => ({
                id: q._id,
                type: 'quiz',
                title: q.title,
                batchId: q.batch._id,
                batchTitle: q.batch.title,
                dueDate: q.availableUntil, // Treat availableUntil as dueDate
                timeLimitMinutes: q.timeLimitMinutes
            }));

        // 6. Combine and sort by due date ascending
        const allPendingTasks = [...pendingAssignments, ...pendingQuizzes].sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

        res.json(allPendingTasks);
    } catch (error) {
        console.error('Pending Tasks Fetch Error:', error);
        res.status(500).json({ message: 'Failed to fetch pending tasks' });
    }
};
