'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Circle, ArrowLeft, PlayCircle, BookOpen, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';

interface Module {
    _id: string;
    title: string;
    description: string;
    completed: boolean;
}

interface Course {
    _id: string;
    title: string;
    description: string;
    level: string;
    modules: Module[];
}

export default function CoursePage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = use(params);
    const [course, setCourse] = useState<Course | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCourse = async () => {
            try {
                const { data } = await api.get(`/courses/${resolvedParams.id}`);
                setCourse(data);
            } catch (error) {
                console.error('Failed to fetch course', error);
            } finally {
                setLoading(false);
            }
        };

        fetchCourse();
    }, [resolvedParams.id]);

    if (loading) {
        return <div className="p-8 text-center animate-pulse">Loading course content...</div>;
    }

    if (!course) {
        return <div className="p-8 text-center">Course not found</div>;
    }

    return (
        <div className="container mx-auto p-6 max-w-5xl space-y-8">
            {/* <Link href="/dashboard" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-4 group">
                <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" /> Back to Dashboard
            </Link> */}
            
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card rounded-3xl p-8 md:p-12 border shadow-sm relative overflow-hidden"
            >
                <div className="absolute top-0 right-0 p-12 opacity-5 text-primary">
                    <BookOpen className="w-64 h-64" />
                </div>
                <div className="relative z-10 space-y-4">
                    <div className="flex items-center gap-3">
                        <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
                            {course.level}
                        </span>
                        <span className="flex items-center text-xs font-medium text-muted-foreground">
                            <Clock className="w-3 h-3 mr-1" /> Est. 2h 30m
                        </span>
                    </div>
                    <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-foreground max-w-3xl">
                        {course.title}
                    </h1>
                    <p className="text-lg md:text-xl text-muted-foreground max-w-2xl leading-relaxed">
                        {course.description}
                    </p>
                </div>
            </motion.div>

            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <BookOpen className="h-6 w-6 text-indigo-500" />
                        Learning Path
                    </h2>
                    <span className="text-sm text-muted-foreground">
                        {course.modules.length} Modules
                    </span>
                </div>

                <div className="grid gap-4">
                    {course.modules.map((module, index) => (
                        <motion.div
                            key={module._id || index}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                        >
                            <Card className="overflow-hidden group hover:border-indigo-400 dark:hover:border-indigo-600 transition-colors">
                                <div className="flex items-center md:items-start p-6 gap-6">
                                    <div className="flex-shrink-0 mt-1">
                                        {module.completed ? (
                                            <div className="h-8 w-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400">
                                                <CheckCircle2 className="h-5 w-5" />
                                            </div>
                                        ) : (
                                            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground group-hover:bg-indigo-100 group-hover:text-indigo-600 dark:group-hover:bg-indigo-900/30 dark:group-hover:text-indigo-400 transition-colors">
                                                <span className="text-xs font-bold">{index + 1}</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-grow space-y-1">
                                        <h3 className="text-lg font-semibold group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                            {module.title}
                                        </h3>
                                        <p className="text-sm text-muted-foreground line-clamp-2">
                                            {module.description}
                                        </p>
                                    </div>
                                    <div className="flex-shrink-0 hidden md:block">
                                        <Link href={`/courses/${resolvedParams.id}/modules/${module._id}`}>
                                            <Button className="rounded-full pl-4 pr-6" variant={module.completed ? "outline" : "default"}>
                                                <PlayCircle className="mr-2 h-4 w-4" />
                                                {module.completed ? "Review" : "Start"}
                                            </Button>
                                        </Link>
                                    </div>
                                </div>
                                {/* Mobile Button */}
                                <div className="md:hidden px-6 pb-6">
                                    <Link href={`/courses/${resolvedParams.id}/modules/${module._id}`} className="w-full">
                                        <Button className="w-full" variant={module.completed ? "outline" : "default"}>
                                            {module.completed ? "Review Lesson" : "Start Lesson"}
                                        </Button>
                                    </Link>
                                </div>
                            </Card>
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    );
}
