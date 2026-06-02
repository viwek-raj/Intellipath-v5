import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { assignmentApi } from '@/lib/api';
import { FileText, CheckCircle2, AlertCircle, Upload, Link as LinkIcon, Download } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function StudentAssignmentsTab({ batchId }: { batchId: string }) {
    const [assignments, setAssignments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Upload state
    const [uploadingId, setUploadingId] = useState<string | null>(null);
    const [file, setFile] = useState<File | null>(null);
    const [link, setLink] = useState('');

    const fetchAssignments = async () => {
        try {
            setLoading(true);
            const { data } = await assignmentApi.getStudentAssignments(batchId);
            setAssignments(data);
        } catch (err) {
            toast.error('Failed to fetch assignments');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAssignments();
    }, [batchId]);

    const handleSubmit = async (assignId: string) => {
        if (!file && !link) {
            toast.error('Please provide a file or a link');
            return;
        }

        setUploadingId(assignId);
        try {
            const formData = new FormData();
            if (file) formData.append('assignment', file);
            if (link) formData.append('externalLink', link);

            await assignmentApi.submitAssignment(assignId, formData);
            toast.success('Assignment submitted successfully!');
            setFile(null);
            setLink('');
            fetchAssignments();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to submit assignment');
        } finally {
            setUploadingId(null);
        }
    };

    const handleDownload = async (subId: string) => {
        try {
            const response = await assignmentApi.downloadAssignment(subId);
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const a = document.createElement('a');
            a.href = url;
            a.setAttribute('download', 'my_submission.pdf');
            document.body.appendChild(a);
            a.click();
            a.parentNode?.removeChild(a);
        } catch (err) {
            toast.error('Download failed');
        }
    };

    if (loading) return <div>Loading assignments...</div>;

    return (
        <div className="space-y-4 mt-6">
            <h3 className="text-xl font-medium mb-4">Assignments</h3>
            {assignments.length === 0 ? <p className="text-muted-foreground text-sm">No assignments available.</p> : assignments.map(assign => (
                <Card key={assign._id}>
                    <CardContent className="p-6">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-4 mb-4">
                            <div>
                                <h4 className="font-medium text-lg flex items-center gap-2"><FileText className="w-5 h-5"/> {assign.title}</h4>
                                <div className="flex flex-wrap gap-2 mt-2">
                                    <Badge variant="outline">{assign.maxPoints} pts</Badge>
                                    <Badge variant={new Date(assign.dueDate) < new Date() ? 'destructive' : 'secondary'}>
                                        Due: {new Date(assign.dueDate).toLocaleDateString()} {new Date(assign.dueDate).toLocaleTimeString()}
                                    </Badge>
                                </div>
                            </div>
                            
                            <div className="text-right">
                                {assign.submission ? (
                                    assign.submission.status === 'graded' ? (
                                        <div className="flex flex-col items-end gap-1">
                                            <div className="flex items-center gap-2 text-green-600 font-medium">
                                                <CheckCircle2 className="w-5 h-5"/> Score: {assign.submission.gradedScore} / {assign.maxPoints}
                                            </div>
                                            {assign.submission.instructorFeedback && (
                                                <p className="text-xs text-muted-foreground mt-1">Feedback: {assign.submission.instructorFeedback}</p>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2 text-orange-500 font-medium">
                                            <AlertCircle className="w-5 h-5"/> Submitted (Pending Grade)
                                        </div>
                                    )
                                ) : (
                                    <Badge variant="outline" className="text-muted-foreground">Not Submitted</Badge>
                                )}
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <h5 className="text-sm font-medium mb-1">Instructions</h5>
                                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{assign.instructions}</p>
                            </div>

                            {/* Submission UI */}
                            {(!assign.submission || assign.submission.status !== 'graded') && 
                             (!(!assign.allowLateSubmissions && new Date() > new Date(assign.dueDate))) && (
                                <div className="bg-muted/30 p-4 rounded-lg border space-y-4">
                                    <h5 className="text-sm font-medium">{assign.submission ? 'Update Submission' : 'Submit Assignment'}</h5>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Upload PDF (Max 20MB)</Label>
                                            <div className="flex gap-2">
                                                <Input type="file" accept="application/pdf" onChange={e => setFile(e.target.files?.[0] || null)} />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Or External Link (GitHub, Drive, etc.)</Label>
                                            <div className="flex gap-2">
                                                <Input placeholder="https://..." value={link} onChange={e => setLink(e.target.value)} />
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <Button onClick={() => handleSubmit(assign._id)} disabled={uploadingId === assign._id || (!file && !link)} className="gap-2">
                                        {uploadingId === assign._id ? 'Uploading...' : <><Upload className="w-4 h-4"/> Submit</>}
                                    </Button>
                                </div>
                            )}
                            
                            {(!assign.submission && !assign.allowLateSubmissions && new Date() > new Date(assign.dueDate)) && (
                                <div className="bg-red-500/10 text-red-600 p-4 rounded-lg border border-red-500/20 text-sm font-medium flex items-center justify-center">
                                    <AlertCircle className="w-4 h-4 mr-2"/> Assignment is closed for submissions
                                </div>
                            )}

                            {assign.submission && (() => {
                                const submittedDate = new Date(assign.submission.createdAt);
                                const dueDate = new Date(assign.dueDate);
                                const isLate = submittedDate > dueDate;
                                let lateText = '';
                                if (isLate) {
                                    const lateDiffMs = submittedDate.getTime() - dueDate.getTime();
                                    const diffDays = Math.floor(lateDiffMs / (1000 * 60 * 60 * 24));
                                    const diffHours = Math.floor((lateDiffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                                    const diffMinutes = Math.floor((lateDiffMs % (1000 * 60 * 60)) / (1000 * 60));
                                    if (diffDays > 0) lateText = `${diffDays}d ${diffHours}h late`;
                                    else if (diffHours > 0) lateText = `${diffHours}h ${diffMinutes}m late`;
                                    else lateText = `${diffMinutes}m late`;
                                }
                                
                                return (
                                    <div className="mt-4 p-3 bg-secondary/20 rounded-md text-sm flex items-center gap-4">
                                        <span className="font-medium text-xs">Your Submission:</span>
                                        {assign.submission.submissionType === 'link' ? (
                                            <a href={assign.submission.externalLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline">
                                                <LinkIcon className="w-4 h-4"/> View Link
                                            </a>
                                        ) : (
                                            <Button variant="outline" size="sm" onClick={() => handleDownload(assign.submission._id)} className="h-8">
                                                <Download className="w-4 h-4 mr-2"/> Download PDF
                                            </Button>
                                        )}
                                        <div className="text-xs text-muted-foreground ml-auto flex flex-col items-end">
                                            <span>Submitted {submittedDate.toLocaleString()}</span>
                                            {isLate && <span className="text-red-500 font-medium">{lateText}</span>}
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
