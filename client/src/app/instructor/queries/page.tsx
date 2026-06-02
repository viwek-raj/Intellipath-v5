"use client";

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/context/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { MessageCircleQuestion, Send, Video, CheckCircle, Search, User } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function InstructorQueriesPage() {
    const { user } = useAuth();
    const [queries, setQueries] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedQuery, setSelectedQuery] = useState<any | null>(null);
    const [replyText, setReplyText] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [isMeetDialogOpen, setIsMeetDialogOpen] = useState(false);

    const fetchQueries = async () => {
        try {
            const { data } = await api.get('/queries');
            setQueries(data);
        } catch (error) {
            console.error('Failed to fetch queries', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchQueries();
    }, []);

    const handleReply = async () => {
        if (!replyText.trim() || !selectedQuery) return;
        try {
            const { data } = await api.post(`/queries/${selectedQuery._id}/reply`, {
                text: replyText
            });
            setSelectedQuery(data);
            setQueries(queries.map(q => q._id === data._id ? data : q));
            setReplyText('');
        } catch (error) {
            toast.error("Failed to send reply");
        }
    };

    const handleScheduleMeet = async () => {
        if (!selectedQuery) return;
        try {
            // Generate a random unique jitsi link
            const meetUrl = `https://meet.jit.si/IntellipathQuery-${selectedQuery._id}-${Math.random().toString(36).substring(7)}`;
            const { data } = await api.put(`/queries/${selectedQuery._id}/meet`, {
                liveMeetUrl: meetUrl
            });
            setSelectedQuery(data);
            setQueries(queries.map(q => q._id === data._id ? data : q));
            setIsMeetDialogOpen(false);
            toast.success("Live meet scheduled successfully!");
        } catch (error) {
            toast.error("Failed to schedule meet");
        }
    };

    const handleResolve = async () => {
        if (!selectedQuery) return;
        try {
            const { data } = await api.put(`/queries/${selectedQuery._id}/resolve`);
            setSelectedQuery(data);
            setQueries(queries.map(q => q._id === data._id ? data : q));
            if (data.status === 'resolved') {
                toast.success("Query resolved completely!");
            } else {
                toast.success("You marked this as resolved. Waiting for student.");
            }
        } catch (error) {
            toast.error("Failed to resolve query");
        }
    };

    const filteredQueries = queries.filter(q => 
        q.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        q.student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.batch.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) return <div className="p-8 text-center animate-pulse flex items-center justify-center min-h-[50vh]">Loading student queries...</div>;

    return (
        <div className="container mx-auto px-4 py-8 max-w-7xl h-[calc(100vh-4rem)] flex flex-col">
            <div className="flex justify-between items-center mb-6 shrink-0">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Student Queries</h1>
                    <p className="text-muted-foreground mt-1">Manage and respond to doubts from your students across all batches.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1 min-h-0">
                {/* Left Panel - Query List */}
                <div className="md:col-span-1 bg-card border rounded-2xl flex flex-col overflow-hidden shadow-sm">
                    <div className="p-4 border-b bg-muted/20 shrink-0">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input 
                                placeholder="Search queries..." 
                                className="pl-9 bg-white"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="overflow-y-auto flex-1 p-2 space-y-2">
                        {filteredQueries.length === 0 ? (
                            <div className="text-center py-10 text-muted-foreground">No queries found.</div>
                        ) : (
                            filteredQueries.map(q => (
                                <div 
                                    key={q._id} 
                                    onClick={() => setSelectedQuery(q)}
                                    className={`p-4 rounded-xl cursor-pointer transition-all border ${selectedQuery?._id === q._id ? 'border-indigo-500 bg-indigo-50/50 shadow-sm' : 'border-transparent hover:bg-accent/50'}`}
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <h4 className={`font-medium line-clamp-1 ${selectedQuery?._id === q._id ? 'text-indigo-900' : 'text-foreground'}`}>{q.title}</h4>
                                        {q.status === 'resolved' && <CheckCircle className="h-4 w-4 text-green-500 shrink-0 ml-2" />}
                                    </div>
                                    <p className="text-xs text-muted-foreground line-clamp-1 mb-2">{q.description}</p>
                                    <div className="flex justify-between items-center mt-2">
                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                            <User className="h-3 w-3" />
                                            <span className="truncate max-w-[100px]">{q.student.name}</span>
                                        </div>
                                        <span className="text-[10px] bg-secondary px-2 py-0.5 rounded-full truncate max-w-[80px]">
                                            {q.batch.title}
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Right Panel - Chat Thread */}
                <div className="md:col-span-2 bg-card border rounded-2xl flex flex-col overflow-hidden shadow-sm">
                    {selectedQuery ? (
                        <>
                            <div className="p-6 border-b shrink-0 bg-white">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h2 className="text-2xl font-bold">{selectedQuery.title}</h2>
                                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                                            <span className="flex items-center gap-1.5 font-medium"><User className="h-4 w-4"/> {selectedQuery.student.name}</span>
                                            <span>•</span>
                                            <span className="truncate">{selectedQuery.batch.title}</span>
                                            <span>•</span>
                                            <span>{formatDistanceToNow(new Date(selectedQuery.createdAt), { addSuffix: true })}</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        {selectedQuery.status !== 'resolved' && !selectedQuery.liveMeetUrl && (
                                            <Button variant="outline" className="border-indigo-200 text-indigo-700 hover:bg-indigo-50" onClick={() => setIsMeetDialogOpen(true)}>
                                                <Video className="w-4 h-4 mr-2" /> Schedule Meet
                                            </Button>
                                        )}
                                        {selectedQuery.status !== 'resolved' && !selectedQuery.resolvedByInstructor && (
                                            <Button variant="outline" className="border-green-200 text-green-700 hover:bg-green-50" onClick={handleResolve}>
                                                <CheckCircle className="w-4 h-4 mr-2" /> Mark as Resolved
                                            </Button>
                                        )}
                                    </div>
                                </div>
                                <p className="mt-4 text-foreground/90 p-4 bg-secondary/50 rounded-xl leading-relaxed">
                                    {selectedQuery.description}
                                </p>
                                
                                {selectedQuery.liveMeetUrl && selectedQuery.status !== 'resolved' && (
                                    <div className="mt-4 bg-indigo-50 border border-indigo-100 p-4 rounded-xl flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-indigo-100 rounded-lg">
                                                <Video className="h-5 w-5 text-indigo-600" />
                                            </div>
                                            <div>
                                                <h4 className="font-semibold text-indigo-900 text-sm">Live Meet Scheduled</h4>
                                                <p className="text-xs text-indigo-700 mt-0.5">You invited the student to a private 1-on-1 session.</p>
                                            </div>
                                        </div>
                                        <Button className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm" onClick={() => window.open(selectedQuery.liveMeetUrl, '_blank')}>
                                            Join Now
                                        </Button>
                                    </div>
                                )}
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
                                {selectedQuery.messages.map((msg: any, idx: number) => {
                                    const isMe = msg.sender._id === user?._id;
                                    return (
                                        <div key={idx} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-xs font-semibold text-muted-foreground">{isMe ? 'You' : msg.sender.name}</span>
                                                <span className="text-xs text-muted-foreground/70">{formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}</span>
                                            </div>
                                            <div className={`px-4 py-2.5 rounded-2xl max-w-[80%] shadow-sm ${isMe ? 'bg-primary text-primary-foreground rounded-br-sm' : 'bg-secondary text-secondary-foreground border rounded-bl-sm'}`}>
                                                <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                                {selectedQuery.messages.length === 0 && (
                                    <div className="h-full flex items-center justify-center flex-col text-muted-foreground opacity-50">
                                        <MessageCircleQuestion className="h-12 w-12 mb-4" />
                                        <p>No replies yet. Type a message below to respond.</p>
                                    </div>
                                )}
                            </div>

                            {selectedQuery.status !== 'resolved' ? (
                                <div className="flex flex-col border-t bg-white shrink-0">
                                    {selectedQuery.resolvedByInstructor && !selectedQuery.resolvedByStudent && (
                                        <div className="bg-blue-50 border-b p-3 text-center text-sm text-blue-800 font-medium">
                                            You marked this as resolved. Waiting for student to confirm.
                                        </div>
                                    )}
                                    <div className="p-4 flex gap-3">
                                        <Textarea 
                                            placeholder="Type your response to the student..." 
                                            className="min-h-[60px] max-h-[150px] resize-y"
                                            value={replyText}
                                            onChange={e => setReplyText(e.target.value)}
                                        />
                                        <Button className="h-[60px] px-6 rounded-xl shadow-sm" onClick={handleReply}>
                                            <Send className="w-5 h-5" />
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-4 bg-green-50 border-t shrink-0 text-center text-sm font-medium text-green-800">
                                    This query has been resolved and closed.
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground opacity-50">
                            <MessageCircleQuestion className="h-16 w-16 mb-4" />
                            <h3 className="text-xl font-medium mb-1">No Query Selected</h3>
                            <p className="text-sm">Select a query from the list to view the thread and respond.</p>
                        </div>
                    )}
                </div>
            </div>

            <Dialog open={isMeetDialogOpen} onOpenChange={setIsMeetDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Schedule 1-on-1 Meet</DialogTitle>
                        <DialogDescription>
                            This will generate a private Jitsi meeting link for you and <strong>{selectedQuery?.student?.name}</strong> to resolve this query face-to-face.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="mt-4">
                        <Button variant="outline" onClick={() => setIsMeetDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleScheduleMeet} className="bg-indigo-600 hover:bg-indigo-700">Generate Meet Link</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
