import User from '../models/User.js';
import Category from '../models/Category.js';
import SubCategory from '../models/SubCategory.js';
import Tag from '../models/Tag.js';
import Batch from '../models/Batch.js';
import Lecture from '../models/Lecture.js';
import WatchHistory from '../models/WatchHistory.js';
import generateToken from '../utils/generateToken.js';
import { safeEnqueue } from '../config/queue.js';
import { getSuspensionEmailHtml } from '../services/emailService.js';

// ============================================================
// USER MANAGEMENT
// ============================================================

/**
 * @desc    Create an instructor account (admin only)
 * @route   POST /api/admin/instructors
 * @access  Private/Admin
 */
const createInstructor = async (req, res) => {
    try {
        const { name, email, password, bio, specializations } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ message: 'Name, email, and password are required' });
        }

        const userExists = await User.findOne({ email }).setOptions({ includeDeleted: true });
        if (userExists) {
            if (userExists.isDeleted) {
                await User.deleteOne({ _id: userExists._id });
            } else {
                return res.status(400).json({ message: 'User with this email already exists' });
            }
        }

        const instructor = await User.create({
            name,
            email,
            password,
            role: 'instructor',
            accountStatus: 'active',
            isEmailVerified: true,
            mustChangePassword: true,
            bio: bio || '',
            specializations: specializations || [],
        });

        res.status(201).json({
            _id: instructor._id,
            name: instructor.name,
            email: instructor.email,
            role: instructor.role,
            accountStatus: instructor.accountStatus,
            mustChangePassword: instructor.mustChangePassword,
            bio: instructor.bio,
            specializations: instructor.specializations,
        });
    } catch (error) {
        console.error('Create Instructor Error:', error);
        res.status(500).json({ message: 'Failed to create instructor', error: error.message });
    }
};

/**
 * @desc    Get all users with filters
 * @route   GET /api/admin/users?role=&status=&page=&limit=
 * @access  Private/Admin
 */
const getAllUsers = async (req, res) => {
    try {
        const { role, status, page = 1, limit = 20, search } = req.query;

        const filter = {};
        if (role) filter.role = role;
        if (status) filter.accountStatus = status;
        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
            ];
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const total = await User.countDocuments(filter);

        const users = await User.find(filter)
            .select('-password')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        res.json({
            users,
            page: parseInt(page),
            pages: Math.ceil(total / parseInt(limit)),
            total,
        });
    } catch (error) {
        console.error('Get All Users Error:', error);
        res.status(500).json({ message: 'Failed to fetch users' });
    }
};

/**
 * @desc    Get user by ID with enriched data
 * @route   GET /api/admin/users/:id
 * @access  Private/Admin
 */
const getUserById = async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const enriched = user.toObject();

        if (user.role === 'instructor') {
            enriched.batchCount = await Batch.countDocuments({ instructor: user._id });
            enriched.lectureCount = await Lecture.countDocuments({ instructor: user._id });
        } else if (user.role === 'student') {
            enriched.enrollmentCount = await Batch.countDocuments({ students: user._id });
        }

        res.json(enriched);
    } catch (error) {
        console.error('Get User By ID Error:', error);
        res.status(500).json({ message: 'Failed to fetch user' });
    }
};

/**
 * @desc    Suspend a user (soft status change + cascade deactivate + email notification)
 * @route   PATCH /api/admin/users/:id/suspend
 * @access  Private/Admin
 */
const suspendUser = async (req, res) => {
    try {
        const { reason } = req.body;
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (user.role === 'admin') {
            return res.status(403).json({ message: 'Cannot suspend an admin' });
        }

        user.accountStatus = 'suspended';
        user.suspendedAt = new Date();
        user.suspendReason = reason || '';
        await user.save();

        // Cascade: deactivate instructor's batches
        if (user.role === 'instructor') {
            await Batch.updateMany(
                { instructor: user._id },
                { $set: { isActive: false } }
            );
        }

        // Cascade: remove student from all batch rosters
        if (user.role === 'student') {
            await Batch.updateMany(
                { students: user._id },
                { $pull: { students: user._id } }
            );
        }

        // Enqueue suspension email
        await safeEnqueue('email', 'suspension-email', {
            to: user.email,
            subject: 'Your Intellipath Account Has Been Suspended',
            html: getSuspensionEmailHtml(user.name, user.suspendReason)
        });

        res.json({
            _id: user._id,
            name: user.name,
            accountStatus: user.accountStatus,
            message: 'User suspended successfully',
        });
    } catch (error) {
        console.error('Suspend User Error:', error);
        res.status(500).json({ message: 'Failed to suspend user' });
    }
};

/**
 * @desc    Revoke suspension (reactivate a user)
 * @route   PATCH /api/admin/users/:id/revoke-suspension
 * @access  Private/Admin
 */
const revokeSuspension = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (user.accountStatus !== 'suspended') {
            return res.status(400).json({ message: 'User is not suspended' });
        }

        user.accountStatus = 'active';
        user.suspendedAt = undefined;
        user.suspendReason = undefined;
        await user.save();

        res.json({
            _id: user._id,
            name: user.name,
            accountStatus: user.accountStatus,
            message: 'Suspension revoked successfully',
        });
    } catch (error) {
        console.error('Revoke Suspension Error:', error);
        res.status(500).json({ message: 'Failed to revoke suspension' });
    }
};

/**
 * @desc    Soft delete a user + enqueue cleanup job
 * @route   DELETE /api/admin/users/:id
 * @access  Private/Admin
 */
const deleteUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (user.role === 'admin') {
            return res.status(403).json({ message: 'Cannot delete an admin account' });
        }

        // Soft delete (instant, <50ms)
        await user.softDelete(req.user._id);

        // Enqueue background cleanup for hard purge of associated data
        await safeEnqueue('cleanup', 'cleanup-user', {
            userId: user._id.toString(),
            role: user.role,
            deletedBy: req.user._id.toString(),
        }, {
            attempts: 3,
            backoff: { type: 'exponential', delay: 3000 },
        });

        res.json({ message: 'User deleted. Background cleanup in progress.' });
    } catch (error) {
        console.error('Delete User Error:', error);
        res.status(500).json({ message: 'Failed to delete user' });
    }
};

/**
 * @desc    Get admin dashboard stats
 * @route   GET /api/admin/dashboard
 * @access  Private/Admin
 */
const getDashboardStats = async (req, res) => {
    try {
        const [
            activeStudents,
            suspendedUsers,
            totalInstructors,
            totalBatches,
            totalLectures,
            totalCategories,
        ] = await Promise.all([
            User.countDocuments({ role: 'student', accountStatus: 'active' }),
            User.countDocuments({ accountStatus: 'suspended' }),
            User.countDocuments({ role: 'instructor', accountStatus: 'active' }),
            Batch.countDocuments({}),
            Lecture.countDocuments({}),
            Category.countDocuments({}),
        ]);

        // Recent registrations
        const recentRegistrations = await User.find({ role: 'student' })
            .select('name email role accountStatus createdAt')
            .sort({ createdAt: -1 })
            .limit(10);

        res.json({
            stats: {
                activeStudents,
                suspendedUsers,
                totalInstructors,
                totalBatches,
                totalLectures,
                totalCategories,
            },
            recentRegistrations,
        });
    } catch (error) {
        console.error('Dashboard Stats Error:', error);
        res.status(500).json({ message: 'Failed to fetch dashboard stats' });
    }
};

// ============================================================
// TAXONOMY CRUD — Categories
// ============================================================

/**
 * @desc    Create a category
 * @route   POST /api/admin/categories
 * @access  Private/Admin
 */
const createCategory = async (req, res) => {
    try {
        const { name, description, icon, order } = req.body;

        if (!name) {
            return res.status(400).json({ message: 'Category name is required' });
        }

        const category = await Category.create({
            name,
            description: description || '',
            icon: icon || '',
            order: order || 0,
        });

        res.status(201).json(category);
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ message: 'Category with this name already exists' });
        }
        console.error('Create Category Error:', error);
        res.status(500).json({ message: 'Failed to create category' });
    }
};

/**
 * @desc    Get all categories with subcategory and tag counts
 * @route   GET /api/admin/categories
 * @access  Private/Admin
 */
const getCategories = async (req, res) => {
    try {
        const categories = await Category.find({}).sort({ order: 1, name: 1 });

        // Enrich with counts
        const enriched = await Promise.all(
            categories.map(async (cat) => {
                const catObj = cat.toObject();
                const subCategories = await SubCategory.find({ category: cat._id });
                catObj.subCategoryCount = subCategories.length;
                const subCatIds = subCategories.map((sc) => sc._id);
                catObj.tagCount = await Tag.countDocuments({ subCategory: { $in: subCatIds } });
                return catObj;
            })
        );

        res.json(enriched);
    } catch (error) {
        console.error('Get Categories Error:', error);
        res.status(500).json({ message: 'Failed to fetch categories' });
    }
};

/**
 * @desc    Update a category
 * @route   PUT /api/admin/categories/:id
 * @access  Private/Admin
 */
const updateCategory = async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);
        if (!category) {
            return res.status(404).json({ message: 'Category not found' });
        }

        const { name, description, icon, isActive, order } = req.body;
        if (name !== undefined) category.name = name;
        if (description !== undefined) category.description = description;
        if (icon !== undefined) category.icon = icon;
        if (isActive !== undefined) category.isActive = isActive;
        if (order !== undefined) category.order = order;

        await category.save();
        res.json(category);
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ message: 'Category with this name already exists' });
        }
        console.error('Update Category Error:', error);
        res.status(500).json({ message: 'Failed to update category' });
    }
};

/**
 * @desc    Soft delete a category (cascade subcategories + tags)
 * @route   DELETE /api/admin/categories/:id
 * @access  Private/Admin
 */
const deleteCategory = async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);
        if (!category) {
            return res.status(404).json({ message: 'Category not found' });
        }

        // Check if any non-deleted lectures reference tags under this category
        const subCategories = await SubCategory.find({ category: category._id });
        const subCatIds = subCategories.map((sc) => sc._id);
        const tags = await Tag.find({ subCategory: { $in: subCatIds } });
        const tagIds = tags.map((t) => t._id);

        if (tagIds.length > 0) {
            const lectureCount = await Lecture.countDocuments({ tags: { $in: tagIds } });
            if (lectureCount > 0) {
                return res.status(400).json({
                    message: `Cannot delete: ${lectureCount} lecture(s) reference tags in this category. Remove tag associations first.`,
                });
            }
        }

        // Cascade soft delete tags
        for (const tag of tags) {
            await tag.softDelete(req.user._id);
        }
        // Cascade soft delete subcategories
        for (const subCat of subCategories) {
            await subCat.softDelete(req.user._id);
        }
        // Soft delete category
        await category.softDelete(req.user._id);

        res.json({ message: 'Category and its children deleted' });
    } catch (error) {
        console.error('Delete Category Error:', error);
        res.status(500).json({ message: 'Failed to delete category' });
    }
};

// ============================================================
// TAXONOMY CRUD — SubCategories
// ============================================================

/**
 * @desc    Create a subcategory
 * @route   POST /api/admin/subcategories
 * @access  Private/Admin
 */
const createSubCategory = async (req, res) => {
    try {
        const { name, categoryId, description, order } = req.body;

        if (!name || !categoryId) {
            return res.status(400).json({ message: 'Name and categoryId are required' });
        }

        const category = await Category.findById(categoryId);
        if (!category) {
            return res.status(404).json({ message: 'Parent category not found' });
        }

        const subCategory = await SubCategory.create({
            category: categoryId,
            name,
            description: description || '',
            order: order || 0,
        });

        res.status(201).json(subCategory);
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ message: 'SubCategory with this name already exists in this category' });
        }
        console.error('Create SubCategory Error:', error);
        res.status(500).json({ message: 'Failed to create subcategory' });
    }
};

/**
 * @desc    Get subcategories by categoryId
 * @route   GET /api/admin/subcategories?categoryId=
 * @access  Private/Admin
 */
const getSubCategories = async (req, res) => {
    try {
        const { categoryId } = req.query;
        const filter = categoryId ? { category: categoryId } : {};

        const subCategories = await SubCategory.find(filter)
            .populate('category', 'name')
            .sort({ order: 1, name: 1 });

        res.json(subCategories);
    } catch (error) {
        console.error('Get SubCategories Error:', error);
        res.status(500).json({ message: 'Failed to fetch subcategories' });
    }
};

/**
 * @desc    Update a subcategory
 * @route   PUT /api/admin/subcategories/:id
 * @access  Private/Admin
 */
const updateSubCategory = async (req, res) => {
    try {
        const subCategory = await SubCategory.findById(req.params.id);
        if (!subCategory) {
            return res.status(404).json({ message: 'SubCategory not found' });
        }

        const { name, description, isActive, order } = req.body;
        if (name !== undefined) subCategory.name = name;
        if (description !== undefined) subCategory.description = description;
        if (isActive !== undefined) subCategory.isActive = isActive;
        if (order !== undefined) subCategory.order = order;

        await subCategory.save();
        res.json(subCategory);
    } catch (error) {
        console.error('Update SubCategory Error:', error);
        res.status(500).json({ message: 'Failed to update subcategory' });
    }
};

/**
 * @desc    Soft delete a subcategory (cascade tags)
 * @route   DELETE /api/admin/subcategories/:id
 * @access  Private/Admin
 */
const deleteSubCategory = async (req, res) => {
    try {
        const subCategory = await SubCategory.findById(req.params.id);
        if (!subCategory) {
            return res.status(404).json({ message: 'SubCategory not found' });
        }

        // Check if lectures reference tags in this subcategory
        const tags = await Tag.find({ subCategory: subCategory._id });
        const tagIds = tags.map((t) => t._id);

        if (tagIds.length > 0) {
            const lectureCount = await Lecture.countDocuments({ tags: { $in: tagIds } });
            if (lectureCount > 0) {
                return res.status(400).json({
                    message: `Cannot delete: ${lectureCount} lecture(s) reference tags in this subcategory.`,
                });
            }
        }

        // Cascade soft delete tags
        for (const tag of tags) {
            await tag.softDelete(req.user._id);
        }
        await subCategory.softDelete(req.user._id);

        res.json({ message: 'SubCategory and its tags deleted' });
    } catch (error) {
        console.error('Delete SubCategory Error:', error);
        res.status(500).json({ message: 'Failed to delete subcategory' });
    }
};

// ============================================================
// TAXONOMY CRUD — Tags
// ============================================================

/**
 * @desc    Create a tag
 * @route   POST /api/admin/tags
 * @access  Private/Admin
 */
const createTag = async (req, res) => {
    try {
        const { name, subCategoryId } = req.body;

        if (!name || !subCategoryId) {
            return res.status(400).json({ message: 'Name and subCategoryId are required' });
        }

        const subCategory = await SubCategory.findById(subCategoryId);
        if (!subCategory) {
            return res.status(404).json({ message: 'Parent subcategory not found' });
        }

        const tag = await Tag.create({
            subCategory: subCategoryId,
            name,
        });

        res.status(201).json(tag);
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ message: 'Tag with this name already exists in this subcategory' });
        }
        console.error('Create Tag Error:', error);
        res.status(500).json({ message: 'Failed to create tag' });
    }
};

/**
 * @desc    Get tags by subCategoryId
 * @route   GET /api/admin/tags?subCategoryId=
 * @access  Private/Admin
 */
const getTags = async (req, res) => {
    try {
        const { subCategoryId } = req.query;
        const filter = subCategoryId ? { subCategory: subCategoryId } : {};

        const tags = await Tag.find(filter)
            .populate('subCategory', 'name')
            .sort({ name: 1 });

        res.json(tags);
    } catch (error) {
        console.error('Get Tags Error:', error);
        res.status(500).json({ message: 'Failed to fetch tags' });
    }
};

/**
 * @desc    Update a tag
 * @route   PUT /api/admin/tags/:id
 * @access  Private/Admin
 */
const updateTag = async (req, res) => {
    try {
        const tag = await Tag.findById(req.params.id);
        if (!tag) {
            return res.status(404).json({ message: 'Tag not found' });
        }

        const { name, isActive } = req.body;
        if (name !== undefined) tag.name = name;
        if (isActive !== undefined) tag.isActive = isActive;

        await tag.save();
        res.json(tag);
    } catch (error) {
        console.error('Update Tag Error:', error);
        res.status(500).json({ message: 'Failed to update tag' });
    }
};

/**
 * @desc    Soft delete a tag
 * @route   DELETE /api/admin/tags/:id
 * @access  Private/Admin
 */
const deleteTag = async (req, res) => {
    try {
        const tag = await Tag.findById(req.params.id);
        if (!tag) {
            return res.status(404).json({ message: 'Tag not found' });
        }

        // Check if any lectures reference this tag
        const lectureCount = await Lecture.countDocuments({ tags: tag._id });
        if (lectureCount > 0) {
            return res.status(400).json({
                message: `Cannot delete: ${lectureCount} lecture(s) reference this tag.`,
            });
        }

        await tag.softDelete(req.user._id);
        res.json({ message: 'Tag deleted' });
    } catch (error) {
        console.error('Delete Tag Error:', error);
        res.status(500).json({ message: 'Failed to delete tag' });
    }
};

export {
    // User management
    createInstructor,
    getAllUsers,
    getUserById,
    suspendUser,
    revokeSuspension,
    deleteUser,
    getDashboardStats,
    // Taxonomy — Categories
    createCategory,
    getCategories,
    updateCategory,
    deleteCategory,
    // Taxonomy — SubCategories
    createSubCategory,
    getSubCategories,
    updateSubCategory,
    deleteSubCategory,
    // Taxonomy — Tags
    createTag,
    getTags,
    updateTag,
    deleteTag,
};
