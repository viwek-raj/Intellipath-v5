'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, BookOpen, Sparkles, GraduationCap, Plus, Clock, MoreVertical, Loader2, ArrowRight, Target, Trophy } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { Badge } from '@/components/ui/badge';

interface Course {
    _id: string;
    title: string;
    description: string;
    level: string;
    isGenerated: boolean;
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
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);
    const [analytics, setAnalytics] = useState<any>(null);
    const { user } = useAuth();
    const router = useRouter();

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const [coursesRes, analyticsRes] = await Promise.all([
                    api.get('/courses'),
                    api.get('/courses/analytics')
                ]);
                setCourses(coursesRes.data);
                setAnalytics(analyticsRes.data);
            } catch (error) {
                console.error('Failed to fetch dashboard data', error);
            } finally {
                setLoading(false);
            }
        };

        if (user) {
            fetchDashboardData();
        }
    }, [user]);

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
                <Link href="/courses/create">
                    <Button className="rounded-full shadow-lg shadow-primary/20 transition-all hover:scale-105">
                        <Plus className="mr-2 h-4 w-4" /> Create New Course
                    </Button>
                </Link>
            </div>

            {/* Analytics Section */}
            {analytics && (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card className="border-l-4 border-l-primary shadow-sm hover:shadow-md transition-shadow">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Courses</CardTitle>
                            <BookOpen className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{analytics.totalCourses}</div>
                            <p className="text-xs text-muted-foreground">Enrolled courses</p>
                        </CardContent>
                    </Card>
                    <Card className="border-l-4 border-l-green-500 shadow-sm hover:shadow-md transition-shadow">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Lessons Learned</CardTitle>
                            <Target className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{analytics.completedModules}</div>
                            <p className="text-xs text-muted-foreground">Modules completed</p>
                        </CardContent>
                    </Card>
                    <Card className="border-l-4 border-l-indigo-500 shadow-sm hover:shadow-md transition-shadow">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Avg. Quiz Score</CardTitle>
                            <Trophy className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{analytics.avgQuizScore.toFixed(0)}%</div>
                            <p className="text-xs text-muted-foreground">Across all quizzes</p>
                        </CardContent>
                    </Card>
                    <Card className="border-l-4 border-l-orange-500 shadow-sm hover:shadow-md transition-shadow">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Knowledge Level</CardTitle>
                            <Sparkles className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {analytics.completedModules > 10 ? 'Expert' : analytics.completedModules > 5 ? 'Intermediate' : 'Novice'}
                            </div>
                            <p className="text-xs text-muted-foreground">Based on activity</p>
                        </CardContent>
                    </Card>
                </div>
            )}

            {courses.length === 0 ? (
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
                                <h3 className="text-2xl font-normal">Start Your Journey</h3>
                                <p className="text-muted-foreground max-w-sm mx-auto">
                                    You haven't created any courses yet. Use our AI to generate a custom curriculum instantly.
                                </p>
                            </div>
                            <Link href="/courses/create">
                                <Button size="lg" variant="outline" className="rounded-full border-outline h-12 px-8">
                                    Create First Course
                                </Button>
                            </Link>
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
                    {courses.map((course) => (
                        <motion.div key={course._id} variants={item}>
                            <Card className="flex flex-col h-full group transition-all duration-300 bg-card border-none shadow-sm hover:shadow-md rounded-[24px] overflow-hidden">
                                <CardHeader className="pb-2">
                                    <div className="flex justify-between items-start gap-4">
                                        <div className="h-12 w-12 rounded-2xl bg-secondary flex items-center justify-center text-secondary-foreground">
                                            <GraduationCap className="h-6 w-6" />
                                        </div>
                                        <Badge>
                                            {course.level}
                                        </Badge>
                                    </div>
                                    <CardTitle className="line-clamp-2 mt-4 text-xl font-normal text-foreground leading-snug">
                                        {course.title}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="flex-grow pt-2">
                                    <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed font-light">
                                        {course.description}
                                    </p>
                                </CardContent>
                                <CardFooter className="pt-2 pb-6 px-6">
                                    <Link href={`/courses/${course._id}`} className="w-full">
                                        <Button className="w-full rounded-full h-10 font-medium shadow-sm hover:shadow-md transition-all">
                                            Continue
                                        </Button>
                                    </Link>
                                </CardFooter>
                            </Card>
                        </motion.div>
                    ))}
                </motion.div>
            )}
        </div>
    );
}
