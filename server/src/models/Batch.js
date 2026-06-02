/**
 * @module Batch
 * @description Mongoose model for a teaching batch / cohort.
 * A batch belongs to an instructor, has a date range, and holds
 * a list of enrolled students.
 * Soft-delete enabled via softDeletePlugin.
 */

import mongoose from 'mongoose';
import softDeletePlugin from './plugins/softDeletePlugin.js';

const batchSchema = new mongoose.Schema(
  {
    instructor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    students: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    isActive: { type: Boolean, default: true },
    maxStudents: { type: Number, default: 0 }, // 0 = unlimited
  },
  {
    timestamps: true,
  }
);

// ── Apply soft-delete plugin ────────────────────
batchSchema.plugin(softDeletePlugin);

// ── Indexes ─────────────────────────────────────
batchSchema.index({ instructor: 1 });
batchSchema.index({ students: 1 });
batchSchema.index({ startDate: 1, endDate: 1 });

const Batch = mongoose.model('Batch', batchSchema);

export default Batch;
