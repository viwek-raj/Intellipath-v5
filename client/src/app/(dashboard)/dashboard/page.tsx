'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import api, { studentApi } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, BookOpen, Sparkles, GraduationCap, Plus, Clock, MoreVertical, Loader2, ArrowRight, Target, Trophy, Trash2, Activity as ActivityIcon } from 'lucide-react';
import { ActivityCalendar } from 'react-activity-calendar';
import { subYears, format } from 'date-fns';
import { motion } from 'framer-motion';
import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { Badge } from '@/components/ui/badge';

interface Batch {
    _id: string;
    title: string;
    description: string;
    lectureCount: number;
    watchedCount: number;
    studentCount: number;
    progress: number;
    instructor: { name: string };
}

const container = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1
        }
    }
};

const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
};

export default function DashboardPage() {
    const [batches, setBatches] = useState<Batch[]>([]);
    const [aiCourses, setAiCourses] = useState<any[]>([]);
    const [activity, setActivity] = useState<any[]>([]);
    const [pendingTasks, setPendingTasks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [analytics, setAnalytics] = useState<any>(null);
    const { user } = useAuth();
    const router = useRouter();

    useEffect(() => {
        // Redirect non-students to their own portals
        if (user && user.role === 'admin') { router.push('/admin'); return; }
        if (user && user.role === 'instructor') { router.push('/instructor'); return; }

        const fetchDashboardData = async () => {
            try {
                const [batchesRes, analyticsRes, aiCoursesRes, activityRes, pendingTasksRes] = await Promise.all([
                    api.get('/batches/enrolled'),
                    studentApi.getDashboardAnalytics(),
                    api.get('/courses'),
                    studentApi.getActivity(),
                    studentApi.getPendingTasks()
                ]);
                setBatches(batchesRes.data);
                setAnalytics(analyticsRes.data);
                setAiCourses(aiCoursesRes.data);
                setActivity(activityRes.data);
                setPendingTasks(pendingTasksRes.data);
            } catch (error) {
                console.error('Failed to fetch dashboard data', error);
            } finally {
                setLoading(false);
            }
        };

        if (user) {
            fetchDashboardData();
        }
    }, [user, router]);

    const handleDeleteAiCourse = async (id: string, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        try {
            await api.delete(`/courses/${id}`);
            setAiCourses(prev => prev.filter(c => c._id !== id));
        } catch (error) {
            console.error('Failed to delete course', error);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 md:px-8 py-8 space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
                    <p className="text-muted-foreground mt-1">Welcome back, {user?.name}. Here's an overview of your learning journey.</p>
                </div>
            </div>

            {/* Analytics Section */}
            {analytics && (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card className="border-l-4 border-l-primary shadow-sm hover:shadow-md transition-shadow">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Batches</CardTitle>
                            <BookOpen className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{analytics.totalBatches}</div>
                            <p className="text-xs text-muted-foreground">Enrolled batches</p>
                        </CardContent>
                    </Card>
                    <Card className="border-l-4 border-l-green-500 shadow-sm hover:shadow-md transition-shadow">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Quizzes Taken</CardTitle>
                            <Target className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{analytics.totalQuizzesTaken}</div>
                            <p className="text-xs text-muted-foreground">Quizzes completed</p>
                        </CardContent>
                    </Card>
                    <Card className="border-l-4 border-l-indigo-500 shadow-sm hover:shadow-md transition-shadow">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Avg. Quiz Score</CardTitle>
                            <Trophy className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{analytics.avgQuizScore}%</div>
                            <p className="text-xs text-muted-foreground">Across graded quizzes</p>
                        </CardContent>
                    </Card>
                    <Card className="border-l-4 border-l-orange-500 shadow-sm hover:shadow-md transition-shadow">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Assignments</CardTitle>
                            <Sparkles className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{analytics.totalAssignmentsSubmitted}</div>
                            <p className="text-xs text-muted-foreground">Submitted assignments</p>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Pending Tasks Section */}
            {pendingTasks && pendingTasks.length > 0 && (
                <div className="mt-8 space-y-4">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Clock className="w-5 h-5 text-orange-500" /> Pending Tasks
                    </h2>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {pendingTasks.map((task) => (
                            <Card key={`${task.type}-${task.id}`} className="flex flex-col h-full bg-orange-500/5 border-orange-500/20">
                                <CardHeader className="pb-2">
                                    <div className="flex justify-between items-start gap-4">
                                        <Badge variant="outline" className={task.type === 'assignment' ? 'text-orange-600 border-orange-200' : 'text-blue-600 border-blue-200'}>
                                            {task.type === 'assignment' ? 'Assignment' : 'Quiz'}
                                        </Badge>
                                        <div className="text-xs text-muted-foreground font-medium">
                                            Due: {new Date(task.dueDate).toLocaleDateString()}
                                        </div>
                                    </div>
                                    <CardTitle className="line-clamp-2 mt-2 text-lg font-medium text-foreground">
                                        {task.title}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="flex-grow pt-2">
                                    <p className="text-sm text-muted-foreground line-clamp-1">
                                        {task.batchTitle}
                                    </p>
                                </CardContent>
                                <CardFooter className="pt-2 pb-4 px-6">
                                    <Link href={`/batches/${task.batchId}?tab=${task.type === 'assignment' ? 'assignments' : 'quizzes'}`} className="w-full">
                                        <Button variant="outline" className="w-full text-xs h-8">
                                            Start {task.type === 'assignment' ? 'Assignment' : 'Quiz'} <ArrowRight className="ml-2 h-3 w-3" />
                                        </Button>
                                    </Link>
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                </div>
            )}

            {/* Activity Heatmap */}
            <Card className="border-none shadow-sm hover:shadow-md transition-shadow bg-card rounded-[24px] overflow-hidden">
                <CardHeader className="pb-2 pt-6 px-8">
                    <CardTitle className="text-xl font-normal flex items-center gap-2">
                        <ActivityIcon className="h-5 w-5 text-green-500" /> Learning Activity
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex justify-center overflow-x-auto pb-8 pt-4 px-8">
                    <div className="min-w-max">
                        {activity && (
                            <ActivityCalendar 
                                data={(() => {
                                    const today = new Date();
                                    const yearAgo = subYears(today, 1);
                                    const formattedToday = format(today, 'yyyy-MM-dd');
                                    const formattedYearAgo = format(yearAgo, 'yyyy-MM-dd');

                                    const processedActivity = activity.map(item => ({
                                        date: item.date,
                                        count: item.count,
                                        level: item.count > 0 ? 4 : 0
                                    }));

                                    if (!processedActivity.find(a => a.date === formattedYearAgo)) {
                                        processedActivity.push({ date: formattedYearAgo, count: 0, level: 0 });
                                    }
                                    if (!processedActivity.find(a => a.date === formattedToday)) {
                                        processedActivity.push({ date: formattedToday, count: 0, level: 0 });
                                    }
                                    
                                    processedActivity.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                                    return processedActivity;
                                })()} 
                                theme={{
                                    light: ['#ebedf0', '#c6e48b', '#7bc96f', '#239a3b', '#196127'],
                                    dark: ['#161b22', '#0e4429', '#006d32', '#26a641', '#39d353']
                                }}
                                blockSize={14}
                                blockRadius={3}
                                blockMargin={4}
                                fontSize={14}
                                renderBlock={(block, activity) => React.cloneElement(block, {}, (
                                    <title>{activity.date}: {activity.count > 0 ? 'Present' : 'Absent'}</title>
                                ))}
                            />
                        )}
                    </div>
                </CardContent>
            </Card>

            {batches.length === 0 ? (
                <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                >
                    <Card className="text-center py-20 border-dashed border-2 bg-transparent shadow-none">
                         <CardContent className="space-y-6 flex flex-col items-center">
                            <div className="p-4 bg-secondary rounded-full">
                                <BookOpen className="h-12 w-12 text-secondary-foreground" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-2xl font-normal">No Batches Yet</h3>
                                <p className="text-muted-foreground max-w-sm mx-auto">
                                    You haven't been enrolled in any batches yet. Wait for an admin to enroll you.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            ) : (
                <motion.div 
                    variants={container}
                    initial="hidden"
                    animate="show"
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                >
                    {batches.map((batch) => (
                        <motion.div key={batch._id} variants={item}>
                            <Card className="flex flex-col h-full group transition-all duration-300 bg-card border-none shadow-sm hover:shadow-md rounded-[24px] overflow-hidden">
                                <CardHeader className="pb-2">
                                    <div className="flex justify-between items-start gap-4">
                                        <div className="h-12 w-12 rounded-2xl bg-secondary flex items-center justify-center text-secondary-foreground">
                                            <GraduationCap className="h-6 w-6" />
                                        </div>
                                        <Badge>
                                            {batch.progress}% Completed
                                        </Badge>
                                    </div>
                                    <CardTitle className="line-clamp-2 mt-4 text-xl font-normal text-foreground leading-snug">
                                        {batch.title}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="flex-grow pt-2">
                                    <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed font-light">
                                        {batch.description}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-4">Instructor: {batch.instructor?.name}</p>
                                </CardContent>
                                <CardFooter className="pt-2 pb-6 px-6">
                                    <Link href={`/batches/${batch._id}`} className="w-full">
                                        <Button className="w-full rounded-full h-10 font-medium shadow-sm hover:shadow-md transition-all">
                                            Continue Learning
                                        </Button>
                                    </Link>
                                </CardFooter>
                            </Card>
                        </motion.div>
                    ))}
                </motion.div>
            )}

            {aiCourses.length > 0 && (
                <div className="mt-12 space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                            <Sparkles className="w-6 h-6 text-indigo-500" /> My AI Courses
                        </h2>
                    </div>
                    <motion.div 
                        variants={container}
                        initial="hidden"
                        animate="show"
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                    >
                        {aiCourses.map((course) => (
                            <motion.div key={course._id} variants={item}>
                                <Card className="flex flex-col h-full group transition-all duration-300 bg-card border shadow-sm hover:shadow-md rounded-[24px] overflow-hidden relative">
                                    <div className="absolute top-4 right-4 z-10">
                                        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-red-500 hover:bg-red-500/10 h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm" onClick={(e) => handleDeleteAiCourse(course._id, e)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    <CardHeader className="pb-2 pt-6">
                                        <div className="flex justify-between items-start gap-4">
                                            <div className="h-12 w-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                                                <BookOpen className="h-6 w-6" />
                                            </div>
                                            <Badge variant="outline" className="text-indigo-600 border-indigo-200">
                                                {course.level}
                                            </Badge>
                                        </div>
                                        <CardTitle className="line-clamp-2 mt-4 text-xl font-normal text-foreground leading-snug pr-8">
                                            {course.title}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="flex-grow pt-2">
                                        <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed font-light">
                                            {course.description}
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-4">{course.modules?.length || 0} Modules</p>
                                    </CardContent>
                                    <CardFooter className="pt-2 pb-6 px-6">
                                        <Link href={`/courses/${course._id}`} className="w-full">
                                            <Button variant="outline" className="w-full rounded-full h-10 font-medium transition-all hover:bg-indigo-50 hover:text-indigo-600 border-indigo-200">
                                                Continue Learning
                                            </Button>
                                        </Link>
                                    </CardFooter>
                                </Card>
                            </motion.div>
                        ))}
                    </motion.div>
                </div>
            )}
        </div>
    );
}
