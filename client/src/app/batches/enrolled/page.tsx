'use client';

import { useState, useEffect } from 'react';
import { batchApi } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Video, Users, Calendar, BookOpen } from 'lucide-react';

interface EnrolledBatch {
    _id: string;
    title: string;
    description: string;
    startDate: string;
    endDate: string;
    isActive: boolean;
    lectureCount: number;
    watchedCount: number;
    studentCount: number;
    progress: number;
    instructor: { name: string; email: string; bio: string };
}

export default function EnrolledBatchesPage() {
    const [batches, setBatches] = useState<EnrolledBatch[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchEnrolled = async () => {
            try {
                const { data } = await batchApi.getEnrolledBatches();
                setBatches(data);
            } catch (err) {
                console.error('Failed to fetch enrolled batches:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchEnrolled();
    }, []);

    if (loading) {
        return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">My Enrolled Batches</h1>
                <p className="text-muted-foreground">Continue learning where you left off.</p>
            </div>

            {batches.length === 0 ? (
                <Card>
                    <CardContent className="text-center py-12">
                        <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-medium">No enrolled batches</h3>
                        <p className="text-sm text-muted-foreground">
                            <Link href="/batches" className="text-primary hover:underline">Browse available batches</Link> to get started.
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {batches.map((batch) => (
                        <Link key={batch._id} href={`/batches/${batch._id}`}>
                            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                                <CardContent className="p-5">
                                    <div className="flex items-start justify-between mb-2">
                                        <h3 className="font-semibold text-lg">{batch.title}</h3>
                                        <Badge variant={batch.isActive ? 'default' : 'secondary'} className="text-xs">
                                            {batch.isActive ? 'Active' : 'Ended'}
                                        </Badge>
                                    </div>
                                    <p className="text-sm text-muted-foreground mb-3">by {batch.instructor.name}</p>

                                    {/* Progress Bar */}
                                    <div className="mb-3">
                                        <div className="flex justify-between text-xs text-muted-foreground mb-1">
                                            <span>{batch.watchedCount}/{batch.lectureCount} lectures</span>
                                            <span>{batch.progress}%</span>
                                        </div>
                                        <div className="w-full h-2 bg-accent rounded-full overflow-hidden">
                                            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${batch.progress}%` }} />
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                        <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {batch.studentCount}</span>
                                        <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />
                                            {new Date(batch.startDate).toLocaleDateString()}
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
