/**
 * @module softDeletePlugin
 * @description Mongoose plugin that adds soft-delete functionality to any schema.
 *
 * Adds fields: isDeleted, deletedAt, deletedBy
 * Adds pre-query middleware to auto-filter deleted documents
 * Adds instance method: softDelete(deletedByUserId)
 * Adds static methods: findDeleted(filter), restoreById(id)
 */

import mongoose from 'mongoose';

/**
 * Soft-delete plugin for Mongoose schemas.
 * @param {mongoose.Schema} schema - The Mongoose schema to apply the plugin to.
 */
const softDeletePlugin = (schema) => {
  // ──────────────────────────────────────────────
  // 1. Add soft-delete fields to the schema
  // ──────────────────────────────────────────────
  schema.add({
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  });

  // ──────────────────────────────────────────────
  // 2. Pre-query middleware
  //    Automatically adds { isDeleted: { $ne: true } }
  //    to the filter for common query operations,
  //    UNLESS the query option `includeDeleted` is true.
  // ──────────────────────────────────────────────
  const queryHooks = [
    'find',
    'findOne',
    'countDocuments',
    'findOneAndUpdate',
    'findOneAndDelete',
    'updateMany',
    'updateOne',
  ];

  queryHooks.forEach((hook) => {
    schema.pre(hook, function () {
      // `this` is the Query object
      if (this.getOptions().includeDeleted !== true) {
        this.where({ isDeleted: { $ne: true } });
      }
    });
  });

  // ──────────────────────────────────────────────
  // 3. Instance method – softDelete
  // ──────────────────────────────────────────────

  /**
   * Soft-delete this document.
   * @param {mongoose.Types.ObjectId|string} deletedByUserId - The ID of the user performing the deletion.
   * @returns {Promise<mongoose.Document>} The saved document with soft-delete fields set.
   */
  schema.methods.softDelete = async function (deletedByUserId) {
    this.isDeleted = true;
    this.deletedAt = new Date();
    this.deletedBy = deletedByUserId;
    return this.save();
  };

  // ──────────────────────────────────────────────
  // 4. Static method – findDeleted
  // ──────────────────────────────────────────────

  /**
   * Find documents including (or limited to) soft-deleted ones.
   * Bypasses the automatic isDeleted filter.
   * @param {Object} filter - Mongoose filter object.
   * @returns {mongoose.Query} A query that includes deleted documents.
   */
  schema.statics.findDeleted = function (filter = {}) {
    return this.find(filter).setOptions({ includeDeleted: true });
  };

  // ──────────────────────────────────────────────
  // 5. Static method – restoreById
  // ──────────────────────────────────────────────

  /**
   * Restore a soft-deleted document by its ID.
   * @param {mongoose.Types.ObjectId|string} id - The document ID to restore.
   * @returns {Promise<mongoose.Document|null>} The restored document, or null if not found.
   */
  schema.statics.restoreById = function (id) {
    return this.findOneAndUpdate(
      { _id: id },
      { $set: { isDeleted: false }, $unset: { deletedAt: '', deletedBy: '' } },
      { new: true, includeDeleted: true }
    );
  };
};

export default softDeletePlugin;
