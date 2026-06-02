import express from 'express';
import Category from '../models/Category.js';
import SubCategory from '../models/SubCategory.js';
import Tag from '../models/Tag.js';
import { protect, requireApproved } from '../middleware/authMiddleware.js';

const router = express.Router();

// All taxonomy read routes: protect → requireApproved (any approved user)
router.use(protect, requireApproved);

/**
 * @desc    Get all active categories
 * @route   GET /api/taxonomy/categories
 */
router.get('/categories', async (req, res) => {
    try {
        const categories = await Category.find({ isActive: true })
            .sort({ order: 1, name: 1 });
        res.json(categories);
    } catch (error) {
        console.error('Taxonomy Get Categories Error:', error);
        res.status(500).json({ message: 'Failed to fetch categories' });
    }
});

/**
 * @desc    Get active subcategories for a category
 * @route   GET /api/taxonomy/subcategories/:catId
 */
router.get('/subcategories/:catId', async (req, res) => {
    try {
        const subCategories = await SubCategory.find({
            category: req.params.catId,
            isActive: true,
        }).sort({ order: 1, name: 1 });
        res.json(subCategories);
    } catch (error) {
        console.error('Taxonomy Get SubCategories Error:', error);
        res.status(500).json({ message: 'Failed to fetch subcategories' });
    }
});

/**
 * @desc    Search tags by name (for tag picker)
 * @route   GET /api/taxonomy/tags/search?q=node
 * IMPORTANT: This route MUST come before /tags/:subCatId
 */
router.get('/tags/search', async (req, res) => {
    try {
        const { q } = req.query;
        if (!q || q.length < 1) {
            return res.json([]);
        }

        const tags = await Tag.find({
            name: { $regex: q, $options: 'i' },
            isActive: true,
        })
            .populate({
                path: 'subCategory',
                select: 'name category',
                populate: { path: 'category', select: 'name' },
            })
            .limit(20);

        res.json(tags);
    } catch (error) {
        console.error('Taxonomy Search Tags Error:', error);
        res.status(500).json({ message: 'Failed to search tags' });
    }
});

/**
 * @desc    Get active tags for a subcategory
 * @route   GET /api/taxonomy/tags/:subCatId
 */
router.get('/tags/:subCatId', async (req, res) => {
    try {
        const tags = await Tag.find({
            subCategory: req.params.subCatId,
            isActive: true,
        }).sort({ name: 1 });
        res.json(tags);
    } catch (error) {
        console.error('Taxonomy Get Tags Error:', error);
        res.status(500).json({ message: 'Failed to fetch tags' });
    }
});

export default router;
