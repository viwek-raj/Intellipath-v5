/**
 * @module Category
 * @description Mongoose model for top-level learning categories.
 * Each category has a unique name and auto-generated slug.
 * Soft-delete enabled via softDeletePlugin.
 */

import mongoose from 'mongoose';
import softDeletePlugin from './plugins/softDeletePlugin.js';

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    slug: { type: String, unique: true, lowercase: true, index: true },
    description: { type: String, default: '' },
    icon: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

// ── Apply soft-delete plugin ────────────────────
categorySchema.plugin(softDeletePlugin);

// ── Pre-save: auto-generate slug from name ──────
categorySchema.pre('save', function () {
  if (this.isModified('name')) {
    this.slug = this.name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')   // Remove non-word chars (except spaces & hyphens)
      .replace(/\s+/g, '-')       // Replace spaces with hyphens
      .replace(/-+/g, '-');       // Collapse multiple hyphens
  }
});

const Category = mongoose.model('Category', categorySchema);

export default Category;
