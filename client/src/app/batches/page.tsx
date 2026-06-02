'use client';

import { useState, useEffect } from 'react';
import { batchApi } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Search, Users, Video, Calendar, UserPlus, Check } from 'lucide-react';
import { toast } from 'sonner';

interface BatchItem {
    _id: string;
    title: string;
    description: string;
    startDate: string;
    endDate: string;
    isActive: boolean;
    studentCount: number;
    lectureCount: number;
    isEnrolled: boolean;
    maxStudents: number;
    instructor: { name: string; email: string; bio: string };
}

export default function BrowseBatchesPage() {
    const [batches, setBatches] = useState<BatchItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const fetchBatches = async () => {
        setLoading(true);
        try {
            const params: Record<string, string | number> = { page, limit: 12 };
            if (search) params.search = search;
            const { data } = await batchApi.browseBatches(params);
            setBatches(data.batches);
            setTotalPages(data.pages);
        } catch (err) {
            console.error('Failed to fetch batches:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchBatches(); }, [page]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setPage(1);
        fetchBatches();
    };

    const handleJoin = async (batchId: string) => {
        try {
            await batchApi.joinBatch(batchId);
            fetchBatches();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to join');
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Browse Batches</h1>
                <p className="text-muted-foreground">Find and join available courses.</p>
            </div>

            <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2 max-w-lg">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input placeholder="Search batches..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
                </div>
                <Button type="submit" variant="secondary">Search</Button>
            </form>

            {loading ? (
                <div className="flex items-center justify-center h-32">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
            ) : batches.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                    <Video className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="text-lg">No batches available</p>
                    <p className="text-sm">Check back later for new courses.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {batches.map((batch) => (
                        <Card key={batch._id} className="flex flex-col h-full hover:shadow-md transition-shadow">
                            <CardContent className="p-5 flex flex-col flex-1">
                                <div className="flex-1">
                                    <h3 className="font-semibold text-lg mb-1">{batch.title}</h3>
                                    <p className="text-sm text-muted-foreground mb-2">by {batch.instructor.name}</p>
                                    {batch.description && (
                                        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{batch.description}</p>
                                    )}
                                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground mb-3">
                                        <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {batch.studentCount} students</span>
                                        <span className="flex items-center gap-1"><Video className="w-3.5 h-3.5" /> {batch.lectureCount} lectures</span>
                                        <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />
                                            {new Date(batch.startDate).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                                {batch.isEnrolled ? (
                                    <Link href={`/batches/${batch._id}`}>
                                        <Button variant="secondary" className="w-full gap-2">
                                            <Check className="w-4 h-4" /> Enrolled — View
                                        </Button>
                                    </Link>
                                ) : (
                                    <Button className="w-full gap-2" onClick={() => handleJoin(batch._id)}>
                                        <UserPlus className="w-4 h-4" /> Join Batch
                                    </Button>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {totalPages > 1 && (
                <div className="flex justify-center gap-2">
                    <Button variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
                    <span className="flex items-center text-sm text-muted-foreground px-3">Page {page} of {totalPages}</span>
                    <Button variant="outline" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
                </div>
            )}
        </div>
    );
}
