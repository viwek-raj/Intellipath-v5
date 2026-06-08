import Batch from '../models/Batch.js';
import Lecture from '../models/Lecture.js';
import WatchHistory from '../models/WatchHistory.js';
import User from '../models/User.js';
import { safeEnqueue } from '../config/queue.js';
import { getBatchJoinEmailHtml } from '../services/emailService.js';
import cache from '../services/cacheService.js';

// ============================================================
// INSTRUCTOR-FACING
// ============================================================

/**
 * @desc    Create a new batch
 * @route   POST /api/batches
 * @access  Private/Instructor
 */
const createBatch = async (req, res) => {
    try {
        const { title, description, startDate, endDate, maxStudents } = req.body;

        if (!title || !startDate || !endDate) {
            return res.status(400).json({ message: 'Title, startDate, and endDate are required' });
        }

        if (new Date(endDate) <= new Date(startDate)) {
            return res.status(400).json({ message: 'End date must be after start date' });
        }

        const batch = await Batch.create({
            instructor: req.user._id,
            title,
            description: description || '',
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            maxStudents: maxStudents || 0,
        });

        res.status(201).json(batch);

        // Invalidate batch-related caches
        cache.invalidateByPrefix('batch:');
        cache.invalidateByPrefix('public:');
    } catch (error) {
        console.error('Create Batch Error:', error);
        res.status(500).json({ message: 'Failed to create batch' });
    }
};

/**
 * @desc    Get instructor's batches with student/lecture counts
 * @route   GET /api/batches/my
 * @access  Private/Instructor
 */
const getMyBatches = async (req, res) => {
    try {
        const data = await cache.getOrFetch(
            cache.keys.myBatches(req.user._id.toString()),
            async () => {
                const batches = await Batch.find({ instructor: req.user._id })
                    .sort({ createdAt: -1 });

                const enriched = await Promise.all(
                    batches.map(async (batch) => {
                        const batchObj = batch.toObject();
                        batchObj.studentCount = batch.students.length;
                        batchObj.lectureCount = await Lecture.countDocuments({ batch: batch._id });
                        return batchObj;
                    })
                );
                return enriched;
            },
            cache.TTL.MY_BATCHES
        );

        res.json(data);
    } catch (error) {
        console.error('Get My Batches Error:', error);
        res.status(500).json({ message: 'Failed to fetch batches' });
    }
};

/**
 * @desc    Update batch metadata (only owner)
 * @route   PUT /api/batches/:id
 * @access  Private/Instructor
 */
const updateBatch = async (req, res) => {
    try {
        const batch = await Batch.findById(req.params.id);
        if (!batch) {
            return res.status(404).json({ message: 'Batch not found' });
        }

        if (batch.instructor.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized — you do not own this batch' });
        }

        const { title, description, startDate, endDate, maxStudents, isActive } = req.body;
        if (title !== undefined) batch.title = title;
        if (description !== undefined) batch.description = description;
        if (startDate !== undefined) batch.startDate = new Date(startDate);
        if (endDate !== undefined) batch.endDate = new Date(endDate);
        if (maxStudents !== undefined) batch.maxStudents = maxStudents;
        if (isActive !== undefined) batch.isActive = isActive;

        await batch.save();

        // Invalidate batch-related caches
        cache.invalidateByPrefix('batch:');
        cache.invalidateByPrefix('public:');

        res.json(batch);
    } catch (error) {
        console.error('Update Batch Error:', error);
        res.status(500).json({ message: 'Failed to update batch' });
    }
};

/**
 * @desc    Soft delete a batch + enqueue cleanup
 * @route   DELETE /api/batches/:id
 * @access  Private/Instructor
 */
const deleteBatch = async (req, res) => {
    try {
        const batch = await Batch.findById(req.params.id);
        if (!batch) {
            return res.status(404).json({ message: 'Batch not found' });
        }

        if (batch.instructor.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized — you do not own this batch' });
        }

        // Soft delete (instant)
        await batch.softDelete(req.user._id);

        // Enqueue background cleanup for hard purge
        await safeEnqueue('cleanup', 'cleanup-batch', {
            batchId: batch._id.toString(),
        }, {
            attempts: 3,
            backoff: { type: 'exponential', delay: 3000 },
        });

        res.json({ message: 'Batch deleted. Background cleanup in progress.' });

        // Invalidate batch-related caches
        cache.invalidateByPrefix('batch:');
        cache.invalidateByPrefix('public:');
    } catch (error) {
        console.error('Delete Batch Error:', error);
        res.status(500).json({ message: 'Failed to delete batch' });
    }
};

/**
 * @desc    Get students in a batch with per-lecture watch progress
 * @route   GET /api/batches/:id/students
 * @access  Private/Instructor
 */
const getBatchStudents = async (req, res) => {
    try {
        const batch = await Batch.findById(req.params.id)
            .populate('students', 'name email createdAt');

        if (!batch) {
            return res.status(404).json({ message: 'Batch not found' });
        }

        if (batch.instructor.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        // Get watch data for each student in this batch
        const studentsWithProgress = await Promise.all(
            batch.students.map(async (student) => {
                const watchRecords = await WatchHistory.find({
                    student: student._id,
                    batch: batch._id,
                });

                const totalLectures = await Lecture.countDocuments({ batch: batch._id });
                const watchedLectures = watchRecords.filter(w => w.percentWatched > 0).length;
                const totalWatchedSeconds = watchRecords.reduce((sum, w) => sum + w.watchedSeconds, 0);
                const lastActive = watchRecords.length > 0
                    ? watchRecords.sort((a, b) => b.lastWatchedAt - a.lastWatchedAt)[0].lastWatchedAt
                    : null;

                return {
                    _id: student._id,
                    name: student.name,
                    email: student.email,
                    joinedAt: student.createdAt,
                    watchedLectures,
                    totalLectures,
                    totalWatchedSeconds,
                    lastActive,
                };
            })
        );

        res.json(studentsWithProgress);
    } catch (error) {
        console.error('Get Batch Students Error:', error);
        res.status(500).json({ message: 'Failed to fetch batch students' });
    }
};

/**
 * @desc    Remove a student from batch roster
 * @route   DELETE /api/batches/:id/students/:studentId
 * @access  Private/Instructor
 */
const removeStudentFromBatch = async (req, res) => {
    try {
        const batch = await Batch.findById(req.params.id);
        if (!batch) {
            return res.status(404).json({ message: 'Batch not found' });
        }

        if (batch.instructor.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const studentIndex = batch.students.indexOf(req.params.studentId);
        if (studentIndex === -1) {
            return res.status(404).json({ message: 'Student not in this batch' });
        }

        batch.students.splice(studentIndex, 1);
        await batch.save();

        // Delete watch history for this student in this batch
        await WatchHistory.deleteMany({
            student: req.params.studentId,
            batch: batch._id,
        });

        res.json({ message: 'Student removed from batch' });
    } catch (error) {
        console.error('Remove Student Error:', error);
        res.status(500).json({ message: 'Failed to remove student' });
    }
};

/**
 * @desc    Get detailed analytics for a batch
 * @route   GET /api/batches/:id/analytics
 * @access  Private/Instructor
 */
const getBatchAnalytics = async (req, res) => {
    try {
        const batch = await Batch.findById(req.params.id);
        if (!batch) {
            return res.status(404).json({ message: 'Batch not found' });
        }

        if (batch.instructor.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        // Per-lecture stats
        const lectures = await Lecture.find({ batch: batch._id }).sort({ order: 1 });
        const lectureStats = await Promise.all(
            lectures.map(async (lecture) => {
                const watchRecords = await WatchHistory.find({ lecture: lecture._id });
                const uniqueViewers = watchRecords.filter(w => w.watchedSeconds > 0).length;
                const avgWatch = watchRecords.length > 0
                    ? watchRecords.reduce((s, w) => s + w.percentWatched, 0) / watchRecords.length
                    : 0;

                return {
                    _id: lecture._id,
                    title: lecture.title,
                    order: lecture.order,
                    viewCount: lecture.viewCount,
                    uniqueViewers,
                    avgWatchPercent: Math.round(avgWatch),
                };
            })
        );

        // Per-student stats
        const studentStats = await Promise.all(
            batch.students.map(async (studentId) => {
                const student = await User.findById(studentId).select('name email');
                const watchRecords = await WatchHistory.find({
                    student: studentId,
                    batch: batch._id,
                });

                const lecturesWatched = watchRecords.filter(w => w.percentWatched > 0).length;
                const totalTime = watchRecords.reduce((s, w) => s + w.watchedSeconds, 0);
                const lastActive = watchRecords.length > 0
                    ? watchRecords.sort((a, b) => b.lastWatchedAt - a.lastWatchedAt)[0].lastWatchedAt
                    : null;

                return {
                    _id: studentId,
                    name: student?.name || 'Unknown',
                    email: student?.email || '',
                    lecturesWatched,
                    totalLectures: lectures.length,
                    totalWatchedSeconds: totalTime,
                    lastActive,
                };
            })
        );

        res.json({
            batchTitle: batch.title,
            totalStudents: batch.students.length,
            totalLectures: lectures.length,
            lectureStats,
            studentStats,
        });
    } catch (error) {
        console.error('Batch Analytics Error:', error);
        res.status(500).json({ message: 'Failed to fetch analytics' });
    }
};

// ============================================================
// STUDENT-FACING
// ============================================================

/**
 * @desc    Browse available batches (active, from approved instructors)
 * @route   GET /api/batches/browse?search=&page=&limit=
 * @access  Private/Approved
 */
const browseBatches = async (req, res) => {
    try {
        const { search, page = 1, limit = 12 } = req.query;

        const filter = { isActive: true };
        if (search) {
            filter.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
            ];
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const total = await Batch.countDocuments(filter);

        const batches = await Batch.find(filter)
            .populate('instructor', 'name email bio specializations')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        // Enrich with lecture count and student count
        const enriched = await Promise.all(
            batches.map(async (batch) => {
                const batchObj = batch.toObject();
                batchObj.studentCount = batch.students.length;
                batchObj.lectureCount = await Lecture.countDocuments({ batch: batch._id, isPublished: true });
                // Check if current user is enrolled
                batchObj.isEnrolled = batch.students.some(
                    (s) => s.toString() === req.user._id.toString()
                );
                return batchObj;
            })
        );

        res.json({
            batches: enriched,
            page: parseInt(page),
            pages: Math.ceil(total / parseInt(limit)),
            total,
        });
    } catch (error) {
        console.error('Browse Batches Error:', error);
        res.status(500).json({ message: 'Failed to browse batches' });
    }
};

/**
 * @desc    Join a batch (add to roster)
 * @route   POST /api/batches/:id/join
 * @access  Private/Approved
 */
const joinBatch = async (req, res) => {
    try {
        const batch = await Batch.findById(req.params.id);
        if (!batch) {
            return res.status(404).json({ message: 'Batch not found' });
        }

        if (!batch.isActive) {
            return res.status(400).json({ message: 'This batch is not active' });
        }

        // Check if already enrolled
        if (batch.students.some((s) => s.toString() === req.user._id.toString())) {
            return res.status(400).json({ message: 'Already enrolled in this batch' });
        }

        // Check capacity
        if (batch.maxStudents > 0 && batch.students.length >= batch.maxStudents) {
            return res.status(400).json({ message: 'Batch is full' });
        }

        batch.students.push(req.user._id);
        await batch.save();

        // Enqueue welcome email
        await safeEnqueue('email', 'batch-join', {
            to: req.user.email,
            subject: `Welcome to ${batch.title}!`,
            html: getBatchJoinEmailHtml(req.user.name, batch.title)
        });

        res.json({ message: 'Successfully joined batch', batchId: batch._id });

        // Invalidate relevant caches
        cache.invalidateByPrefix('batch:');
        cache.invalidateByPrefix('public:');
        cache.invalidateByPrefix(`student:analytics:${req.user._id}`);
    } catch (error) {
        console.error('Join Batch Error:', error);
        res.status(500).json({ message: 'Failed to join batch' });
    }
};

/**
 * @desc    Leave a batch
 * @route   POST /api/batches/:id/leave
 * @access  Private/Approved
 */
const leaveBatch = async (req, res) => {
    try {
        const batch = await Batch.findById(req.params.id);
        if (!batch) {
            return res.status(404).json({ message: 'Batch not found' });
        }

        const studentIndex = batch.students.indexOf(req.user._id);
        if (studentIndex === -1) {
            return res.status(400).json({ message: 'Not enrolled in this batch' });
        }

        batch.students.splice(studentIndex, 1);
        await batch.save();

        // Delete watch history
        await WatchHistory.deleteMany({
            student: req.user._id,
            batch: batch._id,
        });

        res.json({ message: 'Left batch successfully' });

        // Invalidate relevant caches
        cache.invalidateByPrefix('batch:');
        cache.invalidateByPrefix(`student:analytics:${req.user._id}`);
    } catch (error) {
        console.error('Leave Batch Error:', error);
        res.status(500).json({ message: 'Failed to leave batch' });
    }
};

/**
 * @desc    Get student's enrolled batches with lecture count
 * @route   GET /api/batches/enrolled
 * @access  Private/Approved
 */
const getMyEnrolledBatches = async (req, res) => {
    try {
        const data = await cache.getOrFetch(
            cache.keys.enrolledBatches(req.user._id.toString()),
            async () => {
                const batches = await Batch.find({ students: req.user._id })
                    .populate('instructor', 'name email bio')
                    .sort({ startDate: -1 });

                const enriched = await Promise.all(
                    batches.map(async (batch) => {
                        const batchObj = batch.toObject();
                        const totalLectures = await Lecture.countDocuments({ batch: batch._id, isPublished: true });
                        const watchedLectures = await WatchHistory.countDocuments({
                            student: req.user._id,
                            batch: batch._id,
                            percentWatched: { $gte: 90 },
                        });

                        batchObj.lectureCount = totalLectures;
                        batchObj.watchedCount = watchedLectures;
                        batchObj.studentCount = batch.students.length;
                        batchObj.progress = totalLectures > 0
                            ? Math.round((watchedLectures / totalLectures) * 100)
                            : 0;

                        return batchObj;
                    })
                );
                return enriched;
            },
            cache.TTL.ENROLLED_BATCHES
        );

        res.json(data);
    } catch (error) {
        console.error('Get Enrolled Batches Error:', error);
        res.status(500).json({ message: 'Failed to fetch enrolled batches' });
    }
};

/**
 * @desc    Get batch detail (only if enrolled or instructor)
 * @route   GET /api/batches/:id
 * @access  Private/Approved
 */
const getBatchDetail = async (req, res) => {
    try {
        const batch = await Batch.findById(req.params.id)
            .populate('instructor', 'name email bio specializations');

        if (!batch) {
            return res.status(404).json({ message: 'Batch not found' });
        }

        // Check access: must be enrolled student or the instructor
        const isInstructor = batch.instructor._id.toString() === req.user._id.toString();
        const isEnrolled = batch.students.some(
            (s) => s.toString() === req.user._id.toString()
        );
        const isAdmin = req.user.role === 'admin';

        if (!isInstructor && !isEnrolled && !isAdmin) {
            return res.status(403).json({ message: 'You must be enrolled to view this batch' });
        }

        // Get lectures with student's watch progress
        const lectures = await Lecture.find({ batch: batch._id, isPublished: true })
            .populate('tags', 'name slug')
            .sort({ order: 1 });

        let lecturesWithProgress = lectures;
        if (req.user.role === 'student' || isEnrolled) {
            const watchRecords = await WatchHistory.find({
                student: req.user._id,
                batch: batch._id,
            });

            const watchMap = {};
            watchRecords.forEach((w) => {
                watchMap[w.lecture.toString()] = w;
            });

            lecturesWithProgress = lectures.map((lecture) => {
                const lectureObj = lecture.toObject();
                const progress = watchMap[lecture._id.toString()];
                lectureObj.watchProgress = progress
                    ? {
                        watchedSeconds: progress.watchedSeconds,
                        percentWatched: progress.percentWatched,
                        lastWatchedAt: progress.lastWatchedAt,
                    }
                    : { watchedSeconds: 0, percentWatched: 0, lastWatchedAt: null };
                return lectureObj;
            });
        }

        const batchObj = batch.toObject();
        batchObj.lectures = lecturesWithProgress;
        batchObj.studentCount = batch.students.length;
        batchObj.isEnrolled = isEnrolled;
        batchObj.isInstructor = isInstructor;

        res.json(batchObj);
    } catch (error) {
        console.error('Get Batch Detail Error:', error);
        res.status(500).json({ message: 'Failed to fetch batch detail' });
    }
};

export {
    // Instructor-facing
    createBatch,
    getMyBatches,
    updateBatch,
    deleteBatch,
    getBatchStudents,
    removeStudentFromBatch,
    getBatchAnalytics,
    // Student-facing
    browseBatches,
    joinBatch,
    leaveBatch,
    getMyEnrolledBatches,
    getBatchDetail,
};
