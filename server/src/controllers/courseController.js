import Course from '../models/Course.js';

import { generateCourseStructure, generateLessonContent, generateQuiz } from '../services/ollamaService.js';

// @desc    Create a new course with AI
// @route   POST /api/courses
// @access  Private
const createCourse = async (req, res) => {
    const { topic, level } = req.body;

    if (!topic || !level) {
        res.status(400).json({ message: 'Please provide topic and level' });
        return;
    }

    try {
        const aiResponse = await generateCourseStructure(topic, level);

        // Attempt to parse JSON from AI response
        // Note: In production, we might need robust parsing if AI adds chatter
        let courseData;
        try {
            courseData = JSON.parse(aiResponse);
        } catch (e) {
            // Fallback: Try to find JSON block if mixed with text
            const match = aiResponse.match(/\{[\s\S]*\}/);
            if (match) {
                courseData = JSON.parse(match[0]);
            } else {
                throw new Error('Failed to parse AI response');
            }
        }

        const course = new Course({
            user: req.user._id,
            title: courseData.title,
            description: courseData.description,
            level,
            modules: courseData.modules,
            isGenerated: true,
        });

        const createdCourse = await course.save();
        res.status(201).json(createdCourse);

    } catch (error) {
        console.error('Course Creation Error:', error);
        res.status(500).json({ message: 'Failed to generate course', error: error.message });
    }
};

// @desc    Get user courses
// @route   GET /api/courses
// @access  Private
const getCourses = async (req, res) => {
    const courses = await Course.find({ user: req.user._id });
    res.json(courses);
};

// @desc    Get course by ID
// @route   GET /api/courses/:id
// @access  Private
const getCourseById = async (req, res) => {
    const course = await Course.findById(req.params.id);

    if (course) {
        // Ensure user owns the course
        if (course.user.toString() !== req.user._id.toString()) {
            res.status(401).json({ message: 'Not authorized' });
            return;
        }
        res.json(course);
    } else {
        res.status(404).json({ message: 'Course not found' });
    }
};

// @desc    Get module content (generate if missing)
// @route   GET /api/courses/:id/modules/:moduleId
// @access  Private
const getModule = async (req, res) => {
    try {
        const course = await Course.findById(req.params.id);

        if (!course) {
            res.status(404).json({ message: 'Course not found' });
            return;
        }

        if (course.user.toString() !== req.user._id.toString()) {
            res.status(401).json({ message: 'Not authorized' });
            return;
        }

        const module = course.modules.id(req.params.moduleId);

        if (!module) {
            res.status(404).json({ message: 'Module not found' });
            return;
        }

        // If content is missing, generate it
        if (!module.content) {
            try {
                const content = await generateLessonContent(course.title, course.level, module.title);
                module.content = content;
                await course.save();
            } catch (error) {
                console.error('Failed to generate lesson content', error);
                // We might return what we have or error out. Let's return error for now so user knows.
                res.status(500).json({ message: 'Failed to generate content' });
                return;
            }
        }

        res.json(module);

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Mark module as completed
// @route   PUT /api/courses/:id/modules/:moduleId
// @access  Private
const updateModuleStatus = async (req, res) => {
    try {
        const { completed } = req.body;
        const course = await Course.findById(req.params.id);

        if (!course) {
            res.status(404).json({ message: 'Course not found' });
            return;
        }

        if (course.user.toString() !== req.user._id.toString()) {
            res.status(401).json({ message: 'Not authorized' });
            return;
        }

        const module = course.modules.id(req.params.moduleId);

        if (!module) {
            res.status(404).json({ message: 'Module not found' });
            return;
        }

        module.completed = completed;
        await course.save();

        res.json(module);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get quiz for a module (generate if missing)
// @route   GET /api/courses/:id/modules/:moduleId/quiz
// @access  Private
const getQuiz = async (req, res) => {
    try {
        const course = await Course.findById(req.params.id);

        if (!course || course.user.toString() !== req.user._id.toString()) {
            res.status(404).json({ message: 'Course not found' });
            return;
        }

        const module = course.modules.id(req.params.moduleId);
        if (!module) {
            res.status(404).json({ message: 'Module not found' });
            return;
        }

        // Check if quiz exists, if not generate it
        if (!module.quiz || module.quiz.length === 0) {
            try {
                const quizJson = await generateQuiz(course.title, course.level, module.title);

                // Parse JSON
                let quizData;
                try {
                    quizData = JSON.parse(quizJson);
                } catch (e) {
                    const match = quizJson.match(/\[[\s\S]*\]/);
                    if (match) {
                        quizData = JSON.parse(match[0]);
                    } else {
                        throw new Error('Failed to parse Quiz JSON');
                    }
                }

                module.quiz = quizData;
                await course.save();
            } catch (error) {
                console.error('Failed to generate quiz', error);
                res.status(500).json({ message: 'Failed to generate quiz' });
                return;
            }
        }

        // Return quiz without correct answers to the client? 
        // For simplicity, we send it all, but ideally we obscure correct answers. 
        // Let's send it all for now and handle "hiding" on frontend, but validation happens on backend.
        // Actually, to be secure, we should map it.
        const quizForClient = module.quiz.map(q => ({
            _id: q._id,
            question: q.question,
            options: q.options
        }));

        res.json(quizForClient);

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Submit quiz and mark module complete if passed
// @route   POST /api/courses/:id/modules/:moduleId/quiz
// @access  Private
const submitQuiz = async (req, res) => {
    try {
        const { answers } = req.body; // Array of selected indices, e.g., [0, 2, 1]
        const course = await Course.findById(req.params.id);

        if (!course || course.user.toString() !== req.user._id.toString()) {
            res.status(404).json({ message: 'Course not found' });
            return;
        }

        const module = course.modules.id(req.params.moduleId);
        if (!module) {
            res.status(404).json({ message: 'Module not found' });
            return;
        }

        if (!module.quiz || module.quiz.length === 0) {
            res.status(400).json({ message: 'Quiz not generated yet' });
            return;
        }

        // Calculate Score
        let correctCount = 0;
        module.quiz.forEach((q, index) => {
            if (answers[index] === q.correctAnswer) {
                correctCount++;
            }
        });

        const score = (correctCount / module.quiz.length) * 100;
        const passed = score > 60; // Requirement: > 60%

        // Save score regardless of pass/fail (optional, but good for tracking attempts)
        // Or only save if passed? Let's save the latest attempt score.
        module.quizScore = score;

        if (passed) {
            module.completed = true;
        }
        await course.save();

        res.json({
            success: true,
            score,
            passed,
            correctCount,
            totalQuestions: module.quiz.length,
            message: passed ? 'Quiz passed! Lesson completed.' : 'Quiz failed. Please try again.'
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get user learning analytics
// @route   GET /api/courses/analytics
// @access  Private
const getAnalytics = async (req, res) => {
    try {
        const courses = await Course.find({ user: req.user._id });

        let totalCourses = courses.length;
        let completedCourses = 0;
        let totalModules = 0;
        let completedModules = 0;
        let totalQuizScore = 0;
        let quizCount = 0;

        courses.forEach(course => {
            let courseCompletedModules = 0;

            if (course.modules) {
                totalModules += course.modules.length;
                course.modules.forEach(module => {
                    if (module.completed) {
                        courseCompletedModules++;
                        completedModules++;
                    }
                    if (module.quizScore !== undefined) {
                        totalQuizScore += module.quizScore;
                        quizCount++;
                    }
                });
            }

            // Simple course completion logic: all modules done
            if (course.modules.length > 0 && courseCompletedModules === course.modules.length) {
                completedCourses++;
            }
        });

        const avgQuizScore = quizCount > 0 ? (totalQuizScore / quizCount) : 0;

        res.json({
            totalCourses,
            completedCourses,
            totalModules,
            completedModules,
            avgQuizScore
        });

    } catch (error) {
        console.error('Analytics Error:', error);
        res.status(500).json({ message: 'Failed to fetch analytics' });
    }
};

export { createCourse, getCourses, getCourseById, getModule, getQuiz, submitQuiz, getAnalytics };
