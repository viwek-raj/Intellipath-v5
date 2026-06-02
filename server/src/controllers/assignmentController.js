import Assignment from '../models/Assignment.js';
import AssignmentSubmission from '../models/AssignmentSubmission.js';
import Batch from '../models/Batch.js';
import fs from 'fs';
import path from 'path';
import { safeEnqueue } from '../config/queue.js';
import { getAssignmentCreatedEmailHtml, getAssignmentGradedEmailHtml } from '../services/emailService.js';

// INSTRUCTOR

export const createAssignment = async (req, res) => {
    try {
        const { batchId, title, instructions, dueDate, maxPoints } = req.body;
        
        const batch = await Batch.findById(batchId);
        if (!batch) return res.status(404).json({ message: 'Batch not found' });
        
        if (batch.instructor.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const assignment = await Assignment.create({
            batch: batchId,
            instructor: req.user._id,
            title,
            instructions,
            dueDate,
            allowLateSubmissions: req.body.allowLateSubmissions || false,
            maxPoints: maxPoints || 100
        });

        // Enqueue email to students
        const populatedBatch = await Batch.findById(batchId).populate('students', 'email');
        for (const student of populatedBatch.students) {
            safeEnqueue('email', 'assignment-created', {
                to: student.email,
                subject: `New Assignment: ${title}`,
                html: getAssignmentCreatedEmailHtml(batch.title, title)
            });
        }

        res.status(201).json(assignment);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to create assignment' });
    }
};

export const getInstructorAssignments = async (req, res) => {
    try {
        const assignments = await Assignment.find({ batch: req.params.batchId }).sort({ dueDate: 1 });
        res.json(assignments);
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch assignments' });
    }
};

export const getAssignmentSubmissions = async (req, res) => {
    try {
        const submissions = await AssignmentSubmission.find({ assignment: req.params.id })
            .populate('student', 'name email')
            .sort({ createdAt: -1 });
        res.json(submissions);
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch submissions' });
    }
};

export const evaluateAssignment = async (req, res) => {
    try {
        const { score, feedback } = req.body;
        const submission = await AssignmentSubmission.findById(req.params.subId).populate('assignment');
        if (!submission) return res.status(404).json({ message: 'Submission not found' });
        
        if (submission.assignment.instructor.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized' });
        }

        submission.gradedScore = score;
        submission.instructorFeedback = feedback;
        submission.status = 'graded';
        submission.gradedBy = req.user._id;
        
        await submission.save();

        // Enqueue graded email
        const populatedSub = await AssignmentSubmission.findById(submission._id).populate('student', 'email name').populate('assignment', 'title');
        safeEnqueue('email', 'assignment-graded', {
            to: populatedSub.student.email,
            subject: `Assignment Graded: ${populatedSub.assignment.title}`,
            html: getAssignmentGradedEmailHtml(populatedSub.student.name, populatedSub.assignment.title, score)
        });

        res.json(submission);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to evaluate assignment' });
    }
};

// STUDENT

export const getStudentAssignments = async (req, res) => {
    try {
        const batch = await Batch.findById(req.params.batchId);
        if (!batch) return res.status(404).json({ message: 'Batch not found' });

        if (!batch.students.includes(req.user._id)) {
            return res.status(403).json({ message: 'Not enrolled' });
        }

        const assignments = await Assignment.find({ batch: req.params.batchId }).sort({ dueDate: 1 });
        
        // Merge with submissions
        const submissions = await AssignmentSubmission.find({ batch: req.params.batchId, student: req.user._id });
        const subMap = submissions.reduce((acc, sub) => {
            acc[sub.assignment.toString()] = sub;
            return acc;
        }, {});

        const result = assignments.map(a => {
            const assignObj = a.toObject();
            assignObj.submission = subMap[a._id.toString()] || null;
            return assignObj;
        });

        res.json(result);
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch assignments' });
    }
};

export const submitAssignment = async (req, res) => {
    try {
        const assignment = await Assignment.findById(req.params.id);
        if (!assignment) return res.status(404).json({ message: 'Assignment not found' });

        let submission = await AssignmentSubmission.findOne({ assignment: assignment._id, student: req.user._id });
        
        const now = new Date();
        if (!assignment.allowLateSubmissions && now > assignment.dueDate) {
            return res.status(400).json({ message: 'Assignment is closed for late submissions.' });
        }
        
        const file = req.file;
        const { externalLink } = req.body;

        if (!file && !externalLink) {
            return res.status(400).json({ message: 'Must provide either a PDF file or an external link' });
        }

        const submissionType = file ? 'file' : 'link';

        if (submission) {
            // Update existing submission if not graded yet
            if (submission.status === 'graded') {
                return res.status(400).json({ message: 'Cannot update a graded assignment' });
            }
            submission.submissionType = submissionType;
            if (file) {
                // If there's an old file, we could delete it, but for simplicity let's just overwrite path
                submission.fileUrl = file.path;
                submission.externalLink = '';
            } else {
                submission.externalLink = externalLink;
                submission.fileUrl = '';
            }
        } else {
            submission = new AssignmentSubmission({
                student: req.user._id,
                assignment: assignment._id,
                batch: assignment.batch,
                submissionType,
                fileUrl: file ? file.path : '',
                externalLink: externalLink || '',
                status: 'submitted'
            });
        }

        await submission.save();
        res.status(201).json(submission);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to submit assignment' });
    }
};

export const downloadAssignmentFile = async (req, res) => {
    try {
        const submission = await AssignmentSubmission.findById(req.params.subId).populate('assignment');
        if (!submission || submission.submissionType !== 'file' || !submission.fileUrl) {
            return res.status(404).json({ message: 'File not found' });
        }

        // Must be instructor or the student who submitted it
        const isStudent = submission.student.toString() === req.user._id.toString();
        const isInstructor = submission.assignment.instructor.toString() === req.user._id.toString();
        
        if (!isStudent && !isInstructor && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized to download' });
        }

        res.download(submission.fileUrl);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Download failed' });
    }
};
