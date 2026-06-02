'use client';

import { useState, useEffect } from 'react';
import { batchApi } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Video, Users, PlusCircle, Calendar, BookOpen } from 'lucide-react';

interface BatchItem {
    _id: string;
    title: string;
    description: string;
    startDate: string;
    endDate: string;
    isActive: boolean;
    studentCount: number;
    lectureCount: number;
}

export default function InstructorDashboard() {
    const [batches, setBatches] = useState<BatchItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchBatches = async () => {
            try {
                const { data } = await batchApi.getMyBatches();
                setBatches(data);
            } catch (err) {
                console.error('Failed to fetch batches:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchBatches();
    }, []);

    const totalStudents = batches.reduce((sum, b) => sum + b.studentCount, 0);
    const totalLectures = batches.reduce((sum, b) => sum + b.lectureCount, 0);
    const activeBatches = batches.filter(b => b.isActive).length;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Instructor Dashboard</h1>
                    <p className="text-muted-foreground">Manage your batches and lectures.</p>
                </div>
                <Link href="/instructor/batches/create">
                    <Button className="gap-2">
                        <PlusCircle className="w-4 h-4" />
                        New Batch
                    </Button>
                </Link>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card>
                    <CardContent className="flex items-center gap-4 p-4">
                        <div className="w-12 h-12 rounded-lg bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center">
                            <BookOpen className="w-6 h-6 text-blue-500" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{activeBatches}</p>
                            <p className="text-xs text-muted-foreground">Active Batches</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="flex items-center gap-4 p-4">
                        <div className="w-12 h-12 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center">
                            <Users className="w-6 h-6 text-emerald-500" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{totalStudents}</p>
                            <p className="text-xs text-muted-foreground">Total Students</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="flex items-center gap-4 p-4">
                        <div className="w-12 h-12 rounded-lg bg-purple-50 dark:bg-purple-950/30 flex items-center justify-center">
                            <Video className="w-6 h-6 text-purple-500" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{totalLectures}</p>
                            <p className="text-xs text-muted-foreground">Total Lectures</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Batches List */}
            {loading ? (
                <div className="flex items-center justify-center h-32">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
            ) : batches.length === 0 ? (
                <Card>
                    <CardContent className="text-center py-12">
                        <Video className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-medium">No batches yet</h3>
                        <p className="text-sm text-muted-foreground mb-4">Create your first batch to start uploading lectures.</p>
                        <Link href="/instructor/batches/create">
                            <Button>Create Batch</Button>
                        </Link>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {batches.map((batch) => (
                        <Link key={batch._id} href={`/instructor/batches/${batch._id}`}>
                            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                                <CardContent className="p-5">
                                    <div className="flex items-start justify-between mb-3">
                                        <h3 className="font-semibold text-lg">{batch.title}</h3>
                                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                            batch.isActive
                                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                                : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                                        }`}>
                                            {batch.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                    </div>
                                    {batch.description && (
                                        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{batch.description}</p>
                                    )}
                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
                                        <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {batch.studentCount} students</span>
                                        <span className="flex items-center gap-1"><Video className="w-3.5 h-3.5" /> {batch.lectureCount} lectures</span>
                                        <span className="flex items-center gap-1">
                                            <Calendar className="w-3.5 h-3.5" />
                                            {new Date(batch.startDate).toLocaleDateString()} - {new Date(batch.endDate).toLocaleDateString()}
                                        </span>
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
