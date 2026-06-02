'use client';

import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Clock, LogOut } from 'lucide-react';

export default function PendingPage() {
    const { logout } = useAuth();

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-50 dark:from-gray-950 dark:to-gray-900 p-4">
            <div className="max-w-md w-full text-center space-y-6">
                <div className="mx-auto w-20 h-20 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                    <Clock className="w-10 h-10 text-amber-600 dark:text-amber-400 animate-pulse" />
                </div>
                <h1 className="text-2xl font-bold tracking-tight">Account Under Review</h1>
                <p className="text-muted-foreground text-base leading-relaxed">
                    Your account is being reviewed by an administrator.
                    You&apos;ll gain full access once approved.
                </p>
                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                    <p className="text-sm text-amber-800 dark:text-amber-300">
                        This usually takes less than 24 hours. You&apos;ll be able to access
                        all features once your account is approved.
                    </p>
                </div>
                <Button variant="outline" onClick={logout} className="gap-2">
                    <LogOut className="w-4 h-4" />
                    Log Out
                </Button>
            </div>
        </div>
    );
}
