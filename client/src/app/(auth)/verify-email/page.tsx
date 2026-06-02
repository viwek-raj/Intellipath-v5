'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function VerifyEmailPage() {
    const searchParams = useSearchParams();
    const token = searchParams.get('token');
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState('Verifying your email address...');
    const { login } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!token) {
            setStatus('error');
            setMessage('Invalid or missing verification token.');
            return;
        }

        const verify = async () => {
            try {
                const { data } = await api.post('/auth/verify-email', { token });
                setStatus('success');
                setMessage('Your email has been successfully verified! Logging you in...');
                
                // Log them in automatically after 2 seconds
                setTimeout(() => {
                    login(data.token, data);
                    router.push('/dashboard');
                }, 2000);

            } catch (err: any) {
                setStatus('error');
                setMessage(err.response?.data?.message || 'Failed to verify email. The link may have expired.');
            }
        };

        verify();
    }, [token, login, router]);

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 px-4">
            <Card className="w-full max-w-md text-center py-8">
                <CardHeader>
                    <div className="flex justify-center mb-4">
                        {status === 'loading' && <Loader2 className="h-12 w-12 text-blue-500 animate-spin" />}
                        {status === 'success' && <CheckCircle2 className="h-12 w-12 text-green-500" />}
                        {status === 'error' && <XCircle className="h-12 w-12 text-red-500" />}
                    </div>
                    <CardTitle className="text-2xl">
                        {status === 'loading' && 'Verifying Email...'}
                        {status === 'success' && 'Email Verified!'}
                        {status === 'error' && 'Verification Failed'}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">{message}</p>
                    {status === 'error' && (
                        <Link href="/login">
                            <Button className="w-full bg-violet-600 hover:bg-violet-700 text-white">Go to Login</Button>
                        </Link>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
