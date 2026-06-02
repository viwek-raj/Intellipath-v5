import Query from '../models/Query.js';
import Batch from '../models/Batch.js';
import { safeEnqueue } from '../config/queue.js';
import { getQueryCreatedEmailHtml, getQueryRepliedEmailHtml } from '../services/emailService.js';

// @desc    Create a new query
// @route   POST /api/queries
// @access  Private (Student)
export const createQuery = async (req, res) => {
    try {
        const { batchId, title, description } = req.body;
        const studentId = req.user._id;

        const batch = await Batch.findById(batchId);
        if (!batch) {
            return res.status(404).json({ message: 'Batch not found' });
        }

        // Verify student is enrolled in batch
        if (!batch.students.includes(studentId)) {
            return res.status(403).json({ message: 'Not enrolled in this batch' });
        }

        const query = await Query.create({
            student: studentId,
            instructor: batch.instructor,
            batch: batchId,
            title,
            description
        });

        // Enqueue email to instructor
        const populatedBatch = await Batch.findById(batchId).populate('instructor', 'email name');
        safeEnqueue('email', 'query-created', {
            to: populatedBatch.instructor.email,
            subject: `New Query in ${populatedBatch.title}: ${title}`,
            html: getQueryCreatedEmailHtml(populatedBatch.instructor.name, req.user.name, title)
        });

        res.status(201).json(query);
    } catch (error) {
        console.error('Create Query Error:', error);
        res.status(500).json({ message: 'Failed to create query' });
    }
};

// @desc    Get all queries for user (Instructor or Student)
// @route   GET /api/queries
// @access  Private
export const getQueries = async (req, res) => {
    try {
        const role = req.user.role;
        const userId = req.user._id;
        
        let filter = {};
        if (role === 'student') {
            filter.student = userId;
        } else if (role === 'instructor') {
            filter.instructor = userId;
        } else {
            return res.status(403).json({ message: 'Not authorized for queries' });
        }

        if (req.query.batchId) {
            filter.batch = req.query.batchId;
        }

        const queries = await Query.find(filter)
            .populate('student', 'name email')
            .populate('instructor', 'name email')
            .populate('batch', 'title')
            .populate('messages.sender', 'name role')
            .sort({ createdAt: -1 });

        res.json(queries);
    } catch (error) {
        console.error('Get Queries Error:', error);
        res.status(500).json({ message: 'Failed to fetch queries' });
    }
};

// @desc    Get a single query
// @route   GET /api/queries/:id
// @access  Private
export const getQueryById = async (req, res) => {
    try {
        const query = await Query.findById(req.params.id)
            .populate('student', 'name email')
            .populate('instructor', 'name email')
            .populate('batch', 'title')
            .populate('messages.sender', 'name role');

        if (!query) {
            return res.status(404).json({ message: 'Query not found' });
        }

        // Access control
        if (query.student._id.toString() !== req.user._id.toString() && query.instructor._id.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to view this query' });
        }

        res.json(query);
    } catch (error) {
        console.error('Get Query Error:', error);
        res.status(500).json({ message: 'Failed to fetch query' });
    }
};

// @desc    Reply to a query
// @route   POST /api/queries/:id/reply
// @access  Private
export const replyToQuery = async (req, res) => {
    try {
        const { text } = req.body;
        const query = await Query.findById(req.params.id);

        if (!query) {
            return res.status(404).json({ message: 'Query not found' });
        }

        if (query.student.toString() !== req.user._id.toString() && query.instructor.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to reply to this query' });
        }

        if (query.status === 'resolved') {
            return res.status(400).json({ message: 'Cannot reply to a resolved query' });
        }

        query.messages.push({
            sender: req.user._id,
            text
        });

        await query.save();

        const updatedQuery = await Query.findById(req.params.id)
            .populate('student', 'name email')
            .populate('instructor', 'name email')
            .populate('batch', 'title')
            .populate('messages.sender', 'name role');

        // Enqueue email to the other party
        const isStudent = req.user.role === 'student';
        const recipient = isStudent ? updatedQuery.instructor : updatedQuery.student;
        
        safeEnqueue('email', 'query-replied', {
            to: recipient.email,
            subject: `New Reply on Query: ${updatedQuery.title}`,
            html: getQueryRepliedEmailHtml(recipient.name, updatedQuery.title)
        });

        res.json(updatedQuery);
    } catch (error) {
        console.error('Reply Query Error:', error);
        res.status(500).json({ message: 'Failed to reply to query' });
    }
};

// @desc    Schedule a live meet
// @route   PUT /api/queries/:id/meet
// @access  Private (Instructor)
export const scheduleMeet = async (req, res) => {
    try {
        const { liveMeetUrl } = req.body;
        const query = await Query.findById(req.params.id);

        if (!query) {
            return res.status(404).json({ message: 'Query not found' });
        }

        if (query.instructor.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Only the instructor can schedule a meet' });
        }

        query.liveMeetUrl = liveMeetUrl;
        await query.save();

        res.json(query);
    } catch (error) {
        console.error('Schedule Meet Error:', error);
        res.status(500).json({ message: 'Failed to schedule meet' });
    }
};

// @desc    Resolve a query
// @route   PUT /api/queries/:id/resolve
// @access  Private
export const resolveQuery = async (req, res) => {
    try {
        const query = await Query.findById(req.params.id)
            .populate('student', 'name email')
            .populate('instructor', 'name email')
            .populate('batch', 'title')
            .populate('messages.sender', 'name role');

        if (!query) {
            return res.status(404).json({ message: 'Query not found' });
        }

        const isStudent = query.student._id.toString() === req.user._id.toString();
        const isInstructor = query.instructor._id.toString() === req.user._id.toString();

        if (!isStudent && !isInstructor) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        if (isStudent) {
            query.resolvedByStudent = true;
        }
        
        if (isInstructor) {
            query.resolvedByInstructor = true;
        }

        if (query.resolvedByStudent && query.resolvedByInstructor) {
            query.status = 'resolved';
            query.liveMeetUrl = null;
        }

        await query.save();

        res.json(query);
    } catch (error) {
        console.error('Resolve Query Error:', error);
        res.status(500).json({ message: 'Failed to resolve query' });
    }
};
