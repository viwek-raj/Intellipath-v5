import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { assignmentApi } from '@/lib/api';
import { Plus, Check, FileText, ExternalLink, Users } from 'lucide-react';

export default function InstructorAssignmentsTab({ batchId }: { batchId: string }) {
    const [assignments, setAssignments] = useState<any[]>([]);
    const [submissions, setSubmissions] = useState<any[]>([]);
    const [activeAssignmentId, setActiveAssignmentId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);

    // Form
    const [title, setTitle] = useState('');
    const [instructions, setInstructions] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [allowLateSubmissions, setAllowLateSubmissions] = useState(false);
    const [maxPoints, setMaxPoints] = useState('100');

    const fetchAssignments = async () => {
        try {
            setLoading(true);
            const { data } = await assignmentApi.getInstructorAssignments(batchId);
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

    const handleCreateAssignment = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await assignmentApi.createAssignment({
                batchId,
                title,
                instructions,
                dueDate: new Date(dueDate),
                allowLateSubmissions,
                maxPoints: parseInt(maxPoints)
            });
            toast.success('Assignment created');
            setShowCreate(false);
            fetchAssignments();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to create assignment');
        }
    };

    const viewSubmissions = async (assignId: string) => {
        try {
            const { data } = await assignmentApi.getAssignmentSubmissions(assignId);
            setSubmissions(data);
            setActiveAssignmentId(assignId);
        } catch (err) {
            toast.error('Failed to fetch submissions');
        }
    };

    const gradeAssignment = async (subId: string, score: number, feedback: string) => {
        try {
            await assignmentApi.evaluateAssignment(activeAssignmentId!, subId, { score, feedback });
            toast.success('Graded successfully');
            viewSubmissions(activeAssignmentId!);
        } catch (err) {
            toast.error('Failed to grade');
        }
    };

    const handleDownload = async (subId: string) => {
        try {
            const response = await assignmentApi.downloadAssignment(subId);
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'submission.pdf');
            document.body.appendChild(link);
            link.click();
            link.parentNode?.removeChild(link);
        } catch (err) {
            toast.error('Download failed');
        }
    };

    if (loading) return <div>Loading assignments...</div>;

    return (
        <div className="space-y-6 mt-6">
            {!showCreate ? (
                <div className="flex justify-between items-center">
                    <h3 className="text-xl font-medium">Assignments</h3>
                    <Button onClick={() => setShowCreate(true)}><Plus className="w-4 h-4 mr-2"/> Create Assignment</Button>
                </div>
            ) : (
                <Card>
                    <CardHeader>
                        <CardTitle>Create New Assignment</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleCreateAssignment} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Title</Label>
                                    <Input required value={title} onChange={e => setTitle(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Max Points</Label>
                                    <Input type="number" required value={maxPoints} onChange={e => setMaxPoints(e.target.value)} />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Instructions</Label>
                                <Textarea required value={instructions} onChange={e => setInstructions(e.target.value)} rows={4} />
                            </div>
                            <div className="space-y-2">
                                <Label>Due Date</Label>
                                <Input type="datetime-local" required value={dueDate} onChange={e => setDueDate(e.target.value)} />
                            </div>
                            <div className="flex items-center space-x-2">
                                <input type="checkbox" id="allowLate" checked={allowLateSubmissions} onChange={e => setAllowLateSubmissions(e.target.checked)} className="rounded border-gray-300" />
                                <Label htmlFor="allowLate">Allow Late Submissions</Label>
                            </div>
                            
                            <div className="flex gap-2 justify-end">
                                <Button type="button" variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
                                <Button type="submit">Publish Assignment</Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            )}

            {!showCreate && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-4">
                        {assignments.length === 0 ? <p className="text-muted-foreground text-sm">No assignments created yet.</p> : assignments.map(assign => (
                            <Card key={assign._id} className={`cursor-pointer transition-colors ${activeAssignmentId === assign._id ? 'border-primary shadow-sm' : 'hover:border-primary/50'}`} onClick={() => viewSubmissions(assign._id)}>
                                <CardContent className="p-4 flex justify-between items-center">
                                    <div>
                                        <h4 className="font-medium">{assign.title}</h4>
                                        <div className="flex items-center gap-2 mt-1">
                                            <Badge variant="outline">{assign.maxPoints} pts</Badge>
                                            <span className="text-xs text-muted-foreground">Due: {new Date(assign.dueDate).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                    <FileText className="text-muted-foreground w-4 h-4" />
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    <div className="border rounded-lg p-4 bg-muted/10 h-[500px] overflow-y-auto">
                        {activeAssignmentId ? (
                            <div>
                                <h4 className="font-medium mb-4 flex items-center gap-2"><Users className="w-4 h-4"/> Submissions</h4>
                                {submissions.length === 0 ? <p className="text-sm text-muted-foreground">No submissions yet.</p> : (
                                    <div className="space-y-3">
                                        {submissions.map(sub => (
                                            <Card key={sub._id} className="p-3">
                                                <div className="flex justify-between items-start mb-2">
                                                    <div>
                                                        <p className="font-medium text-sm">{sub.student?.name}</p>
                                                        <p className="text-xs text-muted-foreground">{sub.student?.email}</p>
                                                    </div>
                                                    <Badge variant={sub.status === 'graded' ? 'default' : 'secondary'}>{sub.status}</Badge>
                                                </div>
                                                
                                                <div className="my-3 p-2 bg-muted rounded-md text-sm flex justify-between items-center">
                                                    {sub.submissionType === 'link' ? (
                                                        <a href={sub.externalLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline">
                                                            <ExternalLink className="w-4 h-4"/> View Link
                                                        </a>
                                                    ) : (
                                                        <Button variant="link" size="sm" className="h-auto p-0" onClick={() => handleDownload(sub._id)}>
                                                            <FileText className="w-4 h-4 mr-1"/> Download PDF
                                                        </Button>
                                                    )}
                                                    <span className="text-xs text-muted-foreground flex flex-col items-end">
                                                        <span>{new Date(sub.createdAt).toLocaleString()}</span>
                                                        {assignments.find(a=>a._id===activeAssignmentId) && new Date(sub.createdAt) > new Date(assignments.find(a=>a._id===activeAssignmentId)!.dueDate) && (
                                                            <span className="text-red-500 font-medium">Late Submission</span>
                                                        )}
                                                    </span>
                                                </div>

                                                {sub.status === 'graded' ? (
                                                    <div className="space-y-1 mt-2">
                                                        <div className="flex items-center gap-2 text-green-600 text-sm font-medium">
                                                            <Check className="w-4 h-4"/> Score: {sub.gradedScore}
                                                        </div>
                                                        {sub.instructorFeedback && <p className="text-xs text-muted-foreground">Feedback: {sub.instructorFeedback}</p>}
                                                    </div>
                                                ) : (
                                                    <div className="mt-2 space-y-2">
                                                        <div className="grid grid-cols-2 gap-2">
                                                            <Input type="number" placeholder="Score" id={`score-${sub._id}`} className="h-8" />
                                                            <Input type="text" placeholder="Feedback (Optional)" id={`fb-${sub._id}`} className="h-8" />
                                                        </div>
                                                        <Button size="sm" className="w-full" onClick={() => {
                                                            const s = parseInt((document.getElementById(`score-${sub._id}`) as HTMLInputElement).value);
                                                            const f = (document.getElementById(`fb-${sub._id}`) as HTMLInputElement).value;
                                                            if(!isNaN(s)) gradeAssignment(sub._id, s, f);
                                                        }}>Grade Assignment</Button>
                                                    </div>
                                                )}
                                            </Card>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                                Select an assignment to view submissions
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
