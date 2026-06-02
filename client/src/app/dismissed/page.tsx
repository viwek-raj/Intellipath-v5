'use client';

import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { XCircle, LogOut } from 'lucide-react';

export default function DismissedPage() {
    const { user, logout } = useAuth();

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-rose-50 dark:from-gray-950 dark:to-gray-900 p-4">
            <div className="max-w-md w-full text-center space-y-6">
                <div className="mx-auto w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                    <XCircle className="w-10 h-10 text-red-600 dark:text-red-400" />
                </div>
                <h1 className="text-2xl font-bold tracking-tight">Account Dismissed</h1>
                <p className="text-muted-foreground text-base leading-relaxed">
                    Your account has been dismissed by an administrator.
                    You no longer have access to the platform.
                </p>
                <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                    <p className="text-sm text-red-800 dark:text-red-300">
                        If you believe this was a mistake, please contact the administrator
                        for further assistance.
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
