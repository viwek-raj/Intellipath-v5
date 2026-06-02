import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { quizApi } from '@/lib/api';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Target, Check, RefreshCw } from 'lucide-react';

export default function InstructorQuizzesTab({ batchId }: { batchId: string }) {
    const [quizzes, setQuizzes] = useState<any[]>([]);
    const [submissions, setSubmissions] = useState<any[]>([]);
    const [activeQuizId, setActiveQuizId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);

    // Form
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [quizType, setQuizType] = useState('mcq');
    const [timeLimit, setTimeLimit] = useState('30');
    const [questions, setQuestions] = useState<any[]>([{ questionText: '', options: ['', ''], correctOptionIndex: 0, maxPoints: 1 }]);

    const fetchQuizzes = async () => {
        try {
            setLoading(true);
            const { data } = await quizApi.getInstructorQuizzes(batchId);
            setQuizzes(data);
        } catch (err) {
            toast.error('Failed to fetch quizzes');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchQuizzes();
    }, [batchId]);

    const handleCreateQuiz = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await quizApi.createQuiz({
                batchId,
                title,
                description,
                quizType,
                timeLimitMinutes: parseInt(timeLimit),
                availableFrom: new Date(),
                availableUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week
                questions
            });
            toast.success('Quiz created');
            setShowCreate(false);
            fetchQuizzes();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to create quiz');
        }
    };

    const addQuestion = () => {
        setQuestions([...questions, { questionText: '', options: ['', ''], correctOptionIndex: 0, maxPoints: 1 }]);
    };

    const updateQuestion = (index: number, field: string, value: any) => {
        const newQ = [...questions];
        newQ[index][field] = value;
        setQuestions(newQ);
    };

    const updateOption = (qIndex: number, optIndex: number, value: string) => {
        const newQ = [...questions];
        newQ[qIndex].options[optIndex] = value;
        setQuestions(newQ);
    };

    const addOption = (qIndex: number) => {
        const newQ = [...questions];
        newQ[qIndex].options.push('');
        setQuestions(newQ);
    };

    const viewSubmissions = async (quizId: string) => {
        try {
            const { data } = await quizApi.getQuizSubmissions(quizId);
            setSubmissions(data);
            setActiveQuizId(quizId);
        } catch (err) {
            toast.error('Failed to fetch submissions');
        }
    };

    const gradeSubjective = async (subId: string, score: number) => {
        try {
            await quizApi.evaluateSubmission(activeQuizId!, subId, { score });
            toast.success('Graded successfully');
            viewSubmissions(activeQuizId!);
        } catch (err) {
            toast.error('Failed to grade');
        }
    };

    const handleReopen = async (subId: string) => {
        if (!confirm('Are you sure you want to reopen this quiz? This will reset the student\'s score and answers, allowing them to attempt it again.')) return;
        
        const quiz = quizzes.find(q => q._id === activeQuizId);
        const limitStr = prompt('Enter the new time limit in minutes for this student:', quiz?.timeLimitMinutes?.toString());
        if (limitStr === null) return; // cancelled
        
        const timeLimitOverride = parseInt(limitStr);
        if (isNaN(timeLimitOverride) || timeLimitOverride <= 0) {
            toast.error('Invalid time limit');
            return;
        }

        try {
            await quizApi.reopenSubmission(activeQuizId!, subId, { timeLimitOverride });
            toast.success('Quiz reopened successfully');
            viewSubmissions(activeQuizId!);
        } catch (err) {
            toast.error('Failed to reopen quiz');
        }
    };

    if (loading) return <div>Loading quizzes...</div>;

    return (
        <div className="space-y-6 mt-6">
            {!showCreate ? (
                <div className="flex justify-between items-center">
                    <h3 className="text-xl font-medium">Quizzes</h3>
                    <Button onClick={() => setShowCreate(true)}><Plus className="w-4 h-4 mr-2"/> Create Quiz</Button>
                </div>
            ) : (
                <Card>
                    <CardHeader>
                        <CardTitle>Create New Quiz</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleCreateQuiz} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Title</Label>
                                    <Input required value={title} onChange={e => setTitle(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Quiz Type</Label>
                                    <Select value={quizType} onValueChange={setQuizType}>
                                        <SelectTrigger><SelectValue/></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="mcq">Multiple Choice</SelectItem>
                                            <SelectItem value="subjective">Subjective</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Description</Label>
                                <Textarea value={description} onChange={e => setDescription(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>Time Limit (minutes)</Label>
                                <Input type="number" required value={timeLimit} onChange={e => setTimeLimit(e.target.value)} />
                            </div>

                            <div className="mt-6">
                                <h4 className="font-medium mb-4">Questions (Auto 1 point each)</h4>
                                {questions.map((q, qIndex) => (
                                    <Card key={qIndex} className="p-4 mb-4 bg-muted/20">
                                        <div className="space-y-4">
                                            <div>
                                                <Label>Question {qIndex + 1}</Label>
                                                <Input required value={q.questionText} onChange={e => updateQuestion(qIndex, 'questionText', e.target.value)} />
                                            </div>
                                            {quizType === 'mcq' && (
                                                <div className="space-y-2 pl-4 border-l-2">
                                                    <Label>Options</Label>
                                                    {q.options.map((opt: string, oIndex: number) => (
                                                        <div key={oIndex} className="flex items-center gap-2">
                                                            <input type="radio" name={`correct-${qIndex}`} checked={q.correctOptionIndex === oIndex} onChange={() => updateQuestion(qIndex, 'correctOptionIndex', oIndex)} />
                                                            <Input value={opt} onChange={e => updateOption(qIndex, oIndex, e.target.value)} placeholder={`Option ${oIndex + 1}`} />
                                                        </div>
                                                    ))}
                                                    <Button type="button" variant="ghost" size="sm" onClick={() => addOption(qIndex)}>+ Add Option</Button>
                                                </div>
                                            )}
                                        </div>
                                    </Card>
                                ))}
                                <Button type="button" variant="outline" onClick={addQuestion}>+ Add Question</Button>
                            </div>
                            <div className="flex gap-2 justify-end">
                                <Button type="button" variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
                                <Button type="submit">Publish Quiz</Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            )}

            {!showCreate && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-4">
                        {quizzes.length === 0 ? <p className="text-muted-foreground text-sm">No quizzes created yet.</p> : quizzes.map(quiz => (
                            <Card key={quiz._id} className={`cursor-pointer transition-colors ${activeQuizId === quiz._id ? 'border-primary shadow-sm' : 'hover:border-primary/50'}`} onClick={() => viewSubmissions(quiz._id)}>
                                <CardContent className="p-4 flex justify-between items-center">
                                    <div>
                                        <h4 className="font-medium">{quiz.title}</h4>
                                        <div className="flex items-center gap-2 mt-1">
                                            <Badge variant="outline">{quiz.quizType.toUpperCase()}</Badge>
                                            <span className="text-xs text-muted-foreground">{quiz.timeLimitMinutes} mins</span>
                                        </div>
                                    </div>
                                    <Target className="text-muted-foreground w-4 h-4" />
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    <div className="border rounded-lg p-4 bg-muted/10 h-[500px] overflow-y-auto">
                        {activeQuizId ? (
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
                                                    <div className="flex flex-col items-end gap-2">
                                                        <Badge variant={sub.status === 'graded' ? 'default' : 'secondary'}>{sub.status}</Badge>
                                                        <Button variant="outline" size="sm" onClick={() => handleReopen(sub._id)} className="h-6 text-xs px-2">Reopen</Button>
                                                    </div>
                                                </div>
                                                {sub.status === 'graded' ? (
                                                    <div className="flex items-center gap-2 text-green-600 text-sm mt-2 font-medium">
                                                        <Check className="w-4 h-4"/> Score: {sub.score}
                                                    </div>
                                                ) : quizzes.find(q=>q._id===activeQuizId)?.quizType === 'mcq' && (
                                                    <Button size="sm" onClick={() => gradeSubjective(sub._id, 0)} className="w-full mt-2">Auto Evaluate</Button>
                                                )}
                                                
                                                <div className="mt-4 space-y-3">
                                                    <p className="text-xs font-medium border-b pb-1">Answers submitted:</p>
                                                    {sub.answers.map((ans: string, i: number) => {
                                                        const quiz = quizzes.find(q=>q._id===activeQuizId);
                                                        const q = quiz?.questions[i];
                                                        if (!q) return null;
                                                        
                                                        const isMcq = quiz.quizType === 'mcq';
                                                        const studentAnsText = isMcq && ans !== null && ans !== '' ? q.options[parseInt(ans)] : (ans || 'No answer provided');
                                                        const correctAnsText = isMcq ? q.options[q.correctOptionIndex] : null;

                                                        return (
                                                            <div key={i} className="text-xs bg-muted p-2 rounded space-y-1">
                                                                <p className="font-medium text-foreground">Q{i+1}: {q.questionText}</p>
                                                                <p className="text-muted-foreground"><span className="font-medium text-foreground">Student:</span> {studentAnsText}</p>
                                                                {isMcq && <p className="text-muted-foreground"><span className="font-medium text-foreground">Correct:</span> {correctAnsText}</p>}
                                                            </div>
                                                        );
                                                    })}
                                                    {sub.status !== 'graded' && quizzes.find(q=>q._id===activeQuizId)?.quizType !== 'mcq' && (
                                                        <div className="flex gap-2 items-center mt-2">
                                                            <Input type="number" placeholder="Score" id={`score-${sub._id}`} className="h-8" />
                                                            <Button size="sm" onClick={() => {
                                                                const s = parseInt((document.getElementById(`score-${sub._id}`) as HTMLInputElement).value);
                                                                if(!isNaN(s)) gradeSubjective(sub._id, s);
                                                            }}>Grade</Button>
                                                        </div>
                                                    )}
                                                </div>
                                            </Card>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                                Select a quiz to view submissions
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

function Users(props: any) {
    return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
}
