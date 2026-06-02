import User from '../models/User.js';
import Batch from '../models/Batch.js';
import Lecture from '../models/Lecture.js';

/**
 * @desc    Get public stats for landing page
 * @route   GET /api/public/stats
 * @access  Public
 */
export const getLandingPageStats = async (req, res) => {
    try {
        const studentCount = await User.countDocuments({ role: 'student', accountStatus: 'active' });
        const instructorCount = await User.countDocuments({ role: 'instructor', accountStatus: 'active' });
        const batchCount = await Batch.countDocuments({ isActive: true });

        res.json({
            students: studentCount,
            instructors: instructorCount,
            batches: batchCount
        });
    } catch (error) {
        console.error('Error fetching public stats:', error);
        res.status(500).json({ message: 'Server error fetching stats' });
    }
};

/**
 * @desc    Get featured batches for landing page
 * @route   GET /api/public/batches/featured
 * @access  Public
 */
export const getFeaturedBatches = async (req, res) => {
    try {
        // Fetch up to 6 active batches
        const batches = await Batch.find({ isActive: true })
            .populate('instructor', 'name')
            .sort({ createdAt: -1 })
            .limit(6);

        // Enrich with basic stats (student count)
        const enriched = await Promise.all(
            batches.map(async (batch) => {
                const batchObj = batch.toObject();
                batchObj.studentCount = batch.students.length;
                batchObj.lectureCount = await Lecture.countDocuments({ batch: batch._id, isPublished: true });
                // Hide private arrays
                delete batchObj.students;
                return batchObj;
            })
        );

        res.json(enriched);
    } catch (error) {
        console.error('Error fetching featured batches:', error);
        res.status(500).json({ message: 'Server error fetching featured batches' });
    }
};
