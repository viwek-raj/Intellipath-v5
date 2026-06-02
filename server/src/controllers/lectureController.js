import Lecture from '../models/Lecture.js';
import Batch from '../models/Batch.js';
import WatchHistory from '../models/WatchHistory.js';
import Tag from '../models/Tag.js';
import User from '../models/User.js';
import { safeEnqueue } from '../config/queue.js';
import { getLectureUploadEmailHtml } from '../services/emailService.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import Mux from '@mux/mux-node';

let muxInstance = null;
const getMux = () => {
    if (!muxInstance) {
        muxInstance = new Mux({
            tokenId: process.env.MUX_TOKEN_ID,
            tokenSecret: process.env.MUX_TOKEN_SECRET,
        });
    }
    return muxInstance;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOAD_ROOT = path.resolve(__dirname, '../../uploads');

// ============================================================
// INSTRUCTOR-FACING
// ============================================================

/**
 * @desc    Upload a lecture (video + optional PDF) → enqueue transcoding
 * @route   POST /api/lectures
 * @access  Private/Instructor
 */
export const generateMuxUploadUrl = async (req, res) => {
    try {
        const mux = getMux();
        const upload = await mux.video.uploads.create({
            new_asset_settings: {
                playback_policy: ['public'],
            },
            cors_origin: '*', // For development. In prod, restrict to domain.
        });
        res.json({ uploadId: upload.id, uploadUrl: upload.url });
    } catch (err) {
        console.error('Mux direct upload error:', err);
        res.status(500).json({ message: 'Failed to generate upload URL' });
    }
};

export const syncMuxStatus = async (req, res) => {
    try {
        const lecture = await Lecture.findById(req.params.id);
        if (!lecture) return res.status(404).json({ message: 'Lecture not found' });
        
        if (lecture.isLive) {
            return res.json(lecture); // Daily streams don't need mux sync
        }

        if (!lecture.muxUploadId) return res.json(lecture);

        const mux = getMux();
        // Fetch upload status from Mux
        const upload = await mux.video.uploads.retrieve(lecture.muxUploadId);
        
        if (upload.asset_id && !lecture.muxAssetId) {
            lecture.muxAssetId = upload.asset_id;
        }

        if (lecture.muxAssetId) {
            const asset = await mux.video.assets.retrieve(lecture.muxAssetId);
            if (asset.status === 'ready') {
                lecture.videoStatus = 'ready';
                lecture.isPublished = true;
                lecture.videoDuration = asset.duration;
                if (asset.playback_ids && asset.playback_ids.length > 0) {
                    lecture.muxPlaybackId = asset.playback_ids[0].id;
                }
            } else if (asset.status === 'errored') {
                lecture.videoStatus = 'failed';
            }
        } else if (upload.status === 'errored') {
            lecture.videoStatus = 'failed';
        }

        await lecture.save();
        res.json(lecture);
    } catch (err) {
        console.error('Mux sync error:', err);
        res.status(500).json({ message: 'Failed to sync with Mux' });
    }
};

export const createLiveStream = async (req, res) => {
    try {
        const { batchId, title, description, tags: tagIds } = req.body;

        if (!batchId || !title) {
            return res.status(400).json({ message: 'batchId and title are required' });
        }

        const batch = await Batch.findById(batchId);
        if (!batch) return res.status(404).json({ message: 'Batch not found' });
        if (batch.instructor.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        // Generate a random Jitsi Meet URL (No API key or credit card needed)
        const roomName = `intellipath-live-${batchId}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
        const jitsiUrl = `https://meet.jit.si/${roomName}`;

        const lastLecture = await Lecture.findOne({ batch: batchId }).sort({ order: -1 });
        const nextOrder = lastLecture ? lastLecture.order + 1 : 0;
        
        let parsedTags = [];
        if (tagIds) {
            parsedTags = Array.isArray(tagIds) ? tagIds : tagIds.split(',').map(t => t.trim());
        }

        const lecture = await Lecture.create({
            batch: batchId,
            instructor: req.user._id,
            title,
            description: description || '',
            order: nextOrder,
            tags: parsedTags,
            isLive: true,
            liveStatus: 'scheduled',
            isPublished: true, 
            liveRoomUrl: jitsiUrl,
            videoStatus: 'ready' 
        });

        res.status(201).json(lecture);
    } catch (err) {
        console.error('Create Live Stream Error:', err);
        res.status(500).json({ message: 'Failed to create live stream' });
    }
};

export const completeLiveStream = async (req, res) => {
    try {
        const lecture = await Lecture.findById(req.params.id);
        if (!lecture || !lecture.isLive) {
            return res.status(404).json({ message: 'Live lecture not found' });
        }

        // We can optionally delete the Daily room here if we want to restrict access, 
        // but for now, marking it as 'ended' in the database is enough.
        
        lecture.liveStatus = 'ended';
        await lecture.save();

        res.json(lecture);
    } catch (err) {
        console.error('End Live Stream Error:', err);
        res.status(500).json({ message: 'Failed to end live stream' });
    }
};

const uploadLecture = async (req, res) => {
    try {
        const { batchId, title, description, tags: tagIds } = req.body;

        if (!batchId || !title) {
            return res.status(400).json({ message: 'batchId and title are required' });
        }

        // Verify batch ownership
        const batch = await Batch.findById(batchId);
        if (!batch) {
            return res.status(404).json({ message: 'Batch not found' });
        }
        if (batch.instructor.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized — you do not own this batch' });
        }

        // Get next order number
        const lastLecture = await Lecture.findOne({ batch: batchId })
            .sort({ order: -1 });
        const nextOrder = lastLecture ? lastLecture.order + 1 : 0;

        // Process uploaded files
        const pdfFile = req.files?.pdf?.[0];
        const { muxUploadId } = req.body;

        // Parse tag IDs from comma-separated string or array
        let parsedTags = [];
        if (tagIds) {
            parsedTags = Array.isArray(tagIds) ? tagIds : tagIds.split(',').map(t => t.trim());
        }

        // Create lecture record
        const lecture = await Lecture.create({
            batch: batchId,
            instructor: req.user._id,
            title,
            description: description || '',
            order: nextOrder,
            tags: parsedTags,
            muxUploadId: muxUploadId || null,
            videoStatus: muxUploadId ? 'processing' : 'pending_upload',
            isPublished: false, // Initially false until video is ready
            notesPath: pdfFile?.path || null,
            notesFilename: pdfFile?.originalname || null,
        });

        res.status(201).json({
            _id: lecture._id,
            title: lecture.title,
            videoStatus: lecture.videoStatus,
            order: lecture.order,
            message: muxUploadId ? 'Lecture uploaded. Mux is processing the video.' : 'Lecture metadata uploaded. Waiting for video.',
        });

        // Enqueue email to all students in the batch
        const populatedBatch = await Batch.findById(batchId).populate('students', 'email name');
        for (const student of populatedBatch.students) {
            safeEnqueue('email', 'lecture-upload', {
                to: student.email,
                subject: `New Lecture in ${batch.title}: ${lecture.title}`,
                html: getLectureUploadEmailHtml(batch.title, lecture.title)
            });
        }
    } catch (error) {
        console.error('Upload Lecture Error:', error);
        res.status(500).json({ message: 'Failed to upload lecture', error: error.message });
    }
};

/**
 * @desc    Attach or update the video for a lecture
 * @route   PUT /api/lectures/:id/video
 * @access  Private/Instructor
 */
const attachVideo = async (req, res) => {
    try {
        const lecture = await Lecture.findById(req.params.id);
        if (!lecture) return res.status(404).json({ message: 'Lecture not found' });
        
        // Check ownership
        const batch = await Batch.findById(lecture.batch);
        if (batch.instructor.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const videoFile = req.files?.video?.[0];
        if (!videoFile) return res.status(400).json({ message: 'Video file is required' });

        lecture.videoOriginalPath = videoFile.path;
        lecture.videoOriginalFilename = videoFile.originalname;
        lecture.videoStatus = 'uploading';
        lecture.isPublished = true;
        await lecture.save();

        const job = await safeEnqueue('transcoding', 'transcode', {
            lectureId: lecture._id.toString(),
            inputPath: videoFile.path,
        }, {
            attempts: 3,
            backoff: { type: 'exponential', delay: 5000 },
            removeOnComplete: true,
            removeOnFail: false,
        });

        if (!job) {
            console.log(`⚠️ Redis/BullMQ unavailable for transcoding. Running in-process transcoding fallback for lecture ${lecture._id}...`);
            import('../services/transcodingService.js').then(async (transcodingService) => {
                try {
                    await Lecture.findByIdAndUpdate(lecture._id, { videoStatus: 'processing' });
                    const { hlsPath, duration } = await transcodingService.transcodeToHls(videoFile.path, lecture._id);
                    await Lecture.findByIdAndUpdate(lecture._id, {
                        videoStatus: 'ready',
                        videoHlsPath: hlsPath,
                        videoDuration: duration,
                        isPublished: true,
                    });
                    console.log(`✅ In-process transcoding completed successfully for lecture ${lecture._id}`);
                } catch (err) {
                    console.error(`❌ In-process transcoding failed for lecture ${lecture._id}:`, err);
                    await Lecture.findByIdAndUpdate(lecture._id, { videoStatus: 'failed' });
                }
            }).catch(err => console.error(`❌ In-process transcoding import failed for lecture ${lecture._id}:`, err));
            
            lecture.videoStatus = 'processing';
            await lecture.save();
        } else {
            lecture.videoStatus = 'processing';
            await lecture.save();
        }

        res.json({ message: 'Video attached and transcoding started', videoStatus: lecture.videoStatus });
    } catch (error) {
        console.error('Attach Video Error:', error);
        res.status(500).json({ message: 'Failed to attach video' });
    }
};

/**
 * @desc    Attach or update the PDF notes for a lecture
 * @route   PUT /api/lectures/:id/notes
 * @access  Private/Instructor
 */
const attachNotes = async (req, res) => {
    try {
        const lecture = await Lecture.findById(req.params.id);
        if (!lecture) return res.status(404).json({ message: 'Lecture not found' });
        
        // Check ownership
        const batch = await Batch.findById(lecture.batch);
        if (batch.instructor.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const pdfFile = req.files?.pdf?.[0];
        if (!pdfFile) return res.status(400).json({ message: 'PDF file is required' });

        lecture.notesPath = pdfFile.path;
        lecture.notesFilename = pdfFile.originalname;
        await lecture.save();

        res.json({ message: 'Notes attached successfully' });
    } catch (error) {
        console.error('Attach Notes Error:', error);
        res.status(500).json({ message: 'Failed to attach notes' });
    }
};

/**
 * @desc    Poll upload/transcoding status
 * @route   GET /api/lectures/:id/status
 * @access  Private/Instructor
 */
const getUploadStatus = async (req, res) => {
    try {
        const lecture = await Lecture.findById(req.params.id).select('videoStatus isPublished title');
        if (!lecture) {
            return res.status(404).json({ message: 'Lecture not found' });
        }

        res.json({
            _id: lecture._id,
            title: lecture.title,
            videoStatus: lecture.videoStatus,
            isPublished: lecture.isPublished,
        });
    } catch (error) {
        console.error('Get Upload Status Error:', error);
        res.status(500).json({ message: 'Failed to get status' });
    }
};

/**
 * @desc    Update lecture metadata (title, description, tags)
 * @route   PUT /api/lectures/:id
 * @access  Private/Instructor
 */
const updateLecture = async (req, res) => {
    try {
        const lecture = await Lecture.findById(req.params.id);
        if (!lecture) {
            return res.status(404).json({ message: 'Lecture not found' });
        }

        if (lecture.instructor.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const { title, description, tags: tagIds } = req.body;
        if (title !== undefined) lecture.title = title;
        if (description !== undefined) lecture.description = description;
        if (tagIds !== undefined) {
            lecture.tags = Array.isArray(tagIds) ? tagIds : tagIds.split(',').map(t => t.trim());
        }

        await lecture.save();
        res.json(lecture);
    } catch (error) {
        console.error('Update Lecture Error:', error);
        res.status(500).json({ message: 'Failed to update lecture' });
    }
};

/**
 * @desc    Soft delete a lecture + enqueue cleanup
 * @route   DELETE /api/lectures/:id
 * @access  Private/Instructor
 */
const deleteLecture = async (req, res) => {
    try {
        const lecture = await Lecture.findById(req.params.id);
        if (!lecture) {
            return res.status(404).json({ message: 'Lecture not found' });
        }

        if (lecture.instructor.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        // Soft delete (instant)
        await lecture.softDelete(req.user._id);

        // Enqueue background cleanup
        await safeEnqueue('cleanup', 'cleanup-lecture', {
            lectureId: lecture._id.toString(),
        }, {
            attempts: 3,
            backoff: { type: 'exponential', delay: 3000 },
        });

        res.json({ message: 'Lecture deleted. Background cleanup in progress.' });
    } catch (error) {
        console.error('Delete Lecture Error:', error);
        res.status(500).json({ message: 'Failed to delete lecture' });
    }
};

/**
 * @desc    Reorder lectures in a batch using bulkWrite (single DB round-trip)
 * @route   PUT /api/lectures/reorder
 * @access  Private/Instructor
 */
const reorderLectures = async (req, res) => {
    try {
        const { batchId, ordering } = req.body;
        // ordering: [{ lectureId: "...", order: 0 }, { lectureId: "...", order: 1 }, ...]

        if (!batchId || !ordering || !Array.isArray(ordering)) {
            return res.status(400).json({ message: 'batchId and ordering array are required' });
        }

        // Verify batch ownership
        const batch = await Batch.findById(batchId);
        if (!batch) {
            return res.status(404).json({ message: 'Batch not found' });
        }
        if (batch.instructor.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized — you do not own this batch' });
        }

        // Validate all lectures belong to this batch
        const lectureIds = ordering.map(o => o.lectureId);
        const lectures = await Lecture.find({
            _id: { $in: lectureIds },
            batch: batchId,
        });

        if (lectures.length !== lectureIds.length) {
            return res.status(400).json({ message: 'Some lectures do not belong to this batch' });
        }

        // Build bulkWrite operations — single DB round-trip
        const operations = ordering.map(({ lectureId, order }) => ({
            updateOne: {
                filter: { _id: lectureId, batch: batchId },
                update: { $set: { order } },
            },
        }));

        await Lecture.bulkWrite(operations);

        res.json({ message: 'Lectures reordered successfully', count: operations.length });
    } catch (error) {
        console.error('Reorder Lectures Error:', error);
        res.status(500).json({ message: 'Failed to reorder lectures' });
    }
};

/**
 * @desc    Get per-student analytics for a lecture
 * @route   GET /api/lectures/:id/analytics
 * @access  Private/Instructor
 */
const getLectureAnalytics = async (req, res) => {
    try {
        const lecture = await Lecture.findById(req.params.id);
        if (!lecture) {
            return res.status(404).json({ message: 'Lecture not found' });
        }

        if (lecture.instructor.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const watchRecords = await WatchHistory.find({ lecture: lecture._id })
            .populate('student', 'name email');

        const analytics = watchRecords.map((record) => ({
            studentId: record.student?._id,
            name: record.student?.name || 'Unknown',
            email: record.student?.email || '',
            watchedSeconds: record.watchedSeconds,
            percentWatched: record.percentWatched,
            lastWatchedAt: record.lastWatchedAt,
        }));

        res.json({
            lectureTitle: lecture.title,
            totalViews: lecture.viewCount,
            students: analytics,
        });
    } catch (error) {
        console.error('Lecture Analytics Error:', error);
        res.status(500).json({ message: 'Failed to fetch analytics' });
    }
};

// ============================================================
// STUDENT-FACING
// ============================================================

/**
 * @desc    Get published lectures for a batch (enrolled only)
 * @route   GET /api/lectures/batch/:batchId
 * @access  Private/Approved
 */
const getLecturesByBatch = async (req, res) => {
    try {
        const batch = await Batch.findById(req.params.batchId);
        if (!batch) {
            return res.status(404).json({ message: 'Batch not found' });
        }

        // Check enrollment or instructor/admin
        const isEnrolled = batch.students.some(s => s.toString() === req.user._id.toString());
        const isInstructor = batch.instructor.toString() === req.user._id.toString();
        const isAdmin = req.user.role === 'admin';

        if (!isEnrolled && !isInstructor && !isAdmin) {
            return res.status(403).json({ message: 'You must be enrolled to view lectures' });
        }

        const filter = { batch: batch._id };
        // Students only see published lectures
        if (!isInstructor && !isAdmin) {
            filter.isPublished = true;
        }

        const lectures = await Lecture.find(filter)
            .populate('tags', 'name slug')
            .sort({ order: 1 });

        // Attach watch progress for students
        if (isEnrolled) {
            const watchRecords = await WatchHistory.find({
                student: req.user._id,
                batch: batch._id,
            });
            const watchMap = {};
            watchRecords.forEach(w => {
                watchMap[w.lecture.toString()] = w;
            });

            const enriched = lectures.map(lecture => {
                const obj = lecture.toObject();
                const progress = watchMap[lecture._id.toString()];
                obj.watchProgress = progress
                    ? {
                        watchedSeconds: progress.watchedSeconds,
                        percentWatched: progress.percentWatched,
                        lastWatchedAt: progress.lastWatchedAt,
                    }
                    : { watchedSeconds: 0, percentWatched: 0, lastWatchedAt: null };
                return obj;
            });

            return res.json(enriched);
        }

        res.json(lectures);
    } catch (error) {
        console.error('Get Lectures By Batch Error:', error);
        res.status(500).json({ message: 'Failed to fetch lectures' });
    }
};

/**
 * @desc    Get a single lecture detail (enrolled only)
 * @route   GET /api/lectures/:id
 * @access  Private/Approved
 */
const getLectureById = async (req, res) => {
    try {
        const lecture = await Lecture.findById(req.params.id)
            .populate('tags', 'name slug')
            .populate('instructor', 'name email bio');

        if (!lecture) {
            return res.status(404).json({ message: 'Lecture not found' });
        }

        // Check access
        const batch = await Batch.findById(lecture.batch);
        if (!batch) {
            return res.status(404).json({ message: 'Associated batch not found' });
        }

        const isEnrolled = batch.students.some(s => s.toString() === req.user._id.toString());
        const isInstructor = lecture.instructor._id.toString() === req.user._id.toString();
        const isAdmin = req.user.role === 'admin';

        if (!isEnrolled && !isInstructor && !isAdmin) {
            return res.status(403).json({ message: 'Access denied' });
        }

        const lectureObj = lecture.toObject();

        // Include navigation (previous/next)
        const allLectures = await Lecture.find({ batch: batch._id, isPublished: true })
            .select('_id order title')
            .sort({ order: 1 });

        const currentIndex = allLectures.findIndex(l => l._id.toString() === lecture._id.toString());
        lectureObj.navigation = {
            current: currentIndex + 1,
            total: allLectures.length,
            previous: currentIndex > 0 ? allLectures[currentIndex - 1]._id : null,
            next: currentIndex < allLectures.length - 1 ? allLectures[currentIndex + 1]._id : null,
        };

        // Include batch info
        lectureObj.batchTitle = batch.title;
        lectureObj.batchId = batch._id;

        // Include watch progress
        if (isEnrolled) {
            const progress = await WatchHistory.findOne({
                student: req.user._id,
                lecture: lecture._id,
            });
            lectureObj.watchProgress = progress
                ? {
                    watchedSeconds: progress.watchedSeconds,
                    percentWatched: progress.percentWatched,
                    lastWatchedAt: progress.lastWatchedAt,
                }
                : { watchedSeconds: 0, percentWatched: 0, lastWatchedAt: null };
        }

        res.json(lectureObj);
    } catch (error) {
        console.error('Get Lecture By ID Error:', error);
        res.status(500).json({ message: 'Failed to fetch lecture' });
    }
};

/**
 * @desc    Stream HLS files (master.m3u8, variant playlists, .ts segments)
 * @route   GET /api/lectures/:id/stream/*
 * @access  Private/Approved
 */
const streamVideo = async (req, res) => {
    try {
        const lecture = await Lecture.findById(req.params.id);
        if (!lecture) {
            return res.status(404).json({ message: 'Lecture not found' });
        }

        if (lecture.videoStatus !== 'ready') {
            return res.status(400).json({ message: 'Video is not ready for streaming' });
        }

        // Check enrollment
        const batch = await Batch.findById(lecture.batch);
        if (!batch) {
            return res.status(404).json({ message: 'Batch not found' });
        }

        const isEnrolled = batch.students.some(s => s.toString() === req.user._id.toString());
        const isInstructor = batch.instructor.toString() === req.user._id.toString();
        const isAdmin = req.user.role === 'admin';

        if (!isEnrolled && !isInstructor && !isAdmin) {
            return res.status(403).json({ message: 'Access denied' });
        }

        // Serve the requested HLS file
        // req.params.path contains the path segments after /stream/
        const requestedPath = req.params.path;
        const requestedFile = Array.isArray(requestedPath) ? requestedPath.join('/') : (requestedPath || 'master.m3u8');
        const hlsDir = path.join(UPLOAD_ROOT, 'videos', 'hls', lecture._id.toString());
        const filePath = path.join(hlsDir, requestedFile);

        // Security: ensure the resolved path is within the HLS directory
        const resolvedPath = path.resolve(filePath);
        if (!resolvedPath.startsWith(path.resolve(hlsDir))) {
            return res.status(403).json({ message: 'Invalid path' });
        }

        if (!fs.existsSync(resolvedPath)) {
            return res.status(404).json({ message: 'HLS file not found' });
        }

        // Set appropriate content types
        const ext = path.extname(resolvedPath).toLowerCase();
        const contentTypes = {
            '.m3u8': 'application/vnd.apple.mpegurl',
            '.ts': 'video/mp2t',
            '.mp4': 'video/mp4',
        };

        if (contentTypes[ext]) {
            res.setHeader('Content-Type', contentTypes[ext]);
        }

        // Enable CORS for HLS playback
        res.setHeader('Access-Control-Allow-Origin', '*');

        // Stream the file
        const fileStream = fs.createReadStream(resolvedPath);
        fileStream.pipe(res);
    } catch (error) {
        console.error('Stream Video Error:', error);
        res.status(500).json({ message: 'Failed to stream video' });
    }
};

/**
 * @desc    Stream original video (fallback while transcoding)
 * @route   GET /api/lectures/:id/stream-original
 * @access  Private/Approved
 */
const streamOriginalVideo = async (req, res) => {
    try {
        const lecture = await Lecture.findById(req.params.id);
        if (!lecture) {
            return res.status(404).json({ message: 'Lecture not found' });
        }

        // Check enrollment
        const batch = await Batch.findById(lecture.batch);
        if (!batch) {
            return res.status(404).json({ message: 'Batch not found' });
        }

        const isEnrolled = batch.students.some(s => s.toString() === req.user._id.toString());
        const isInstructor = batch.instructor.toString() === req.user._id.toString();
        const isAdmin = req.user.role === 'admin';

        if (!isEnrolled && !isInstructor && !isAdmin) {
            return res.status(403).json({ message: 'Access denied' });
        }

        const videoPath = path.resolve(lecture.videoOriginalPath);
        if (!videoPath || !fs.existsSync(videoPath)) {
            return res.status(404).json({ message: 'Original video not found' });
        }

        const stat = fs.statSync(videoPath);
        const fileSize = stat.size;
        const range = req.headers.range;

        if (range) {
            const parts = range.replace(/bytes=/, "").split("-");
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
            const chunksize = (end - start) + 1;
            
            const file = fs.createReadStream(videoPath, { start, end });
            const head = {
                'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunksize,
                'Content-Type': 'video/mp4',
            };
            
            res.writeHead(206, head);
            file.pipe(res);
        } else {
            const head = {
                'Content-Length': fileSize,
                'Content-Type': 'video/mp4',
            };
            res.writeHead(200, head);
            fs.createReadStream(videoPath).pipe(res);
        }
    } catch (error) {
        console.error('Stream Original Video Error:', error);
        res.status(500).json({ message: 'Failed to stream original video' });
    }
};

/**
 * @desc    Download lecture notes PDF
 * @route   GET /api/lectures/:id/notes
 * @access  Private/Approved
 */
const downloadNotes = async (req, res) => {
    try {
        const lecture = await Lecture.findById(req.params.id);
        if (!lecture) {
            return res.status(404).json({ message: 'Lecture not found' });
        }

        if (!lecture.notesPath) {
            return res.status(404).json({ message: 'No notes available for this lecture' });
        }

        // Check enrollment
        const batch = await Batch.findById(lecture.batch);
        if (!batch) {
            return res.status(404).json({ message: 'Batch not found' });
        }

        const isEnrolled = batch.students.some(s => s.toString() === req.user._id.toString());
        const isInstructor = batch.instructor.toString() === req.user._id.toString();
        const isAdmin = req.user.role === 'admin';

        if (!isEnrolled && !isInstructor && !isAdmin) {
            return res.status(403).json({ message: 'Access denied' });
        }

        if (!fs.existsSync(lecture.notesPath)) {
            return res.status(404).json({ message: 'Notes file not found on server' });
        }

        const filename = lecture.notesFilename || 'lecture-notes.pdf';
        res.download(lecture.notesPath, filename);
    } catch (error) {
        console.error('Download Notes Error:', error);
        res.status(500).json({ message: 'Failed to download notes' });
    }
};

/**
 * @desc    Update watch progress (called by frontend every ~10-15s)
 * @route   POST /api/lectures/:id/progress
 * @access  Private/Approved
 */
const updateWatchProgress = async (req, res) => {
    try {
        const { watchedSeconds } = req.body;
        const lecture = await Lecture.findById(req.params.id);

        if (!lecture) {
            return res.status(404).json({ message: 'Lecture not found' });
        }

        // Check enrollment
        const batch = await Batch.findById(lecture.batch);
        if (!batch) {
            return res.status(404).json({ message: 'Batch not found' });
        }

        const isEnrolled = batch.students.some(s => s.toString() === req.user._id.toString());
        if (!isEnrolled) {
            return res.status(403).json({ message: 'Not enrolled in this batch' });
        }

        // Upsert watch history
        const now = new Date();
        let watchHistory = await WatchHistory.findOne({
            student: req.user._id,
            lecture: lecture._id,
        });

        if (watchHistory) {
            // Only update if we're further than before
            if (watchedSeconds > watchHistory.watchedSeconds) {
                watchHistory.watchedSeconds = watchedSeconds;
            }
            watchHistory.totalDuration = lecture.videoDuration || 0;
            watchHistory.lastWatchedAt = now;
            await watchHistory.save();
        } else {
            watchHistory = await WatchHistory.create({
                student: req.user._id,
                lecture: lecture._id,
                batch: lecture.batch,
                watchedSeconds: watchedSeconds || 0,
                totalDuration: lecture.videoDuration || 0,
                firstWatchedAt: now,
                lastWatchedAt: now,
            });

            // Increment view count on first watch
            await Lecture.findByIdAndUpdate(lecture._id, { $inc: { viewCount: 1 } });
        }

        res.json({
            watchedSeconds: watchHistory.watchedSeconds,
            percentWatched: watchHistory.percentWatched,
        });
    } catch (error) {
        console.error('Update Watch Progress Error:', error);
        res.status(500).json({ message: 'Failed to update progress' });
    }
};

/**
 * @desc    Get watch progress for a lecture
 * @route   GET /api/lectures/:id/progress
 * @access  Private/Approved
 */
const getWatchProgress = async (req, res) => {
    try {
        const watchHistory = await WatchHistory.findOne({
            student: req.user._id,
            lecture: req.params.id,
        });

        if (!watchHistory) {
            return res.json({
                watchedSeconds: 0,
                percentWatched: 0,
                lastWatchedAt: null,
            });
        }

        res.json({
            watchedSeconds: watchHistory.watchedSeconds,
            percentWatched: watchHistory.percentWatched,
            lastWatchedAt: watchHistory.lastWatchedAt,
        });
    } catch (error) {
        console.error('Get Watch Progress Error:', error);
        res.status(500).json({ message: 'Failed to get progress' });
    }
};

// ============================================================
// GLOBAL SEARCH
// ============================================================

/**
 * @desc    Search lectures by tag (across all batches)
 * @route   GET /api/lectures/tag/:tagId
 * @access  Private/Approved
 */
const searchByTag = async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const total = await Lecture.countDocuments({
            tags: req.params.tagId,
            isPublished: true,
        });

        const lectures = await Lecture.find({
            tags: req.params.tagId,
            isPublished: true,
        })
            .populate('tags', 'name slug')
            .populate('instructor', 'name')
            .populate('batch', 'title')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        // Get the tag info
        const tag = await Tag.findById(req.params.tagId)
            .populate({
                path: 'subCategory',
                populate: { path: 'category', select: 'name' },
            });

        res.json({
            tag: tag ? { name: tag.name, subCategory: tag.subCategory?.name, category: tag.subCategory?.category?.name } : null,
            lectures,
            page: parseInt(page),
            pages: Math.ceil(total / parseInt(limit)),
            total,
        });
    } catch (error) {
        console.error('Search By Tag Error:', error);
        res.status(500).json({ message: 'Failed to search lectures' });
    }
};

export {
    // Instructor-facing
    uploadLecture,
    getUploadStatus,
    updateLecture,
    deleteLecture,
    reorderLectures,
    getLectureAnalytics,
    // Student-facing
    getLecturesByBatch,
    getLectureById,
    streamVideo,
    streamOriginalVideo,
    downloadNotes,
    updateWatchProgress,
    getWatchProgress,
    // Global search
    searchByTag,
    attachVideo,
    attachNotes,
};
