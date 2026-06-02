import express from 'express';
import {
    createInstructor,
    getAllUsers,
    getUserById,
    suspendUser,
    revokeSuspension,
    deleteUser,
    getDashboardStats,
    createCategory,
    getCategories,
    updateCategory,
    deleteCategory,
    createSubCategory,
    getSubCategories,
    updateSubCategory,
    deleteSubCategory,
    createTag,
    getTags,
    updateTag,
    deleteTag,
} from '../controllers/adminController.js';
import { protect, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

// All admin routes require: protect → requireRole('admin')
router.use(protect, requireRole('admin'));

// ── Users ────────────────────────────────────────────────
router.post('/instructors', createInstructor);
router.get('/users', getAllUsers);
router.get('/users/:id', getUserById);
router.patch('/users/:id/suspend', suspendUser);
router.patch('/users/:id/revoke-suspension', revokeSuspension);
router.delete('/users/:id', deleteUser);
router.get('/dashboard', getDashboardStats);

// ── Taxonomy: Categories ─────────────────────────────────
router.post('/categories', createCategory);
router.get('/categories', getCategories);
router.put('/categories/:id', updateCategory);
router.delete('/categories/:id', deleteCategory);

// ── Taxonomy: SubCategories ──────────────────────────────
router.post('/subcategories', createSubCategory);
router.get('/subcategories', getSubCategories);
router.put('/subcategories/:id', updateSubCategory);
router.delete('/subcategories/:id', deleteSubCategory);

// ── Taxonomy: Tags ───────────────────────────────────────
router.post('/tags', createTag);
router.get('/tags', getTags);
router.put('/tags/:id', updateTag);
router.delete('/tags/:id', deleteTag);

export default router;
