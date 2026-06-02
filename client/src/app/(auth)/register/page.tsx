'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from '@/components/ui/card';
import { MailCheck, Loader2 } from 'lucide-react';

export default function RegisterPage() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const router = useRouter();

    // Listen for login event from the email verification tab
    useEffect(() => {
        if (!successMessage) return;

        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === 'token' && e.newValue) {
                // The user logged in on the newly opened verification tab!
                // Instantly redirect this tab to the dashboard.
                router.push('/dashboard');
            }
        };

        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, [successMessage, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        try {
            const { data } = await api.post('/auth/register', { name, email, password, role: 'student' });
            // Successfully registered, now they need to verify email
            setSuccessMessage(data.message || 'Registration successful! Please check your email to verify your account.');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Registration failed');
        }
    };

    if (successMessage) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
                <Card className="w-full max-w-md text-center py-8">
                    <CardHeader>
                        <div className="flex justify-center mb-4">
                            <div className="h-16 w-16 bg-purple-100 rounded-full flex items-center justify-center">
                                <MailCheck className="h-8 w-8 text-purple-600" />
                            </div>
                        </div>
                        <CardTitle className="text-2xl">Check your email</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center">
                        <p className="text-gray-600 dark:text-gray-400 mb-6">{successMessage}</p>
                        <div className="flex items-center gap-2 text-sm text-purple-600 font-medium mb-6 animate-pulse">
                            <Loader2 className="w-4 h-4 animate-spin" /> Waiting for verification...
                        </div>
                        <Link href="/login" className="w-full">
                            <Button variant="outline" className="w-full">Return to Login</Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle className="text-2xl text-center">Create Account</CardTitle>
                    <CardDescription className="text-center">Sign up for Intellipath Learning Platform</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                             <Label htmlFor="name">Name</Label>
                            <Input
                                id="name"
                                type="text"
                                placeholder="John Doe"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="m@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                        {error && <p className="text-sm text-red-500">{error}</p>}
                        <Button type="submit" className="w-full">
                            Sign Up
                        </Button>
                    </form>
                </CardContent>
                <CardFooter className="justify-center">
                    <p className="text-sm text-gray-500">
                        Already have an account?{' '}
                        <Link href="/login" className="text-blue-600 hover:underline">
                            Login
                        </Link>
                    </p>
                </CardFooter>
            </Card>
        </div>
    );
}
