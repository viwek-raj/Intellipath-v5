'use client';

import { useState, useEffect } from 'react';
import { adminApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Search, UserX, Trash2, Play, ChevronLeft, ChevronRight } from 'lucide-react';
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

interface UserItem {
    _id: string;
    name: string;
    email: string;
    role: string;
    accountStatus: string;
    createdAt: string;
}

export default function AdminUsersPage() {
    const searchParams = useSearchParams();
    const [users, setUsers] = useState<UserItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [roleFilter, setRoleFilter] = useState(searchParams.get('role') || '');
    const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
    const [search, setSearch] = useState('');
    const [deleteDialog, setDeleteDialog] = useState<{isOpen: boolean, id: string | null}>({isOpen: false, id: null});
    const [suspendDialog, setSuspendDialog] = useState<{isOpen: boolean, id: string | null}>({isOpen: false, id: null});
    const [suspendReason, setSuspendReason] = useState('');

    useEffect(() => {
        fetchUsers();
    }, [page, roleFilter, statusFilter]);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const params: Record<string, string | number> = { page, limit: 15 };
            if (roleFilter) params.role = roleFilter;
            if (statusFilter) params.status = statusFilter;
            if (search) params.search = search;
            const { data } = await adminApi.getAllUsers(params);
            setUsers(data.users);
            setTotalPages(data.pages);
            setTotal(data.total);
        } catch (err) {
            console.error('Failed to fetch users:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setPage(1);
        fetchUsers();
    };

    const handleRevokeSuspension = async (id: string) => {
        try {
            await adminApi.revokeSuspension(id);
            fetchUsers();
            toast.success('Suspension revoked successfully');
        } catch (err) {
            console.error('Failed to revoke suspension:', err);
            toast.error('Failed to revoke suspension');
        }
    };

    const confirmSuspend = (id: string) => {
        setSuspendReason('');
        setSuspendDialog({ isOpen: true, id });
    };

    const handleSuspend = async () => {
        const { id } = suspendDialog;
        if (!id) return;
        try {
            await adminApi.suspendUser(id, suspendReason);
            fetchUsers();
            toast.success('User suspended successfully');
        } catch (err) {
            console.error('Failed to suspend user:', err);
            toast.error('Failed to suspend user');
        } finally {
            setSuspendDialog({ isOpen: false, id: null });
        }
    };

    const confirmDelete = (id: string) => {
        setDeleteDialog({ isOpen: true, id });
    };

    const handleDelete = async () => {
        const { id } = deleteDialog;
        if (!id) return;
        try {
            await adminApi.deleteUser(id);
            fetchUsers();
            toast.success('User deleted successfully');
        } catch (err) {
            console.error('Failed to delete user:', err);
            toast.error('Failed to delete user');
        } finally {
            setDeleteDialog({ isOpen: false, id: null });
        }
    };

    const statusColor = (status: string) => {
        switch (status) {
            case 'active': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
            case 'suspended': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
            default: return '';
        }
    };

    const roleColor = (role: string) => {
        switch (role) {
            case 'admin': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
            case 'instructor': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
            case 'student': return 'bg-gray-100 text-gray-700 dark:bg-gray-800/50 dark:text-gray-400';
            default: return '';
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">User Management</h1>
                <p className="text-muted-foreground">Manage students, instructors, and approvals.</p>
            </div>

            {/* Filters */}
            <Card>
                <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row flex-wrap gap-3">
                        <form onSubmit={handleSearch} className="flex-1 flex gap-2">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search by name or email..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="pl-9"
                                />
                            </div>
                            <Button type="submit" variant="secondary">Search</Button>
                        </form>
                        <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v === 'all' ? '' : v); setPage(1); }}>
                            <SelectTrigger className="w-full md:w-40">
                                <SelectValue placeholder="All Roles" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Roles</SelectItem>
                                <SelectItem value="student">Student</SelectItem>
                                <SelectItem value="instructor">Instructor</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v === 'all' ? '' : v); setPage(1); }}>
                            <SelectTrigger className="w-full md:w-40">
                                <SelectValue placeholder="All Statuses" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Statuses</SelectItem>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="suspended">Suspended</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* User Table */}
            <Card>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="flex items-center justify-center h-32">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                        </div>
                    ) : users.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">No users found</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-border">
                                        <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Name</th>
                                        <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Email</th>
                                        <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Role</th>
                                        <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Status</th>
                                        <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Joined</th>
                                        <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map((u) => (
                                        <tr key={u._id} className="border-b border-border last:border-0 hover:bg-accent/50 transition-colors">
                                            <td className="px-4 py-3 text-sm font-medium">{u.name}</td>
                                            <td className="px-4 py-3 text-sm text-muted-foreground">{u.email}</td>
                                            <td className="px-4 py-3">
                                                <span className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${roleColor(u.role)}`}>
                                                    {u.role}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${statusColor(u.accountStatus)}`}>
                                                    {u.accountStatus}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-muted-foreground">
                                                {new Date(u.createdAt).toLocaleDateString()}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex justify-end gap-1">
                                                    {u.accountStatus === 'suspended' && (
                                                        <Button size="sm" variant="ghost" className="text-emerald-600 h-8" onClick={() => handleRevokeSuspension(u._id)} title="Revoke Suspension">
                                                            <Play className="w-4 h-4" />
                                                        </Button>
                                                    )}
                                                    {u.accountStatus !== 'suspended' && u.role !== 'admin' && (
                                                        <Button size="sm" variant="ghost" className="text-amber-600 h-8" onClick={() => confirmSuspend(u._id)} title="Suspend User">
                                                            <UserX className="w-4 h-4" />
                                                        </Button>
                                                    )}
                                                    {u.role !== 'admin' && (
                                                        <Button size="sm" variant="ghost" className="text-destructive h-8" onClick={() => confirmDelete(u._id)}>
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                            <p className="text-sm text-muted-foreground">
                                Showing page {page} of {totalPages} ({total} total)
                            </p>
                            <div className="flex gap-2">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={page <= 1}
                                    onClick={() => setPage(p => p - 1)}
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={page >= totalPages}
                                    onClick={() => setPage(p => p + 1)}
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            <AlertDialog open={deleteDialog.isOpen} onOpenChange={(open) => !open && setDeleteDialog({ isOpen: false, id: null })}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete the user and all associated data. Continue?
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

            <AlertDialog open={suspendDialog.isOpen} onOpenChange={(open) => !open && setSuspendDialog({ isOpen: false, id: null })}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Suspend User</AlertDialogTitle>
                        <AlertDialogDescription>
                            Please provide a reason for suspension. The user will receive this via email:
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="py-4">
                        <Input
                            placeholder="Reason for suspension..."
                            value={suspendReason}
                            onChange={(e) => setSuspendReason(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSuspend()}
                            autoFocus
                        />
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleSuspend} className="bg-amber-600 hover:bg-amber-700 text-white">
                            Suspend User
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
