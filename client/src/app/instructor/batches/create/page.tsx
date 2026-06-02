'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { batchApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, PlusCircle } from 'lucide-react';
import Link from 'next/link';

export default function CreateBatchPage() {
    const router = useRouter();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [maxStudents, setMaxStudents] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const { data } = await batchApi.createBatch({
                title,
                description,
                startDate,
                endDate,
                maxStudents: maxStudents ? parseInt(maxStudents) : 0,
            });
            router.push(`/instructor/batches/${data._id}`);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to create batch');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl space-y-6">
            <div className="flex items-center gap-3">
                <Link href="/instructor/batches">
                    <Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Create New Batch</h1>
                    <p className="text-muted-foreground">Set up a new cohort for your students.</p>
                </div>
            </div>

            <Card>
                <CardContent className="p-6">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="title">Batch Title *</Label>
                            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required
                                placeholder="e.g., Web Dev Bootcamp - Fall 2026" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="desc">Description</Label>
                            <Textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)}
                                placeholder="Brief description of this batch..." rows={3} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="start">Start Date *</Label>
                                <Input id="start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="end">End Date *</Label>
                                <Input id="end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="max">Max Students (0 = unlimited)</Label>
                            <Input id="max" type="number" min="0" value={maxStudents}
                                onChange={(e) => setMaxStudents(e.target.value)} placeholder="0" />
                        </div>

                        {error && <p className="text-sm text-red-500">{error}</p>}

                        <Button type="submit" className="w-full gap-2" disabled={loading}>
                            <PlusCircle className="w-4 h-4" />
                            {loading ? 'Creating...' : 'Create Batch'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
