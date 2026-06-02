'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, UserPlus, Eye, EyeOff, Copy, Check } from 'lucide-react';
import Link from 'next/link';

export default function CreateInstructorPage() {
    const router = useRouter();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [bio, setBio] = useState('');
    const [specializations, setSpecializations] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);

    const generatePassword = () => {
        const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$';
        let pass = '';
        for (let i = 0; i < 12; i++) {
            pass += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        setPassword(pass);
        setShowPassword(true);
    };

    const copyPassword = () => {
        navigator.clipboard.writeText(password);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);

        try {
            const specArray = specializations
                .split(',')
                .map(s => s.trim())
                .filter(Boolean);

            await adminApi.createInstructor({
                name,
                email,
                password,
                bio,
                specializations: specArray,
            });

            setSuccess(`Instructor "${name}" created successfully! They can log in with the temporary password and will be prompted to change it.`);
            setName('');
            setEmail('');
            setPassword('');
            setBio('');
            setSpecializations('');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to create instructor');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 max-w-2xl">
            <div className="flex items-center gap-3">
                <Link href="/admin/users">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="w-4 h-4" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Create Instructor</h1>
                    <p className="text-muted-foreground">Create a new instructor account with a temporary password.</p>
                </div>
            </div>

            <Card>
                <CardContent className="p-6">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Full Name *</Label>
                            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Dr. Jane Smith" />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="email">Email *</Label>
                            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="instructor@example.com" />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password">Temporary Password *</Label>
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <Input
                                        id="password"
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        minLength={6}
                                        placeholder="Enter or generate a password"
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                                        onClick={() => setShowPassword(!showPassword)}
                                    >
                                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                    </Button>
                                </div>
                                <Button type="button" variant="secondary" onClick={generatePassword}>
                                    Generate
                                </Button>
                                {password && (
                                    <Button type="button" variant="outline" size="icon" onClick={copyPassword}>
                                        {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                                    </Button>
                                )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                The instructor will be prompted to change this on first login.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="bio">Bio</Label>
                            <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Brief description of the instructor..." rows={3} />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="specs">Specializations</Label>
                            <Input
                                id="specs"
                                value={specializations}
                                onChange={(e) => setSpecializations(e.target.value)}
                                placeholder="Web Development, Python, Machine Learning (comma-separated)"
                            />
                        </div>

                        {error && (
                            <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg">
                                <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                            </div>
                        )}

                        {success && (
                            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg">
                                <p className="text-sm text-emerald-700 dark:text-emerald-400">{success}</p>
                            </div>
                        )}

                        <Button type="submit" disabled={loading} className="w-full gap-2">
                            <UserPlus className="w-4 h-4" />
                            {loading ? 'Creating...' : 'Create Instructor Account'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
