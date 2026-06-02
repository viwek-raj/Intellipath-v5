'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    Video,
    PlusCircle,
    Key,
    LogOut,
    GraduationCap,
    Users,
    MessageCircleQuestion,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ModeToggle } from '@/components/mode-toggle';

const sidebarItems = [
    { label: 'Dashboard', icon: LayoutDashboard, href: '/instructor' },
    { label: 'My Batches', icon: Video, href: '/instructor/batches' },
    { label: 'Create Batch', icon: PlusCircle, href: '/instructor/batches/create' },
    { label: 'Student Queries', icon: MessageCircleQuestion, href: '/instructor/queries' },
    { label: 'Change Password', icon: Key, href: '/instructor/change-password' },
];

export default function InstructorLayout({ children }: { children: React.ReactNode }) {
    const { user, logout, isLoading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (!isLoading && (!user || user.role !== 'instructor')) {
            router.push('/login');
        }
    }, [user, isLoading, router]);

    if (isLoading || !user || user.role !== 'instructor') {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
        );
    }

    return (
        <div className="flex min-h-screen">
            <aside className="w-64 border-r border-border bg-card flex flex-col">
                <div className="p-4 border-b border-border">
                    <Link href="/instructor" className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                            <GraduationCap className="w-4 h-4 text-white" />
                        </div>
                        <div>
                            <p className="font-semibold text-sm">Intellipath</p>
                            <p className="text-xs text-muted-foreground">Instructor Portal</p>
                        </div>
                    </Link>
                </div>

                <nav className="flex-1 p-2 space-y-1">
                    {sidebarItems.map((item) => {
                        const isActive = pathname === item.href || (item.href !== '/instructor' && pathname.startsWith(item.href));
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                                    isActive
                                        ? 'bg-blue-600/10 text-blue-600 dark:text-blue-400 font-medium'
                                        : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                                }`}
                            >
                                <item.icon className="w-4 h-4" />
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-border space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Theme</span>
                        <ModeToggle />
                    </div>
                    <div className="flex items-center gap-2 px-1">
                        <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                            <Users className="w-4 h-4 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{user.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                        </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={logout}
                        className="w-full justify-start text-destructive hover:bg-destructive/10">
                        <LogOut className="mr-2 h-4 w-4" />
                        Logout
                    </Button>
                </div>
            </aside>

            <main className="flex-1 overflow-auto bg-background">
                <div className="p-6">{children}</div>
            </main>
        </div>
    );
}
