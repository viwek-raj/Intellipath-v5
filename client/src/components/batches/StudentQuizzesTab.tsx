import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { quizApi } from '@/lib/api';
import { Target, CheckCircle2, AlertCircle } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export default function StudentQuizzesTab({ batchId }: { batchId: string }) {
    const [quizzes, setQuizzes] = useState<any[]>([]);
    const [activeQuiz, setActiveQuiz] = useState<any | null>(null);
    const [answers, setAnswers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    
    // Timer
    const [timeLeft, setTimeLeft] = useState<number | null>(null);

    const fetchQuizzes = async () => {
        try {
            setLoading(true);
            const { data } = await quizApi.getStudentQuizzes(batchId);
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

    useEffect(() => {
        let timer: any;
        if (activeQuiz && timeLeft !== null && timeLeft > 0) {
            timer = setInterval(() => {
                setTimeLeft(prev => prev! - 1);
            }, 1000);
        } else if (timeLeft === 0 && activeQuiz) {
            // Auto submit
            submitQuizAnswers();
        }
        return () => clearInterval(timer);
    }, [timeLeft, activeQuiz]);

    const handleStartQuiz = async (quiz: any) => {
        try {
            const { data } = await quizApi.startQuiz(quiz._id);
            const submission = data.submission || data;
            const serverTime = data.serverTime ? new Date(data.serverTime).getTime() : new Date().getTime();
            
            // If it's graded, we just want to view it, don't start the timer.
            if (submission.status === 'graded') {
                setActiveQuiz({ ...quiz, submission });
                setAnswers(submission.answers || new Array(quiz.questions.length).fill(null));
                setTimeLeft(null);
                return;
            }

            setActiveQuiz({ ...quiz, submission });
            setAnswers(submission.answers || new Array(quiz.questions.length).fill(null));
            
            // Calculate time left based on startedAt and serverTime
            const limit = submission.timeLimitOverride || quiz.timeLimitMinutes;
            const startedAt = new Date(submission.startedAt).getTime();
            const elapsedSeconds = Math.floor((serverTime - startedAt) / 1000);
            const totalSeconds = limit * 60;
            const remaining = Math.max(0, totalSeconds - elapsedSeconds);
            
            setTimeLeft(remaining);
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to start quiz');
        }
    };

    const submitQuizAnswers = async () => {
        if (!activeQuiz) return;
        setSubmitting(true);
        try {
            await quizApi.submitQuiz(activeQuiz._id, { answers });
            toast.success('Quiz submitted successfully!');
            setActiveQuiz(null);
            setTimeLeft(null);
            fetchQuizzes();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to submit quiz');
        } finally {
            setSubmitting(false);
        }
    };

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    if (loading) return <div>Loading quizzes...</div>;

    if (activeQuiz) {
        const isGraded = activeQuiz.submission?.status === 'graded';

        return (
            <div className="space-y-6">
                <div className="flex justify-between items-center bg-muted p-4 rounded-lg sticky top-4 z-10 shadow-sm border border-border">
                    <h3 className="font-medium text-lg">{activeQuiz.title} {isGraded && '(Results)'}</h3>
                    <div className="flex items-center gap-4">
                        {!isGraded && (
                            <div className={`font-mono text-xl ${timeLeft && timeLeft < 60 ? 'text-red-500 animate-pulse' : 'text-primary'}`}>
                                {timeLeft !== null ? formatTime(timeLeft) : '--:--'}
                            </div>
                        )}
                        {isGraded ? (
                            <Button variant="outline" onClick={() => setActiveQuiz(null)}>Back to Quizzes</Button>
                        ) : (
                            <Button onClick={submitQuizAnswers} disabled={submitting}>
                                {submitting ? 'Submitting...' : 'Submit Quiz'}
                            </Button>
                        )}
                    </div>
                </div>

                <div className="space-y-6 mt-4">
                    {activeQuiz.questions.map((q: any, i: number) => {
                        const isCorrect = isGraded && activeQuiz.quizType === 'mcq' && q.correctOptionIndex === parseInt(answers[i]);
                        const isWrong = isGraded && activeQuiz.quizType === 'mcq' && q.correctOptionIndex !== parseInt(answers[i]);

                        return (
                            <Card key={i} className={isGraded && activeQuiz.quizType === 'mcq' ? (isCorrect ? 'border-green-500 bg-green-500/5' : 'border-red-500 bg-red-500/5') : ''}>
                                <CardContent className="p-6 space-y-4">
                                    <h4 className="font-medium text-lg border-b pb-2 flex justify-between">
                                        <span>Q{i + 1}: {q.questionText}</span>
                                        {isGraded && activeQuiz.quizType === 'mcq' && (
                                            <span className={isCorrect ? 'text-green-600' : 'text-red-600'}>
                                                {isCorrect ? 'Correct' : 'Incorrect'}
                                            </span>
                                        )}
                                    </h4>
                                    {activeQuiz.quizType === 'mcq' ? (
                                        <RadioGroup 
                                            value={answers[i]?.toString() || ""} 
                                            onValueChange={v => {
                                                if (isGraded) return;
                                                const newA = [...answers];
                                                newA[i] = parseInt(v);
                                                setAnswers(newA);
                                            }}
                                            className="space-y-2"
                                            disabled={isGraded}
                                        >
                                            {q.options.map((opt: string, oIndex: number) => {
                                                const isSelected = answers[i]?.toString() === oIndex.toString();
                                                const isActualCorrect = isGraded && q.correctOptionIndex === oIndex;

                                                let itemClass = "flex items-center space-x-2 p-2 rounded";
                                                if (isGraded) {
                                                    if (isActualCorrect) itemClass += " bg-green-100 dark:bg-green-900/30 font-medium";
                                                    else if (isSelected && !isActualCorrect) itemClass += " bg-red-100 dark:bg-red-900/30";
                                                }

                                                return (
                                                    <div key={oIndex} className={itemClass}>
                                                        <RadioGroupItem 
                                                            value={oIndex.toString()} 
                                                            id={`q${i}-o${oIndex}`} 
                                                            checked={isSelected}
                                                            disabled={isGraded}
                                                            onClick={() => {
                                                                if (isGraded) return;
                                                                const newA = [...answers];
                                                                newA[i] = oIndex;
                                                                setAnswers(newA);
                                                            }}
                                                        />
                                                        <Label htmlFor={`q${i}-o${oIndex}`}>{opt}</Label>
                                                        {isGraded && isActualCorrect && <CheckCircle2 className="w-4 h-4 text-green-600 ml-auto" />}
                                                    </div>
                                                )
                                            })}
                                        </RadioGroup>
                                    ) : (
                                        <div className="space-y-2">
                                            <Textarea rows={4} placeholder="Type your answer here..." value={answers[i] || ''} readOnly={isGraded} onChange={e => {
                                                if (isGraded) return;
                                                const newA = [...answers];
                                                newA[i] = e.target.value;
                                                setAnswers(newA);
                                            }} />
                                            {isGraded && (
                                                <div className="mt-4 p-3 bg-muted rounded border text-sm">
                                                    <strong>Instructor Score:</strong> {activeQuiz.submission.score} / {q.maxPoints || 1}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <h3 className="text-xl font-medium mb-4">Quizzes</h3>
            {quizzes.length === 0 ? <p className="text-muted-foreground text-sm">No quizzes available.</p> : quizzes.map(quiz => (
                <Card key={quiz._id}>
                    <CardContent className="p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <h4 className="font-medium text-lg">{quiz.title}</h4>
                            <p className="text-sm text-muted-foreground mt-1">{quiz.description}</p>
                            <div className="flex flex-wrap gap-2 mt-2">
                                <Badge variant="outline">{quiz.quizType.toUpperCase()}</Badge>
                                <Badge variant="secondary">{quiz.timeLimitMinutes} mins</Badge>
                                <Badge variant="outline">{quiz.questions.length} Questions</Badge>
                            </div>
                        </div>
                        
                        <div className="flex flex-col items-end gap-2">
                            {quiz.submission ? (
                                <div className="text-right">
                                    {quiz.submission.status === 'graded' ? (
                                        <div className="flex flex-col items-end gap-2">
                                            <div className="flex items-center gap-2 text-green-600 font-medium">
                                                <CheckCircle2 className="w-5 h-5"/> Score: {quiz.submission.score}
                                            </div>
                                            <Button variant="outline" size="sm" onClick={() => handleStartQuiz(quiz)}>View Results</Button>
                                        </div>
                                    ) : quiz.submission.status === 'pending' ? (
                                        <div className="flex flex-col items-end gap-2">
                                            <div className="flex items-center gap-2 text-orange-500 font-medium">
                                                <AlertCircle className="w-5 h-5"/> In Progress
                                            </div>
                                            <Button size="sm" onClick={() => handleStartQuiz(quiz)}>Resume Quiz</Button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2 text-orange-500 font-medium">
                                            <AlertCircle className="w-5 h-5"/> Submitted (Pending Grade)
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <Button onClick={() => handleStartQuiz(quiz)} className="gap-2">
                                    <Target className="w-4 h-4" /> Start Quiz
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
