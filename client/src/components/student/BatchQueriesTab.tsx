"use client";

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/context/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { MessageCircleQuestion, Plus, Send, Video, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from '@/components/ui/badge';

export default function BatchQueriesTab({ batchId, instructorId }: { batchId: string, instructorId: string }) {
    const { user } = useAuth();
    const [queries, setQueries] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    
    const [newTitle, setNewTitle] = useState('');
    const [newDescription, setNewDescription] = useState('');
    const [isCreateOpen, setIsCreateOpen] = useState(false);

    const [selectedQuery, setSelectedQuery] = useState<any | null>(null);
    const [replyText, setReplyText] = useState('');

    const fetchQueries = async () => {
        try {
            const { data } = await api.get(`/queries?batchId=${batchId}`);
            setQueries(data);
        } catch (error) {
            console.error('Failed to fetch queries', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchQueries();
    }, [batchId]);

    const handleCreateQuery = async () => {
        if (!newTitle.trim() || !newDescription.trim()) {
            return toast.error("Title and description required");
        }
        try {
            const { data } = await api.post('/queries', {
                batchId,
                title: newTitle,
                description: newDescription
            });
            setQueries([data, ...queries]);
            setIsCreateOpen(false);
            setNewTitle('');
            setNewDescription('');
            toast.success("Query raised successfully!");
        } catch (error) {
            toast.error("Failed to raise query");
        }
    };

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

    const handleResolve = async () => {
        try {
            const { data } = await api.put(`/queries/${selectedQuery._id}/resolve`);
            setSelectedQuery(data);
            setQueries(queries.map(q => q._id === data._id ? data : q));
            if (data.status === 'resolved') {
                toast.success("Query resolved completely!");
            } else {
                toast.success("You marked this as resolved. Waiting for instructor.");
            }
        } catch (error) {
            toast.error("Failed to mark as resolved");
        }
    };

    if (loading) return <div className="p-8 text-center animate-pulse">Loading queries...</div>;

    if (selectedQuery) {
        return (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                <Button variant="ghost" onClick={() => setSelectedQuery(null)} className="mb-2">
                    &larr; Back to Queries
                </Button>

                <Card className="border-indigo-100 shadow-sm">
                    <CardHeader className="border-b bg-muted/30">
                        <div className="flex justify-between items-start">
                            <div>
                                <CardTitle className="text-2xl font-bold">{selectedQuery.title}</CardTitle>
                                <CardDescription className="mt-2 text-base text-foreground">
                                    {selectedQuery.description}
                                </CardDescription>
                            </div>
                            <Badge variant={selectedQuery.status === 'resolved' ? 'default' : 'secondary'} className={selectedQuery.status === 'resolved' ? 'bg-green-500' : 'bg-orange-100 text-orange-800'}>
                                {selectedQuery.status.toUpperCase()}
                            </Badge>
                        </div>
                    </CardHeader>

                    {selectedQuery.liveMeetUrl && selectedQuery.status !== 'resolved' && (
                        <div className="bg-indigo-50 border-l-4 border-indigo-500 p-4 m-6 rounded-r-lg flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-indigo-100 rounded-full">
                                    <Video className="h-6 w-6 text-indigo-600" />
                                </div>
                                <div>
                                    <h4 className="font-semibold text-indigo-900">Instructor Scheduled a Live Meet</h4>
                                    <p className="text-sm text-indigo-700">Join the private 1-on-1 session to resolve this query.</p>
                                </div>
                            </div>
                            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={() => window.open(selectedQuery.liveMeetUrl, '_blank')}>
                                Join Meet
                            </Button>
                        </div>
                    )}

                    <CardContent className="p-6 space-y-6 max-h-[500px] overflow-y-auto bg-slate-50/50">
                        {selectedQuery.messages.map((msg: any, idx: number) => {
                            const isMe = msg.sender._id === user?._id;
                            return (
                                <div key={idx} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-xs font-semibold text-muted-foreground">{isMe ? 'You' : msg.sender.name}</span>
                                        <span className="text-xs text-muted-foreground/70">{formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}</span>
                                    </div>
                                    <div className={`px-4 py-2.5 rounded-2xl max-w-[80%] ${isMe ? 'bg-primary text-primary-foreground rounded-br-sm' : 'bg-secondary text-secondary-foreground border shadow-sm rounded-bl-sm'}`}>
                                        <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                                    </div>
                                </div>
                            );
                        })}
                        {selectedQuery.messages.length === 0 && (
                            <div className="text-center text-muted-foreground py-8">No replies yet. Instructor will respond soon.</div>
                        )}
                    </CardContent>

                    {selectedQuery.status !== 'resolved' && (
                        <div className="flex flex-col border-t rounded-b-xl bg-white overflow-hidden">
                            {!selectedQuery.resolvedByStudent && (
                                <div className="bg-amber-50 border-b p-3 flex items-center justify-between">
                                    <span className="text-sm text-amber-800 font-medium">Is your doubt cleared?</span>
                                    <Button size="sm" variant="outline" className="bg-white border-amber-200 text-amber-700 hover:bg-amber-100" onClick={handleResolve}>
                                        <CheckCircle className="w-4 h-4 mr-2" /> Mark as Resolved
                                    </Button>
                                </div>
                            )}
                            {selectedQuery.resolvedByStudent && !selectedQuery.resolvedByInstructor && (
                                <div className="bg-blue-50 border-b p-3 text-center text-sm text-blue-800 font-medium">
                                    You marked this as resolved. Waiting for instructor to confirm.
                                </div>
                            )}
                            <div className="p-4 flex gap-2 items-end">
                                <Textarea 
                                    placeholder="Type a reply..." 
                                    className="min-h-[60px] resize-none"
                                    value={replyText}
                                    onChange={e => setReplyText(e.target.value)}
                                />
                                <Button className="h-[60px] px-8 rounded-xl" onClick={handleReply}>
                                    <Send className="w-5 h-5" />
                                </Button>
                            </div>
                        </div>
                    )}
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-lg font-semibold flex items-center gap-2"><MessageCircleQuestion className="w-5 h-5 text-indigo-500"/> Have a doubt?</h3>
                    <p className="text-sm text-muted-foreground">Raise a query and your instructor will help you out.</p>
                </div>
                
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogTrigger asChild>
                        <Button className="gap-2 rounded-full"><Plus className="w-4 h-4"/> Raise Query</Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                            <DialogTitle>Raise a New Query</DialogTitle>
                            <DialogDescription>
                                Describe your doubt clearly. The instructor may schedule a live 1-on-1 session if needed.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Title</label>
                                <Input 
                                    placeholder="e.g. Concept of Polymorphism isn't clear" 
                                    value={newTitle}
                                    onChange={e => setNewTitle(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Description</label>
                                <Textarea 
                                    placeholder="Please explain in detail where you are stuck..." 
                                    className="min-h-[120px]"
                                    value={newDescription}
                                    onChange={e => setNewDescription(e.target.value)}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                            <Button onClick={handleCreateQuery}>Submit Query</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {queries.length === 0 ? (
                <div className="text-center py-16 border-2 border-dashed rounded-xl">
                    <MessageCircleQuestion className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground">No queries raised yet</h3>
                    <p className="text-muted-foreground">You haven't asked any questions in this batch.</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {queries.map((q) => (
                        <Card key={q._id} className="cursor-pointer hover:border-indigo-300 transition-colors" onClick={() => setSelectedQuery(q)}>
                            <CardContent className="p-5 flex justify-between items-center">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <h4 className="font-semibold text-base">{q.title}</h4>
                                        {q.liveMeetUrl && q.status !== 'resolved' && (
                                            <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">
                                                <Video className="w-3 h-3 mr-1" /> Live Meet Scheduled
                                            </Badge>
                                        )}
                                        {q.status === 'resolved' && (
                                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                                <CheckCircle className="w-3 h-3 mr-1" /> Resolved
                                            </Badge>
                                        )}
                                    </div>
                                    <p className="text-sm text-muted-foreground line-clamp-1">{q.description}</p>
                                    <p className="text-xs text-muted-foreground pt-1">
                                        Last activity {formatDistanceToNow(new Date(q.updatedAt), { addSuffix: true })}
                                    </p>
                                </div>
                                <Button variant="ghost" className="shrink-0 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50">View Thread</Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
