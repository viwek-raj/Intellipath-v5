'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, CheckCircle, ChevronRight, ChevronLeft, Book, Brain } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import Link from 'next/link';
import { motion } from 'framer-motion';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css';

interface Module {
    _id: string;
    title: string;
    description: string;
    content: string;
    completed: boolean;
}

export default function ModulePage({ params }: { params: Promise<{ id: string; moduleId: string }> }) {
    const resolvedParams = use(params);
    const router = useRouter();
    const [module, setModule] = useState<Module | null>(null);
    const [loading, setLoading] = useState(true);
    const [course, setCourse] = useState<any>(null);
    const [showQuiz, setShowQuiz] = useState(false);
    const [quizData, setQuizData] = useState<any[]>([]);
    const [userAnswers, setUserAnswers] = useState<number[]>([]);
    const [quizResult, setQuizResult] = useState<any>(null);
    const [quizLoading, setQuizLoading] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch module content (triggers AI generation if needed)
                const moduleRes = await api.get(`/courses/${resolvedParams.id}/modules/${resolvedParams.moduleId}`);
                setModule(moduleRes.data);

                // Fetch full course to know the order of modules
                const courseRes = await api.get(`/courses/${resolvedParams.id}`);
                setCourse(courseRes.data);
            } catch (error) {
                console.error('Failed to fetch data', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [resolvedParams.id, resolvedParams.moduleId]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[80vh] space-y-6">
                <div className="relative">
                    <div className="absolute inset-0 bg-primary/20 blur-xl opacity-20 rounded-full animate-pulse"></div>
                    <Loader2 className="h-12 w-12 animate-spin text-primary relative z-10" />
                </div>
                <div className="text-center space-y-2">
                    <h3 className="text-xl font-semibold text-foreground">Creating your lesson...</h3>
                    <p className="text-muted-foreground max-w-md">
                        Our AI is crafting a personalized explanation just for you. This usually takes a few seconds.
                    </p>
                </div>
            </div>
        );
    }

    if (!module || !course) {
        return <div className="p-8 text-center text-destructive">Lesson not found</div>;
    }

    // Find current module index and next module
    const currentModuleIndex = course.modules.findIndex((m: any) => m._id === module._id);
    const nextModule = course.modules[currentModuleIndex + 1];

    const handleTakeQuiz = async () => {
        setQuizLoading(true);
        try {
            const { data } = await api.get(`/courses/${resolvedParams.id}/modules/${resolvedParams.moduleId}/quiz`);
            setQuizData(data);
            setUserAnswers(new Array(data.length).fill(-1));
            setShowQuiz(true);
            setQuizResult(null);
        } catch (error) {
            console.error('Failed to fetch quiz', error);
        } finally {
            setQuizLoading(false);
        }
    };

    const handleOptionSelect = (questionIndex: number, optionIndex: number) => {
        const newAnswers = [...userAnswers];
        newAnswers[questionIndex] = optionIndex;
        setUserAnswers(newAnswers);
    };

    const handleSubmitQuiz = async () => {
        if (userAnswers.includes(-1)) {
            alert("Please answer all questions");
            return;
        }

        setQuizLoading(true);
        try {
            const { data } = await api.post(`/courses/${resolvedParams.id}/modules/${resolvedParams.moduleId}/quiz`, {
                answers: userAnswers
            });
            setQuizResult(data);
            if (data.passed) {
                setModule({ ...module!, completed: true });
                // Don't close immediately, let them see the success message
            }
        } catch (error) {
            console.error('Failed to submit quiz', error);
        } finally {
            setQuizLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50/50 dark:bg-gray-900/50 pb-20 relative">
             {/* Quiz Modal */}
             {showQuiz && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl relative">
                        <CardContent className="p-8">
                             <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-bold">Concept Check</h2>
                                {!quizResult && (
                                    <Button variant="ghost" size="sm" onClick={() => setShowQuiz(false)}>Cancel</Button>
                                )}
                            </div>

                            {!quizResult ? (
                                <div className="space-y-8">
                                    {quizData.map((q, qIndex) => (
                                        <div key={qIndex} className="space-y-4">
                                            <h3 className="text-lg font-medium">{qIndex + 1}. {q.question}</h3>
                                            <div className="grid gap-3">
                                                {q.options.map((option: string, oIndex: number) => (
                                                    <div 
                                                        key={oIndex}
                                                        onClick={() => handleOptionSelect(qIndex, oIndex)}
                                                        className={`p-4 rounded-lg border cursor-pointer transition-all ${
                                                            userAnswers[qIndex] === oIndex 
                                                                ? 'bg-primary/10 border-primary ring-1 ring-primary' 
                                                                : 'hover:bg-muted'
                                                        }`}
                                                    >
                                                        {option}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                    <div className="pt-4 flex justify-end">
                                        <Button onClick={handleSubmitQuiz} disabled={quizLoading} size="lg" className="w-full sm:w-auto">
                                            {quizLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit Answers"}
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center space-y-6 py-8">
                                    <div className={`mx-auto w-20 h-20 rounded-full flex items-center justify-center ${quizResult.passed ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                        {quizResult.passed ? <CheckCircle className="w-10 h-10" /> : <div className="text-3xl font-bold">!</div>}
                                    </div>
                                    
                                    <div className="space-y-2">
                                        <h3 className="text-2xl font-bold">{quizResult.message}</h3>
                                        <p className="text-muted-foreground text-lg">
                                            You scored <span className="font-bold text-foreground">{quizResult.score.toFixed(0)}%</span> 
                                            ({quizResult.correctCount}/{quizResult.totalQuestions} correct)
                                        </p>
                                    </div>

                                    <div className="pt-6 flex justify-center gap-4">
                                        {quizResult.passed ? (
                                            <>
                                                <Button onClick={() => setShowQuiz(false)} variant="outline">Review Lesson</Button>
                                                {nextModule && (
                                                    <Link href={`/courses/${resolvedParams.id}/modules/${nextModule._id}`}>
                                                        <Button className="w-full sm:w-auto shadow-lg">
                                                            Next Lesson <ChevronRight className="ml-2 h-4 w-4" />
                                                        </Button>
                                                    </Link>
                                                )}
                                            </>
                                        ) : (
                                            <Button onClick={() => {
                                                setQuizResult(null);
                                                setUserAnswers(new Array(quizData.length).fill(-1));
                                            }}>
                                                Try Again
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Top Navigation Bar */}
            <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b">
                <div className="container mx-auto max-w-4xl px-6 h-16 flex items-center justify-between">
                    <Link href={`/courses/${resolvedParams.id}`} className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Course
                    </Link>
                    <span className="text-sm font-semibold truncate max-w-[200px] md:max-w-none hidden sm:block">
                        {module.title}
                    </span>
                    <div className="flex items-center gap-2">
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 md:px-6 py-8 max-w-4xl space-y-8">
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4 text-center md:text-left"
                >
                    <div className="inline-flex items-center justify-center p-3 bg-primary/10 text-primary rounded-2xl mb-4">
                        <Book className="h-8 w-8" />
                    </div>
                    <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-foreground leading-tight">
                        {module.title}
                    </h1>
                    <p className="text-xl text-muted-foreground leading-relaxed max-w-3xl">
                        {module.description}
                    </p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <Card className="border-none shadow-none bg-transparent">
                        <CardContent className="p-0">
                            <article className="prose prose-lg dark:prose-invert prose-headings:text-foreground prose-p:text-foreground/80 prose-p:leading-8 prose-li:text-foreground/80 prose-strong:text-foreground prose-code:text-indigo-600 dark:prose-code:text-indigo-400 prose-pre:bg-muted prose-pre:border max-w-3xl mx-auto">
                                <ReactMarkdown 
                                    remarkPlugins={[remarkGfm]}
                                    rehypePlugins={[rehypeHighlight]}
                                    components={{
                                        h1: ({node, ...props}) => <h1 className="text-3xl font-bold mt-8 mb-4" {...props} />,
                                        h2: ({node, ...props}) => <h2 className="text-2xl font-bold mt-8 mb-4 border-b pb-2" {...props} />,
                                        h3: ({node, ...props}) => <h3 className="text-xl font-semibold mt-6 mb-3" {...props} />,
                                        p: ({node, ...props}) => <p className="leading-relaxed mb-6" {...props} />,
                                        ul: ({node, ...props}) => <ul className="list-disc pl-6 space-y-2 mb-6" {...props} />,
                                        ol: ({node, ...props}) => <ol className="list-decimal pl-6 space-y-2 mb-6" {...props} />,
                                        pre: ({ node, ...props }) => (
                                            <div className="relative group">
                                                <pre {...props} className="overflow-auto p-6 rounded-xl bg-muted text-sm font-mono my-6 border border-border/50" />
                                            </div>
                                        ),
                                        code: ({ node, ...props }) => {
                                            const match = /language-(\w+)/.exec(props.className || '');
                                            return match ? (
                                                <code {...props} className={props.className} />
                                            ) : (
                                                <code {...props} className="bg-primary/10 px-1.5 py-0.5 rounded text-sm font-mono text-primary font-medium" />
                                            );
                                        },
                                        a: ({ node, ...props }) => (
                                            <a {...props} className="text-primary hover:underline underline-offset-4 font-medium" target="_blank" rel="noopener noreferrer" />
                                        )
                                    }}
                                >
                                    {module.content}
                                </ReactMarkdown>
                            </article>
                        </CardContent>
                    </Card>
                </motion.div>

                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-12 border-t mt-12 max-w-3xl mx-auto">
                    <Button variant="outline" onClick={() => window.history.back()} className="w-full sm:w-auto h-12">
                        <ChevronLeft className="mr-2 h-4 w-4" /> Previous
                    </Button>
                    
                    <div className="flex gap-4 w-full sm:w-auto">
                         {!module.completed ? (
                            <Button 
                                className="flex-1 sm:flex-none h-12 px-8 shadow-md transition-all bg-primary hover:bg-primary/90 text-primary-foreground"
                                onClick={handleTakeQuiz}
                            >
                                {quizLoading ? <Loader2 className="animate-spin w-4 h-4 ml-2" /> : "Take Quiz to Complete"} 
                                {!quizLoading && <Brain className="ml-2 h-4 w-4" />}
                            </Button>
                         ) : (
                            <Button 
                                className="flex-1 sm:flex-none h-12 px-8 shadow-md transition-all bg-green-600 hover:bg-green-700 text-white cursor-default"
                                variant="default"
                            >
                                Lesson Completed <CheckCircle className="ml-2 h-4 w-4" />
                            </Button>
                         )}

                        {module.completed && nextModule && (
                             <Link href={`/courses/${resolvedParams.id}/modules/${nextModule._id}`}>
                                <Button className="w-full sm:w-auto h-12 px-8 shadow-lg hover:shadow-xl transition-all" size="lg">
                                    Next Lesson <ChevronRight className="ml-2 h-4 w-4" />
                                </Button>
                            </Link>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
