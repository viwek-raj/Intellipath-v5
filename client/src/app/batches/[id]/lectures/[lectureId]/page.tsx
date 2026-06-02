'use client';

import { useState, useEffect, useRef, useCallback, use } from 'react';
import { lectureApi } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { CheckCircle, Download, FileText, ArrowLeft, RadioTower, AlertCircle, RefreshCw, ChevronLeft, ChevronRight, Clock, Tag } from 'lucide-react';
import { toast } from 'sonner';
import MuxPlayer from '@mux/mux-player-react';

interface LectureDetail {
    _id: string;
    title: string;
    description: string;
    videoStatus: string;
    videoHlsPath?: string;
    muxPlaybackId?: string;
    videoDuration: number;
    notesPath?: string;
    notesFilename?: string;
    tags: Array<{ _id: string; name: string }>;
    instructor: { name: string; email: string };
    batchTitle: string;
    batchId: string;
    navigation: { current: number; total: number; previous: string | null; next: string | null };
    watchProgress?: { watchedSeconds: number; percentWatched: number; lastWatchedAt: string | null };
    isLive?: boolean;
    liveStatus?: string;
    liveRoomUrl?: string;
}

export default function LectureViewerPage({ params }: { params: Promise<{ id: string; lectureId: string }> }) {
    const { id: batchId, lectureId } = use(params);
    const [lecture, setLecture] = useState<LectureDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const progressInterval = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        const fetchLecture = async () => {
            try {
                const { data } = await lectureApi.getLectureById(lectureId);
                setLecture(data);
            } catch (err) {
                console.error('Failed to fetch lecture:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchLecture();

        return () => {
            if (progressInterval.current) clearInterval(progressInterval.current);
        };
    }, [lectureId]);

    // Initialize HLS.js when lecture data loads
    useEffect(() => {
        if (!lecture) return;
        if (lecture.videoStatus !== 'ready') {
            // Check if backend has synced Mux status recently
            lectureApi.syncMuxStatus(lecture._id).then(res => {
                if (res.data.videoStatus !== lecture.videoStatus) {
                    setLecture(res.data);
                }
            }).catch(console.error);
        }
    }, [lecture]);

    const handleTimeUpdate = useCallback((e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
        const videoElement = e.target as HTMLVideoElement;
        const currentTime = Math.floor(videoElement.currentTime);
        // Throttle updates to every ~15 seconds to avoid spamming the backend
        if (currentTime > 0 && currentTime % 15 === 0) {
            lectureApi.updateProgress(lectureId, currentTime).catch(console.error);
        }
    }, [lectureId]);

    const handleVideoEnded = useCallback((e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
        const videoElement = e.target as HTMLVideoElement;
        const totalTime = Math.ceil(videoElement.duration || 0);
        if (totalTime > 0) {
            lectureApi.updateProgress(lectureId, totalTime).catch(console.error);
        }
    }, [lectureId]);

    const handleDownloadNotes = async () => {
        try {
            const response = await lectureApi.downloadNotes(lectureId);
            const blob = new Blob([response.data], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = lecture?.notesFilename || 'lecture-notes.pdf';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Failed to download notes:', err);
        }
    };

    const formatDuration = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    if (loading) {
        return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
    }

    if (!lecture) {
        return <div className="text-center py-12 text-muted-foreground">Lecture not found or access denied.</div>;
    }

    return (
        <div className="space-y-4 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <Link href={`/batches/${batchId}`}>
                        <Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
                    </Link>
                    <div>
                        <p className="text-xs text-muted-foreground">{lecture.batchTitle}</p>
                        <h1 className="text-xl font-bold tracking-tight">{lecture.title}</h1>
                    </div>
                </div>
                <div className="text-sm text-muted-foreground">
                    {lecture.navigation.current} / {lecture.navigation.total}
                </div>
            </div>

            {/* Video Player */}
            <Card className="overflow-hidden">
                <div className="aspect-video bg-black relative flex items-center justify-center">
                    {lecture.isLive && lecture.liveStatus !== 'ended' && lecture.liveRoomUrl ? (
                        <div className="flex flex-col items-center justify-center h-full text-white bg-slate-900/50 rounded-lg p-8 w-full border border-slate-800">
                            <div className="bg-blue-500/10 p-4 rounded-full mb-6">
                                <RadioTower className="w-12 h-12 text-blue-500 animate-pulse" />
                            </div>
                            <h3 className="text-2xl font-bold mb-3">Live Class in Progress</h3>
                            <p className="text-gray-400 mb-8 max-w-md text-center">
                                The instructor is currently broadcasting this live lecture. Join the virtual classroom to participate.
                            </p>
                            <a href={lecture.liveRoomUrl} target="_blank" rel="noreferrer">
                                <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white px-8 font-medium">
                                    <RadioTower className="w-4 h-4 mr-2" /> Join Live Classroom
                                </Button>
                            </a>
                            <p className="text-xs text-muted-foreground mt-4">
                                Opens securely in a new tab.
                            </p>
                        </div>
                    ) : lecture.isLive && lecture.liveStatus === 'ended' && !lecture.muxPlaybackId ? (
                        <div className="flex flex-col items-center justify-center h-full text-white">
                            <RadioTower className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                            <h3 className="text-xl font-bold">Live Class Ended</h3>
                            <p className="text-gray-400 mt-2">This live class has concluded.</p>
                        </div>
                    ) : lecture.videoStatus === 'ready' && lecture.muxPlaybackId ? (
                        <MuxPlayer
                            streamType="on-demand"
                            playbackId={lecture.muxPlaybackId}
                            metadataVideoTitle={lecture.title}
                            startTime={lecture.watchProgress?.watchedSeconds || 0}
                            onTimeUpdate={handleTimeUpdate as any}
                            onEnded={handleVideoEnded as any}
                            className="w-full h-full object-contain"
                        />
                    ) : (
                        <div className="flex items-center justify-center h-full text-white">
                            <div className="text-center">
                                {lecture.videoStatus === 'failed' ? (
                                    <>
                                        <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
                                        <p>Video processing failed.</p>
                                    </>
                                ) : (
                                    <>
                                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white mx-auto mb-3" />
                                        <p>Video is being processed by Mux...</p>
                                        <p className="text-sm text-gray-400 mt-2">Status: {lecture.videoStatus}</p>
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </Card>

            {/* Navigation + Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex gap-2">
                    {lecture.navigation.previous && (
                        <Link href={`/batches/${batchId}/lectures/${lecture.navigation.previous}`}>
                            <Button variant="outline" size="sm" className="gap-1">
                                <ChevronLeft className="w-4 h-4" /> Previous
                            </Button>
                        </Link>
                    )}
                    {lecture.navigation.next && (
                        <Link href={`/batches/${batchId}/lectures/${lecture.navigation.next}`}>
                            <Button variant="outline" size="sm" className="gap-1">
                                Next <ChevronRight className="w-4 h-4" />
                            </Button>
                        </Link>
                    )}
                </div>
                <div className="flex gap-2">
                    {lecture.notesFilename && (
                        <Button variant="outline" size="sm" className="gap-1" onClick={handleDownloadNotes}>
                            <Download className="w-4 h-4" /> Download Notes
                        </Button>
                    )}
                </div>
            </div>

            {/* Lecture Info */}
            <Card>
                <CardContent className="p-4 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                        <span className="text-sm font-medium">Instructor:</span>
                        <span className="text-sm text-muted-foreground">{lecture.instructor.name}</span>
                        {lecture.videoDuration && (
                            <>
                                <span className="text-muted-foreground">•</span>
                                <span className="text-sm text-muted-foreground flex items-center gap-1">
                                    <Clock className="w-3.5 h-3.5" /> {formatDuration(lecture.videoDuration)}
                                </span>
                            </>
                        )}
                    </div>
                    {lecture.description && (
                        <p className="text-sm text-muted-foreground">{lecture.description}</p>
                    )}
                    {lecture.tags && lecture.tags.length > 0 && (
                        <div className="flex items-center gap-2">
                            <Tag className="w-3.5 h-3.5 text-muted-foreground" />
                            {lecture.tags.map((tag) => (
                                <Badge key={tag._id} variant="outline" className="text-xs">{tag.name}</Badge>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
