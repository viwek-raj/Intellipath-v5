/**
 * @module WatchHistory
 * @description Mongoose model for tracking student watch progress on lectures.
 * Each record is unique per (student, lecture). The percentWatched field
 * is auto-computed from watchedSeconds / totalDuration on save.
 * Soft-delete enabled via softDeletePlugin.
 */

import mongoose from 'mongoose';
import softDeletePlugin from './plugins/softDeletePlugin.js';

const watchHistorySchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    lecture: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lecture',
      required: true,
    },
    batch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Batch',
      required: true,
    },
    watchedSeconds: { type: Number, default: 0 },
    totalDuration: { type: Number, default: 0 },
    percentWatched: { type: Number, default: 0 }, // 0-100
    firstWatchedAt: { type: Date },
    lastWatchedAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

// ── Apply soft-delete plugin ────────────────────
watchHistorySchema.plugin(softDeletePlugin);

// ── Indexes ─────────────────────────────────────
watchHistorySchema.index({ student: 1, lecture: 1 }, { unique: true });
watchHistorySchema.index({ lecture: 1 });
watchHistorySchema.index({ student: 1, batch: 1 });

// ── Pre-save: auto-compute percentWatched ───────
watchHistorySchema.pre('save', function () {
  if (this.totalDuration > 0) {
    this.percentWatched = Math.min(
      100,
      Math.round((this.watchedSeconds / this.totalDuration) * 100)
    );
  } else {
    this.percentWatched = 0;
  }
});

const WatchHistory = mongoose.model('WatchHistory', watchHistorySchema);

export default WatchHistory;
