/**
 * @module Lecture
 * @description Mongoose model for a lecture / video lesson within a batch.
 * Tracks the original upload, HLS transcoded output, attached PDF notes,
 * publish state, and view count.
 * Soft-delete enabled via softDeletePlugin.
 */

import mongoose from 'mongoose';
import softDeletePlugin from './plugins/softDeletePlugin.js';

const lectureSchema = new mongoose.Schema(
  {
    batch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Batch',
      required: true,
      index: true,
    },
    instructor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    order: { type: Number, default: 0 },
    tags: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Tag' }],

    // ── Video fields ─────────────────────────────
    muxUploadId: { type: String },
    muxAssetId: { type: String },
    muxPlaybackId: { type: String },
    videoDuration: { type: Number }, // seconds
    videoStatus: {
      type: String,
      enum: ['pending_upload', 'uploading', 'processing', 'ready', 'failed'],
      default: 'pending_upload',
    },

    // ── Live Streaming fields ──────────────────────
    isLive: { type: Boolean, default: false },
    liveRoomUrl: { type: String },
    liveStatus: {
      type: String,
      enum: ['scheduled', 'live', 'ended'],
    },

    // ── Notes fields ─────────────────────────────
    notesPath: { type: String },
    notesFilename: { type: String },

    // ── Publishing & metrics ─────────────────────
    isPublished: { type: Boolean, default: false },
    viewCount: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

// ── Apply soft-delete plugin ────────────────────
lectureSchema.plugin(softDeletePlugin);

// ── Indexes ─────────────────────────────────────
lectureSchema.index({ batch: 1, order: 1 });
lectureSchema.index({ tags: 1 });

const Lecture = mongoose.model('Lecture', lectureSchema);

export default Lecture;
