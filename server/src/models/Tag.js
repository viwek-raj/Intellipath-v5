/**
 * @module Tag
 * @description Mongoose model for tags within a sub-category.
 * Uses a compound unique index on { subCategory, slug } so the same
 * tag slug can exist under different sub-categories.
 * Soft-delete enabled via softDeletePlugin.
 */

import mongoose from 'mongoose';
import softDeletePlugin from './plugins/softDeletePlugin.js';

const tagSchema = new mongoose.Schema(
  {
    subCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SubCategory',
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    slug: { type: String, lowercase: true },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

// ── Apply soft-delete plugin ────────────────────
tagSchema.plugin(softDeletePlugin);

// ── Compound unique index ───────────────────────
tagSchema.index({ subCategory: 1, slug: 1 }, { unique: true });

// ── Pre-save: auto-generate slug from name ──────
tagSchema.pre('save', function () {
  if (this.isModified('name')) {
    this.slug = this.name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  }
});

const Tag = mongoose.model('Tag', tagSchema);

export default Tag;
