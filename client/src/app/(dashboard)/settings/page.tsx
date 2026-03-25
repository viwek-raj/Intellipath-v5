'use client';

import { useAuth } from '@/context/AuthContext';
import { ModeToggle } from '@/components/mode-toggle';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { User, Moon, Sun, Monitor, LogOut, Shield, Bell } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import api from '@/lib/api';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';

export default function SettingsPage() {
    const { user, logout } = useAuth();
    const { setTheme, theme } = useTheme();
    const router = useRouter();

    const handleDeleteAccount = async () => {
        try {
            await api.delete('/auth/profile');
            logout();
            router.push('/');
        } catch (error) {
            console.error('Failed to delete account:', error);
            // Optionally add toast notification here
        }
    };

    if (!user) return null;

    return (
        <div className="container max-w-4xl mx-auto py-10 space-y-8">
            <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
                <p className="text-muted-foreground">
                    Manage your account settings and preferences.
                </p>
            </div>

            <Separator />

            <div className="grid gap-8">
                {/* Profile Section */}
                <Card className="border-none shadow-sm bg-card">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <User className="h-5 w-5" />
                            Profile
                        </CardTitle>
                        <CardDescription>
                            Your personal information.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Name</Label>
                            <Input id="name" value={user.name} disabled className="bg-muted text-muted-foreground" />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="email">Email</Label>
                            <Input id="email" value={user.email} disabled className="bg-muted text-muted-foreground" />
                        </div>
                    </CardContent>
                </Card>

                {/* Appearance Section */}
                <Card className="border-none shadow-sm bg-card">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Monitor className="h-5 w-5" />
                            Appearance
                        </CardTitle>
                        <CardDescription>
                            Customize how Intellipath  looks on your device.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4">
                        <div className="grid grid-cols-3 gap-4">
                            <Button 
                                variant={theme === 'light' ? 'default' : 'outline'}
                                className="h-24 flex flex-col gap-2"
                                onClick={() => setTheme('light')}
                            >
                                <Sun className="h-6 w-6" />
                                Light
                            </Button>
                            <Button 
                                variant={theme === 'dark' ? 'default' : 'outline'}
                                className="h-24 flex flex-col gap-2"
                                onClick={() => setTheme('dark')}
                            >
                                <Moon className="h-6 w-6" />
                                Dark
                            </Button>
                             <Button 
                                variant={theme === 'system' ? 'default' : 'outline'}
                                className="h-24 flex flex-col gap-2"
                                onClick={() => setTheme('system')}
                            >
                                <Monitor className="h-6 w-6" />
                                System
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                 {/* Notifications (Placeholder) */}
                 <Card className="border-none shadow-sm bg-card opacity-50 cursor-not-allowed">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Bell className="h-5 w-5" />
                            Notifications (Coming Soon)
                        </CardTitle>
                        <CardDescription>
                            Manage your email and push notifications.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center space-x-2">
                             <Label className="text-muted-foreground">Email Notifications</Label>
                        </div>
                    </CardContent>
                </Card>

                {/* Account Actions */}
                 <Card className="border-destructive/20 shadow-sm bg-destructive/5">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-destructive">
                            <Shield className="h-5 w-5" />
                            Danger Zone
                        </CardTitle>
                        <CardDescription>
                            Irreversible actions.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Button variant="outline" onClick={logout}>
                            <LogOut className="mr-2 h-4 w-4" />
                            Sign Out
                        </Button>
                        <Separator />
                        <div className="flex items-center justify-between">
                            <div>
                                <h4 className="font-medium text-destructive">Delete Account</h4>
                                <p className="text-sm text-muted-foreground">
                                    Permanently remove your account and all created courses.
                                </p>
                            </div>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="destructive">Delete Account</Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This action cannot be undone. This will permanently delete your
                                            account and remove all your generated courses from our servers.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={handleDeleteAccount} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                            Delete Account
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
