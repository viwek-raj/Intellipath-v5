import User from '../models/User.js';
import Batch from '../models/Batch.js';
import Lecture from '../models/Lecture.js';
import cache from '../services/cacheService.js';

/**
 * @desc    Get public stats for landing page
 * @route   GET /api/public/stats
 * @access  Public
 */
export const getLandingPageStats = async (req, res) => {
    try {
        const data = await cache.getOrFetch(
            cache.keys.landingStats(),
            async () => {
                const studentCount = await User.countDocuments({ role: 'student', accountStatus: 'active' });
                const instructorCount = await User.countDocuments({ role: 'instructor', accountStatus: 'active' });
                const batchCount = await Batch.countDocuments({ isActive: true });
                return { students: studentCount, instructors: instructorCount, batches: batchCount };
            },
            cache.TTL.LANDING_STATS
        );

        res.json(data);
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
        const data = await cache.getOrFetch(
            cache.keys.featuredBatches(),
            async () => {
                const batches = await Batch.find({ isActive: true })
                    .populate('instructor', 'name')
                    .sort({ createdAt: -1 })
                    .limit(6);

                const enriched = await Promise.all(
                    batches.map(async (batch) => {
                        const batchObj = batch.toObject();
                        batchObj.studentCount = batch.students.length;
                        batchObj.lectureCount = await Lecture.countDocuments({ batch: batch._id, isPublished: true });
                        delete batchObj.students;
                        return batchObj;
                    })
                );
                return enriched;
            },
            cache.TTL.FEATURED_BATCHES
        );

        res.json(data);
    } catch (error) {
        console.error('Error fetching featured batches:', error);
        res.status(500).json({ message: 'Server error fetching featured batches' });
    }
};

