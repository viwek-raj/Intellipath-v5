'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export default function CreateCoursePage() {
    const [topic, setTopic] = useState('');
    const [level, setLevel] = useState('Beginner');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { data } = await api.post('/courses', { topic, level });
            router.push(`/courses/${data._id}`);
        } catch (error) {
            console.error('Failed to create course', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mx-auto max-w-2xl p-6">
            <Card>
                <CardHeader>
                    <CardTitle>Create New Course</CardTitle>
                    <CardDescription>Enter a topic and let AI generate a structured learning path for you.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="topic">Topic</Label>
                            <Input
                                id="topic"
                                placeholder="e.g., Advanced React Patterns, Machine Learning Basics"
                                value={topic}
                                onChange={(e) => setTopic(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="level">Difficulty Level</Label>
                            <select
                                id="level"
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                value={level}
                                onChange={(e) => setLevel(e.target.value)}
                            >
                                <option value="Beginner">Beginner</option>
                                <option value="Intermediate">Intermediate</option>
                                <option value="Advanced">Advanced</option>
                            </select>
                        </div>
                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Generating Course...
                                </>
                            ) : (
                                'Generate Course'
                            )}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
