/**
 * @module transcodingService
 * @description Pure ffmpeg/ffprobe transcoding logic for converting
 * uploaded videos into multi-bitrate HLS streams (360p, 720p, 1080p).
 *
 * Exports:
 *  - getVideoDuration(inputPath)
 *  - transcodeToHls(inputPath, lectureId)
 *  - deleteHlsFiles(lectureId)
 *  - deleteRawFile(filePath)
 *  - deletePdfFile(filePath)
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOAD_ROOT = path.resolve(__dirname, '../../uploads');

// ── Quality presets ─────────────────────────────
const QUALITIES = [
  {
    name: '360p',
    scale: '-2:360',
    videoBitrate: '800k',
    maxRate: '856k',
    bufSize: '1200k',
  },
  {
    name: '720p',
    scale: '-2:720',
    videoBitrate: '2500k',
    maxRate: '2675k',
    bufSize: '3750k',
  },
  {
    name: '1080p',
    scale: '-2:1080',
    videoBitrate: '5000k',
    maxRate: '5350k',
    bufSize: '7500k',
  },
];

/**
 * Get the duration of a video file in seconds using ffprobe.
 * @param {string} inputPath - Absolute path to the video file.
 * @returns {Promise<number>} Duration in seconds.
 */
const getVideoDuration = async (inputPath) => {
  const { stdout } = await execAsync(
    `ffprobe -v error -show_entries format=duration -of csv=p=0 "${inputPath}"`
  );
  return parseFloat(stdout.trim());
};

/**
 * Transcode a raw video into multi-bitrate HLS streams.
 *
 * Creates an HLS output directory at `uploads/videos/hls/{lectureId}/`
 * with 360p, 720p, and 1080p variant playlists and a master.m3u8.
 *
 * @param {string} inputPath  - Absolute path to the source video.
 * @param {string} lectureId  - Lecture document ID (used as directory name).
 * @returns {Promise<{ hlsPath: string, duration: number }>}
 */
const transcodeToHls = async (inputPath, lectureId) => {
  const hlsDir = path.join(UPLOAD_ROOT, 'videos', 'hls', String(lectureId));
  fs.mkdirSync(hlsDir, { recursive: true });

    const transcodePromises = QUALITIES.map(async (q) => {
    const segmentPattern = path.join(hlsDir, `${q.name}_segment_%03d.ts`);
    const playlistPath = path.join(hlsDir, `${q.name}.m3u8`);

    const cmd = [
      `ffmpeg -y -v warning -i "${inputPath}"`,
      `-vf scale=${q.scale}`,
      `-c:v libx264 -preset veryfast -g 48 -sc_threshold 0`,
      `-b:v ${q.videoBitrate} -maxrate ${q.maxRate} -bufsize ${q.bufSize}`,
      `-c:a aac -b:a 128k`,
      `-hls_time 6 -hls_playlist_type vod`,
      `-hls_segment_filename "${segmentPattern}"`,
      `"${playlistPath}"`,
    ].join(' ');

    await execAsync(cmd, { maxBuffer: 10 * 1024 * 1024 }); // 10MB buffer just in case
  });

  await Promise.all(transcodePromises);

  // ── Generate master playlist ────────────────────
  const masterPlaylist = [
    '#EXTM3U',
    '#EXT-X-VERSION:3',
    '',
    '# 360p',
    '#EXT-X-STREAM-INF:BANDWIDTH=800000,RESOLUTION=640x360',
    '360p.m3u8',
    '',
    '# 720p',
    '#EXT-X-STREAM-INF:BANDWIDTH=2500000,RESOLUTION=1280x720',
    '720p.m3u8',
    '',
    '# 1080p',
    '#EXT-X-STREAM-INF:BANDWIDTH=5000000,RESOLUTION=1920x1080',
    '1080p.m3u8',
  ].join('\n');

  fs.writeFileSync(path.join(hlsDir, 'master.m3u8'), masterPlaylist, 'utf-8');

  // Get duration from the source file
  const duration = await getVideoDuration(inputPath);

  return {
    hlsPath: hlsDir,
    duration,
  };
};

/**
 * Delete all HLS transcoded files for a given lecture.
 * @param {string} lectureId - The lecture ID whose HLS directory should be removed.
 */
const deleteHlsFiles = (lectureId) => {
  const hlsDir = path.join(UPLOAD_ROOT, 'videos', 'hls', String(lectureId));
  if (fs.existsSync(hlsDir)) {
    fs.rmSync(hlsDir, { recursive: true, force: true });
  }
};

/**
 * Delete a single raw video file.
 * @param {string} filePath - Absolute path to the file.
 */
const deleteRawFile = (filePath) => {
  if (filePath && fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
};

/**
 * Delete a single PDF notes file.
 * @param {string} filePath - Absolute path to the file.
 */
const deletePdfFile = (filePath) => {
  if (filePath && fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
};

export {
  getVideoDuration,
  transcodeToHls,
  deleteHlsFiles,
  deleteRawFile,
  deletePdfFile,
};
