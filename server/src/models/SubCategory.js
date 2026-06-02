/**
 * @module SubCategory
 * @description Mongoose model for sub-categories under a parent Category.
 * Uses a compound unique index on { category, slug } so the same slug
 * can exist under different categories.
 * Soft-delete enabled via softDeletePlugin.
 */

import mongoose from 'mongoose';
import softDeletePlugin from './plugins/softDeletePlugin.js';

const subCategorySchema = new mongoose.Schema(
  {
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    slug: { type: String, lowercase: true },
    description: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

// ── Apply soft-delete plugin ────────────────────
subCategorySchema.plugin(softDeletePlugin);

// ── Compound unique index ───────────────────────
subCategorySchema.index({ category: 1, slug: 1 }, { unique: true });

// ── Pre-save: auto-generate slug from name ──────
subCategorySchema.pre('save', function () {
  if (this.isModified('name')) {
    this.slug = this.name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  }
});

const SubCategory = mongoose.model('SubCategory', subCategorySchema);

export default SubCategory;
