'use client';

import { useState, useEffect, use } from 'react';
import { batchApi, lectureApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import {
    ArrowLeft, Video, FileText, Users, Calendar, Play,
    CheckCircle, Clock, LogOut as LeaveIcon, LayoutGrid, Target, Sparkles, PlayCircle, MessageCircleQuestion
} from 'lucide-react';
import { toast } from 'sonner';
import BatchQueriesTab from '@/components/student/BatchQueriesTab';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import StudentQuizzesTab from '@/components/batches/StudentQuizzesTab';
import StudentAssignmentsTab from '@/components/batches/StudentAssignmentsTab';

interface Lecture {
    _id: string;
    title: string;
    description: string;
    order: number;
    videoStatus: string;
    notesFilename?: string;
    tags: Array<{ _id: string; name: string }>;
    videoDuration?: number;
    watchProgress?: { watchedSeconds: number; percentWatched: number; lastWatchedAt: string | null };
}

interface BatchDetail {
    _id: string;
    title: string;
    description: string;
    startDate: string;
    endDate: string;
    isActive: boolean;
    studentCount: number;
    isEnrolled: boolean;
    isInstructor: boolean;
    instructor: { _id: string; name: string; email: string; bio: string };
    lectures: Lecture[];
}

export default function BatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [batch, setBatch] = useState<BatchDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [leaveDialog, setLeaveDialog] = useState(false);

    useEffect(() => {
        const fetchBatch = async () => {
            try {
                const { data } = await batchApi.getBatchDetail(id);
                setBatch(data);
            } catch (err) {
                console.error('Failed to fetch batch:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchBatch();
    }, [id]);

    const confirmLeave = () => {
        setLeaveDialog(true);
    };

    const handleLeave = async () => {
        try {
            await batchApi.leaveBatch(id);
            toast.success('Successfully left the batch');
            window.location.href = '/batches';
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to leave batch');
        } finally {
            setLeaveDialog(false);
        }
    };

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    if (loading) {
        return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
    }

    if (!batch) {
        return <div className="text-center py-12 text-muted-foreground">Batch not found or access denied.</div>;
    }

    const completedLectures = batch.lectures.filter(l => (l.watchProgress?.percentWatched || 0) >= 80).length;
    const totalLectures = batch.lectures.length;
    const overallProgress = totalLectures > 0 ? Math.round((completedLectures / totalLectures) * 100) : 0;

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="flex items-start sm:items-center gap-3">
                    <Link href="/batches"><Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button></Link>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">{batch.title}</h1>
                        <p className="text-sm text-muted-foreground mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                            <span>by {batch.instructor.name}</span>
                            <span className="hidden sm:inline">•</span>
                            <span><Calendar className="w-3.5 h-3.5 inline mr-1" />{new Date(batch.startDate).toLocaleDateString()} — {new Date(batch.endDate).toLocaleDateString()}</span>
                            <span className="hidden sm:inline">•</span>
                            <span><Users className="w-3.5 h-3.5 inline mr-1" />{batch.studentCount} students</span>
                        </p>
                    </div>
                </div>
                {batch.isEnrolled && (
                    <Button variant="outline" size="sm" className="text-destructive gap-1" onClick={confirmLeave}>
                        <LeaveIcon className="w-3.5 h-3.5" /> Leave
                    </Button>
                )}
            </div>

            {batch.description && (
                <p className="text-muted-foreground">{batch.description}</p>
            )}

            {/* Progress Bar */}
            {batch.isEnrolled && totalLectures > 0 && (
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium">Course Progress</span>
                            <span className="text-sm text-muted-foreground">{completedLectures}/{totalLectures} completed</span>
                        </div>
                        <div className="w-full h-2 bg-accent rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${overallProgress}%` }} />
                        </div>
                    </CardContent>
                </Card>
            )}
            {/* Content Tabs */}
            <Tabs defaultValue="lectures" className="w-full mt-6">
                <TabsList className="grid w-full max-w-2xl grid-cols-4 mb-8">
                    <TabsTrigger value="lectures" className="flex items-center gap-2"><LayoutGrid className="w-4 h-4"/> Lectures</TabsTrigger>
                    <TabsTrigger value="quizzes" className="flex items-center gap-2"><Target className="w-4 h-4"/> Quizzes</TabsTrigger>
                    <TabsTrigger value="assignments" className="flex items-center gap-2"><Sparkles className="w-4 h-4"/> Assignments</TabsTrigger>
                    <TabsTrigger value="queries" className="flex items-center gap-2"><MessageCircleQuestion className="w-4 h-4"/> Q&A Queries</TabsTrigger>
                </TabsList>

                <TabsContent value="lectures">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Lectures ({totalLectures})</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            {batch.lectures.length === 0 ? (
                                <div className="text-center py-12 text-muted-foreground">
                                    <Video className="w-10 h-10 mx-auto mb-3 opacity-50" />
                                    <p>No lectures published yet.</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-border">
                            {batch.lectures.map((lecture, idx) => {
                                const progress = lecture.watchProgress?.percentWatched || 0;
                                const isCompleted = progress >= 80;
                                const isStarted = progress > 0;

                                return (
                                    <Link key={lecture._id} href={`/batches/${batch._id}/lectures/${lecture._id}`}>
                                        <div className="flex items-center gap-4 p-4 hover:bg-accent/50 transition-colors cursor-pointer">
                                            {/* Index / Status */}
                                            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-2 border-border">
                                                {isCompleted ? (
                                                    <CheckCircle className="w-5 h-5 text-emerald-500" />
                                                ) : isStarted ? (
                                                    <PlayCircle className="w-5 h-5 text-blue-500" />
                                                ) : (
                                                    <span className="text-xs text-muted-foreground">{idx + 1}</span>
                                                )}
                                            </div>

                                            {/* Info */}
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-medium text-sm">{lecture.title}</h4>
                                                <div className="flex items-center gap-2 mt-1">
                                                    {lecture.videoDuration && (
                                                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                            <Clock className="w-3 h-3" /> {formatDuration(lecture.videoDuration)}
                                                        </span>
                                                    )}
                                                    {lecture.notesFilename && (
                                                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                            <FileText className="w-3 h-3" /> PDF
                                                        </span>
                                                    )}
                                                    {lecture.tags?.map((tag) => (
                                                        <Badge key={tag._id} variant="outline" className="text-[10px] h-4">{tag.name}</Badge>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Progress */}
                                            {isStarted && (
                                                <div className="text-right shrink-0">
                                                    <span className="text-xs text-muted-foreground">{Math.round(progress)}%</span>
                                                    <div className="w-16 h-1.5 bg-accent rounded-full mt-1 overflow-hidden">
                                                        <div className={`h-full rounded-full ${isCompleted ? 'bg-emerald-500' : 'bg-blue-500'}`}
                                                            style={{ width: `${progress}%` }} />
                                                    </div>
                                                </div>
                                            )}

                                            <Play className="w-4 h-4 text-muted-foreground shrink-0" />
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    )}
                    </CardContent>
                </Card>
                </TabsContent>

                <TabsContent value="quizzes">
                    <StudentQuizzesTab batchId={id} />
                </TabsContent>

                <TabsContent value="assignments">
                    <StudentAssignmentsTab batchId={id} />
                </TabsContent>

                <TabsContent value="queries">
                    <BatchQueriesTab batchId={batch._id} instructorId={batch.instructor._id} />
                </TabsContent>
            </Tabs>

            <AlertDialog open={leaveDialog} onOpenChange={setLeaveDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Leave Batch</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to leave this batch? You will lose access to the course content.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleLeave} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Leave
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
