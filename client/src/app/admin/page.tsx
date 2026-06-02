'use client';

import { useState, useEffect } from 'react';
import { adminApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import {
    Users,
    UserCheck,
    UserX,
    GraduationCap,
    BookOpen,
    Layers,
    Video,
    Clock,
} from 'lucide-react';

interface DashboardStats {
    stats: {
        pendingStudents: number;
        approvedStudents: number;
        dismissedUsers: number;
        totalInstructors: number;
        totalBatches: number;
        totalLectures: number;
        totalCategories: number;
    };
    recentPending: Array<{
        _id: string;
        name: string;
        email: string;
        role: string;
        createdAt: string;
    }>;
}

export default function AdminDashboard() {
    const [data, setData] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDashboard();
    }, []);

    const fetchDashboard = async () => {
        try {
            const { data } = await adminApi.getDashboardStats();
            setData(data);
        } catch (err) {
            console.error('Failed to fetch dashboard:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (userId: string) => {
        try {
            await adminApi.approveUser(userId);
            fetchDashboard();
        } catch (err) {
            console.error('Failed to approve:', err);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
        );
    }

    const stats = data?.stats;

    const statCards = [
        { label: 'Pending Students', value: stats?.pendingStudents ?? 0, icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-950/30' },
        { label: 'Approved Students', value: stats?.approvedStudents ?? 0, icon: UserCheck, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
        { label: 'Instructors', value: stats?.totalInstructors ?? 0, icon: GraduationCap, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-950/30' },
        { label: 'Dismissed', value: stats?.dismissedUsers ?? 0, icon: UserX, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-950/30' },
        { label: 'Total Batches', value: stats?.totalBatches ?? 0, icon: Layers, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-950/30' },
        { label: 'Total Lectures', value: stats?.totalLectures ?? 0, icon: Video, color: 'text-cyan-500', bg: 'bg-cyan-50 dark:bg-cyan-950/30' },
        { label: 'Categories', value: stats?.totalCategories ?? 0, icon: BookOpen, color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-950/30' },
    ];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
                <p className="text-muted-foreground">Overview of your learning platform.</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {statCards.map((stat) => (
                    <Card key={stat.label}>
                        <CardContent className="flex items-center gap-4 p-4">
                            <div className={`w-12 h-12 rounded-lg ${stat.bg} flex items-center justify-center`}>
                                <stat.icon className={`w-6 h-6 ${stat.color}`} />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{stat.value}</p>
                                <p className="text-xs text-muted-foreground">{stat.label}</p>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Pending Registrations */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-lg">Pending Registrations</CardTitle>
                    <Link href="/admin/users?status=pending">
                        <Button variant="outline" size="sm">View All</Button>
                    </Link>
                </CardHeader>
                <CardContent>
                    {data?.recentPending && data.recentPending.length > 0 ? (
                        <div className="space-y-3">
                            {data.recentPending.map((user) => (
                                <div key={user._id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center">
                                            <Users className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium">{user.name}</p>
                                            <p className="text-xs text-muted-foreground">{user.email}</p>
                                        </div>
                                        <Badge variant="secondary" className="text-xs capitalize">{user.role}</Badge>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-muted-foreground">
                                            {new Date(user.createdAt).toLocaleDateString()}
                                        </span>
                                        <Button size="sm" onClick={() => handleApprove(user._id)}>
                                            Approve
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground text-center py-8">
                            No pending registrations
                        </p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
