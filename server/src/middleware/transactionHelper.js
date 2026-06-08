/**
 * @module transactionHelper
 * @description MongoDB transaction wrapper for multi-document atomic operations.
 *
 * Ensures data consistency when multiple collections must be updated together.
 * Automatically starts a session, commits on success, and aborts on failure.
 *
 * Usage:
 *   import { withTransaction } from '../middleware/transactionHelper.js';
 *
 *   const result = await withTransaction(async (session) => {
 *       await Model.create([{ ... }], { session });
 *       await OtherModel.updateOne({ ... }, { ... }, { session });
 *       return someResult;
 *   });
 */

import mongoose from 'mongoose';

/**
 * Execute an async function inside a MongoDB transaction.
 *
 * @param {Function} fn - Async function that receives the session as its argument.
 *                        All DB operations inside should pass `{ session }` as an option.
 * @returns {Promise<any>} - The return value of the fn.
 * @throws {Error} - Re-throws any error after aborting the transaction.
 */
export const withTransaction = async (fn) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const result = await fn(session);
        await session.commitTransaction();
        return result;
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
};
