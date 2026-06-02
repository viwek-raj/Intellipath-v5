'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { batchApi, lectureApi, taxonomyApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import {
    ArrowLeft, ChevronLeft, ChevronRight, FileText, Download,
    Play, Pause, Clock, Tag, Plus, Target, CheckCircle2,
    LayoutGrid, Settings, Users, Video, BookOpen, Search, Filter, Trash2, Edit, Upload, Sparkles, AlertCircle, CheckCircle, Loader2, UploadCloud, RadioTower, Copy, Check
} from 'lucide-react';
import * as Upchunk from '@mux/upchunk';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import InstructorQuizzesTab from '@/components/batches/InstructorQuizzesTab';
import InstructorAssignmentsTab from '@/components/batches/InstructorAssignmentsTab';
import { toast } from 'sonner';
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

interface Lecture {
    _id: string;
    title: string;
    description: string;
    order: number;
    videoStatus: string;
    isPublished: boolean;
    notesPath?: string;
    notesFilename?: string;
    tags: Array<{ _id: string; name: string }>;
    viewCount: number;
    isLive?: boolean;
    liveStatus?: string;
    liveRoomUrl?: string;
}

interface Batch {
    _id: string;
    title: string;
    description: string;
    startDate: string;
    endDate: string;
    isActive: boolean;
    students: string[];
    maxStudents: number;
}

export default function InstructorBatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [batch, setBatch] = useState<Batch | null>(null);
    const [lectures, setLectures] = useState<Lecture[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploadingLectures, setUploadingLectures] = useState<{[key: string]: number}>({});
    const [showUpload, setShowUpload] = useState(false);
    const [deleteDialog, setDeleteDialog] = useState<{isOpen: boolean, id: string | null}>({isOpen: false, id: null});
    const [showLiveForm, setShowLiveForm] = useState(false);

    // Upload form state
    const [uploadTitle, setUploadTitle] = useState('');
    const [uploadDesc, setUploadDesc] = useState('');
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [pdfFile, setPdfFile] = useState<File | null>(null);
    const [tagSearch, setTagSearch] = useState('');
    const [tagResults, setTagResults] = useState<Array<{ _id: string; name: string }>>([]);
    const [selectedTags, setSelectedTags] = useState<Array<{ _id: string; name: string }>>([]);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadError, setUploadError] = useState('');

    const fetchData = useCallback(async () => {
        try {
            const [batchRes, lecturesRes] = await Promise.all([
                batchApi.getBatchDetail(id),
                lectureApi.getLecturesByBatch(id),
            ]);
            setBatch(batchRes.data);
            setLectures(Array.isArray(lecturesRes.data) ? lecturesRes.data : lecturesRes.data.lectures || []);
        } catch (err) {
            console.error('Failed to fetch batch:', err);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => { fetchData(); }, [fetchData]);

    useEffect(() => {
        const processingLectures = lectures.filter((l: any) => l.videoStatus === 'processing' || l.videoStatus === 'pending_upload');
        if (processingLectures.length === 0) return;

        const interval = setInterval(() => {
            let updated = false;
            Promise.all(processingLectures.map(async (l: any) => {
                try {
                    const res = await lectureApi.syncMuxStatus(l._id);
                    if (res.data.videoStatus !== l.videoStatus) {
                        updated = true;
                    }
                } catch (e) { }
            })).then(() => {
                if (updated) fetchData();
            });
        }, 5000);

        return () => clearInterval(interval);
    }, [lectures, fetchData]);
    const searchTags = async (q: string) => {
        setTagSearch(q);
        if (q.length < 1) { setTagResults([]); return; }
        try {
            const { data } = await taxonomyApi.searchTags(q);
            setTagResults(data.filter((t: any) => !selectedTags.some(s => s._id === t._id)));
        } catch (err) { console.error(err); }
    };

    const handleAttachNotes = async (lectureId: string, file: File) => {
        const formData = new FormData();
        formData.append('pdf', file);
        try {
            await lectureApi.uploadLectureNotes(lectureId, formData);
            fetchData();
        } catch (err: any) {
            console.error('Failed to attach notes', err);
            toast.error(err.response?.data?.message || 'Failed to attach notes');
        }
    };

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        setUploading(true);
        setUploadError('');
        setUploadProgress(0);

        try {
            let muxUploadId = null;

            if (videoFile) {
                const { data: { uploadId, uploadUrl } } = await lectureApi.getMuxUploadUrl();
                muxUploadId = uploadId;

                await new Promise((resolve, reject) => {
                    const upload = Upchunk.createUpload({
                        endpoint: uploadUrl,
                        file: videoFile as any, // File type is compatible
                        chunkSize: 5120, // 5MB
                    });

                    upload.on('error', (err) => reject(err));
                    upload.on('progress', (progress) => {
                        setUploadProgress(Math.round(progress.detail));
                    });
                    upload.on('success', () => resolve(null));
                });
            }

            const initialData = new FormData();
            initialData.append('batchId', id);
            initialData.append('title', uploadTitle);
            initialData.append('description', uploadDesc);
            if (pdfFile) initialData.append('pdf', pdfFile);
            if (selectedTags.length > 0) {
                initialData.append('tags', selectedTags.map(t => t._id).join(','));
            }
            if (muxUploadId) {
                initialData.append('muxUploadId', muxUploadId);
            }

            await lectureApi.uploadLecture(initialData);
            
            setUploadTitle('');
            setUploadDesc('');
            setVideoFile(null);
            setPdfFile(null);
            setSelectedTags([]);
            setShowUpload(false);
            fetchData();
        } catch (err: any) {
            console.error('Upload error', err);
            setUploadError(err.message || err.response?.data?.message || 'Failed to upload lecture');
        } finally {
            setUploading(false);
            setUploadProgress(0);
        }
    };

    const handleCreateLiveStream = async (e: React.FormEvent) => {
        e.preventDefault();
        setUploading(true);
        setUploadError('');
        try {
            const res = await lectureApi.createLiveStream({
                batchId: id,
                title: uploadTitle,
                description: uploadDesc,
                tags: selectedTags.map(t => t._id)
            });
            
            setUploadTitle('');
            setUploadDesc('');
            setSelectedTags([]);
            setShowLiveForm(false);
            fetchData();
            
            toast.success('Live class scheduled!');
        } catch (err: any) {
            setUploadError(err.message || err.response?.data?.message || 'Failed to create live stream');
        } finally {
            setUploading(false);
        }
    };

    const handleEndLiveStream = async (lectureId: string) => {
        try {
            await lectureApi.endLiveStream(lectureId);
            toast.success('Live stream ended.');
            fetchData();
        } catch (err) {
            toast.error('Failed to end live stream');
        }
    };

    const confirmDelete = (lectureId: string) => {
        setDeleteDialog({ isOpen: true, id: lectureId });
    };

    const handleDelete = async () => {
        const { id } = deleteDialog;
        if (!id) return;
        try {
            await lectureApi.deleteLecture(id);
            fetchData();
            toast.success('Lecture deleted successfully');
        } catch (err) { 
            console.error(err); 
            toast.error('Failed to delete lecture');
        } finally {
            setDeleteDialog({ isOpen: false, id: null });
        }
    };

    const statusIcon = (status: string) => {
        switch (status) {
            case 'ready': return <CheckCircle className="w-4 h-4 text-emerald-500" />;
            case 'processing': return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
            case 'failed': return <AlertCircle className="w-4 h-4 text-red-500" />;
            case 'pending_upload': return <UploadCloud className="w-4 h-4 text-orange-500 animate-pulse" />;
            default: return <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />;
        }
    };

    if (loading) {
        return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
    }

    if (!batch) {
        return <div className="text-center py-12 text-muted-foreground">Batch not found</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start sm:items-center gap-3">
                    <Link href="/instructor"><Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button></Link>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">{batch.title}</h1>
                        <p className="text-sm text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1">
                            <span>{new Date(batch.startDate).toLocaleDateString()} — {new Date(batch.endDate).toLocaleDateString()}</span>
                            <span className="hidden sm:inline">•</span><span>{batch.students.length} students</span>
                            <span className="hidden sm:inline">•</span><span>{lectures.length} lectures</span>
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button onClick={() => setShowLiveForm(!showLiveForm)} variant="outline" className="gap-2 border-red-500/20 text-red-500 hover:bg-red-500/10">
                        <RadioTower className="w-4 h-4" />
                        Schedule Live
                    </Button>
                    <Button onClick={() => setShowUpload(!showUpload)} className="gap-2">
                        <Upload className="w-4 h-4" />
                        Upload Lecture
                    </Button>
                </div>
            </div>
            {/* Content Tabs */}
            <Tabs defaultValue="lectures" className="w-full">
                <TabsList className="grid w-full max-w-md grid-cols-3 mb-8">
                    <TabsTrigger value="lectures" className="flex items-center gap-2"><LayoutGrid className="w-4 h-4"/> Lectures</TabsTrigger>
                    <TabsTrigger value="quizzes" className="flex items-center gap-2"><Target className="w-4 h-4"/> Quizzes</TabsTrigger>
                    <TabsTrigger value="assignments" className="flex items-center gap-2"><Sparkles className="w-4 h-4"/> Assignments</TabsTrigger>
                </TabsList>

                <TabsContent value="lectures" className="space-y-6">
                    {/* Schedule Live Section */}
                    {showLiveForm && (
                        <Card className="border-red-500/50 shadow-md">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2 text-red-500">
                                    <RadioTower className="w-5 h-5" /> Schedule Live Stream
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleCreateLiveStream} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Title *</Label>
                                        <Input value={uploadTitle} onChange={(e) => setUploadTitle(e.target.value)} required placeholder="Live class title" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Description</Label>
                                        <Textarea value={uploadDesc} onChange={(e) => setUploadDesc(e.target.value)} rows={2} placeholder="Brief description..." />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Tags</Label>
                                        <Input value={tagSearch} onChange={(e) => searchTags(e.target.value)} placeholder="Search tags..." />
                                        {tagResults.length > 0 && (
                                            <div className="flex flex-wrap gap-1 p-2 bg-accent rounded">
                                                {tagResults.map((tag) => (
                                                    <Badge key={tag._id} variant="outline" className="cursor-pointer hover:bg-primary/10"
                                                        onClick={() => { setSelectedTags([...selectedTags, tag]); setTagSearch(''); setTagResults([]); }}>
                                                        + {tag.name}
                                                    </Badge>
                                                ))}
                                            </div>
                                        )}
                                        {selectedTags.length > 0 && (
                                            <div className="flex flex-wrap gap-1">
                                                {selectedTags.map((tag) => (
                                                    <Badge key={tag._id} className="gap-1">
                                                        {tag.name}
                                                        <button type="button" onClick={() => setSelectedTags(selectedTags.filter(t => t._id !== tag._id))} className="ml-1 hover:text-red-400">×</button>
                                                    </Badge>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    {uploadError && <p className="text-sm text-red-500">{uploadError}</p>}
                                    <div className="flex gap-2">
                                        <Button type="submit" disabled={uploading} className="gap-2 bg-red-600 hover:bg-red-700">
                                            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RadioTower className="w-4 h-4" />} Create Stream
                                        </Button>
                                        <Button type="button" variant="outline" onClick={() => setShowLiveForm(false)}>Cancel</Button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>
                    )}

                    {/* Upload Section */}
                    {showUpload && (
                        <Card className="border-primary/50 shadow-md">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Upload className="w-5 h-5" /> Upload New Lecture
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleUpload} className="space-y-4">
                            <div className="space-y-2">
                                <Label>Title *</Label>
                                <Input value={uploadTitle} onChange={(e) => setUploadTitle(e.target.value)} required placeholder="Lecture title" />
                            </div>
                            <div className="space-y-2">
                                <Label>Description</Label>
                                <Textarea value={uploadDesc} onChange={(e) => setUploadDesc(e.target.value)} rows={2} placeholder="Brief description..." />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Video File (Optional, uploads in background)</Label>
                                    <Input type="file" accept="video/mp4,video/webm,video/x-matroska"
                                        onChange={(e) => setVideoFile(e.target.files?.[0] || null)} />
                                    {videoFile && <p className="text-xs text-muted-foreground">{videoFile.name} ({(videoFile.size / 1024 / 1024).toFixed(1)} MB)</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label>PDF Notes (optional)</Label>
                                    <Input type="file" accept="application/pdf"
                                        onChange={(e) => setPdfFile(e.target.files?.[0] || null)} />
                                    {pdfFile && <p className="text-xs text-muted-foreground">{pdfFile.name}</p>}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Tags (search and select)</Label>
                                <Input value={tagSearch} onChange={(e) => searchTags(e.target.value)} placeholder="Search tags..." />
                                {tagResults.length > 0 && (
                                    <div className="flex flex-wrap gap-1 p-2 bg-accent rounded">
                                        {tagResults.map((tag) => (
                                            <Badge key={tag._id} variant="outline" className="cursor-pointer hover:bg-primary/10"
                                                onClick={() => { setSelectedTags([...selectedTags, tag]); setTagSearch(''); setTagResults([]); }}>
                                                + {tag.name}
                                            </Badge>
                                        ))}
                                    </div>
                                )}
                                {selectedTags.length > 0 && (
                                    <div className="flex flex-wrap gap-1">
                                        {selectedTags.map((tag) => (
                                            <Badge key={tag._id} className="gap-1">
                                                {tag.name}
                                                <button onClick={() => setSelectedTags(selectedTags.filter(t => t._id !== tag._id))} className="ml-1 hover:text-red-400">×</button>
                                            </Badge>
                                        ))}
                                    </div>
                                )}
                            </div>
                            {uploadError && <p className="text-sm text-red-500">{uploadError}</p>}
                            <div className="flex gap-2">
                                <Button type="submit" disabled={uploading} className="gap-2">
                                    {uploading ? <><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</> : <><Upload className="w-4 h-4" /> Upload</>}
                                </Button>
                                <Button type="button" variant="outline" onClick={() => setShowUpload(false)}>Cancel</Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            )}

            {/* Lectures List */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Lectures ({lectures.length})</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {lectures.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <Video className="w-10 h-10 mx-auto mb-3 opacity-50" />
                            <p>No lectures yet. Upload your first lecture above.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-border">
                            {lectures.map((lecture, idx) => (
                                <div key={lecture._id} className="flex items-center gap-4 p-4 hover:bg-accent/50 transition-colors">
                                    <span className="text-sm text-muted-foreground w-6 text-center">{idx + 1}</span>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            {lecture.isLive ? (
                                                <>
                                                    <RadioTower className="w-4 h-4 text-red-500 animate-pulse" />
                                                    <h4 className="font-medium text-sm truncate">{lecture.title}</h4>
                                                    {lecture.liveStatus === 'scheduled' && <Badge variant="outline" className="text-[10px] text-red-500 border-red-500 bg-red-500/10">Scheduled</Badge>}
                                                    {lecture.liveStatus === 'live' && <Badge className="text-[10px] bg-red-500">LIVE NOW</Badge>}
                                                    {lecture.liveStatus === 'ended' && <Badge variant="secondary" className="text-[10px]">Ended / VOD</Badge>}
                                                </>
                                            ) : uploadingLectures[lecture._id] !== undefined ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                                                    <h4 className="font-medium text-sm truncate">{lecture.title}</h4>
                                                    <Badge variant="outline" className="text-[10px] text-blue-500 bg-blue-500/10 border-blue-500/20">{uploadingLectures[lecture._id]}% Uploading</Badge>
                                                </>
                                            ) : (
                                                <>
                                                    {statusIcon(lecture.videoStatus)}
                                                    <h4 className="font-medium text-sm truncate">{lecture.title}</h4>
                                                    {lecture.videoStatus === 'pending_upload' && (
                                                        <Badge variant="outline" className="text-[10px] text-orange-500 border-orange-500/20">Waiting for Video</Badge>
                                                    )}
                                                    {lecture.videoStatus === 'processing' && (
                                                        <Badge variant="secondary" className="text-[10px]">Transcoding...</Badge>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 mt-1">
                                            {lecture.tags?.map((tag) => (
                                                <Badge key={tag._id} variant="outline" className="text-[10px] h-4">{tag.name}</Badge>
                                            ))}
                                            {lecture.notesFilename ? (
                                                <span className="text-[10px] text-muted-foreground flex items-center gap-0.5" title={lecture.notesFilename}>
                                                    <FileText className="w-3 h-3" /> PDF
                                                    <Button variant="ghost" size="icon" className="h-4 w-4 ml-1" onClick={(e) => { e.stopPropagation(); document.getElementById(`pdf-upload-${lecture._id}`)?.click(); }}>
                                                        <Upload className="w-3 h-3" />
                                                    </Button>
                                                </span>
                                            ) : (
                                                <Button variant="outline" size="sm" className="h-5 text-[10px] px-2 py-0" onClick={(e) => { e.stopPropagation(); document.getElementById(`pdf-upload-${lecture._id}`)?.click(); }}>
                                                    <FileText className="w-3 h-3 mr-1" /> Attach PDF
                                                </Button>
                                            )}
                                            <input type="file" id={`pdf-upload-${lecture._id}`} className="hidden" accept="application/pdf" onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) handleAttachNotes(lecture._id, file);
                                            }} />
                                            <span className="text-[10px] text-muted-foreground">{lecture.viewCount} views</span>
                                        </div>
                                    </div>
                                    {lecture.isLive && lecture.liveStatus !== 'ended' && (
                                        <div className="flex gap-2">
                                            <a href={lecture.liveRoomUrl} target="_blank" rel="noreferrer">
                                                <Button size="sm" className="h-8 bg-red-600 hover:bg-red-700 gap-1">
                                                    <RadioTower className="w-3.5 h-3.5" /> Join Studio
                                                </Button>
                                            </a>
                                            <Button size="sm" variant="outline" className="h-8 text-red-500 border-red-500/20 hover:bg-red-500/10" onClick={() => handleEndLiveStream(lecture._id)}>
                                                End Stream
                                            </Button>
                                        </div>
                                    )}

                                    <Button size="icon" variant="ghost" className="text-destructive h-8 w-8"
                                        onClick={() => confirmDelete(lecture._id)}>
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                    </CardContent>
                </Card>
                </TabsContent>

                <TabsContent value="quizzes">
                    <InstructorQuizzesTab batchId={id} />
                </TabsContent>

                <TabsContent value="assignments">
                    <InstructorAssignmentsTab batchId={id} />
                </TabsContent>
            </Tabs>

            <AlertDialog open={deleteDialog.isOpen} onOpenChange={(open) => !open && setDeleteDialog({ isOpen: false, id: null })}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete this lecture. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
