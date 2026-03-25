'use client';

import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { ModeToggle } from './mode-toggle';
import { LogOut, User, Menu } from 'lucide-react';
import { useState } from 'react';

export function Navbar() {
    const { user, logout } = useAuth();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    return (
        <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
            <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                <Link href="/" className="flex items-center space-x-2">
                    <span className="text-2xl font-bold text-primary">
                        Intellipath 
                    </span>
                </Link>

                <div className="hidden md:flex items-center space-x-6">
                    {user ? (
                        <>
                            <Link href="/dashboard" className="text-sm font-medium transition-colors hover:text-primary">
                                Dashboard
                            </Link>
                            <Link href="/courses/create" className="text-sm font-medium transition-colors hover:text-primary">
                                Create Course
                            </Link>
                        </>
                    ) : null}
                </div>

                <div className="flex items-center space-x-4">
                    <ModeToggle />
                    {user ? (
                        <div className="flex items-center gap-4">
                             <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground">
                                <User className="h-4 w-4" />
                                <span>{user.name}</span>
                             </div>
                            <Button variant="ghost" size="sm" onClick={logout} className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20">
                                <LogOut className="h-4 w-4 mr-2" />
                                Logout
                            </Button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <Link href="/login">
                                <Button variant="ghost" size="sm">Login</Button>
                            </Link>
                            <Link href="/register">
                                <Button size="sm" className="rounded-full">Get Started</Button>
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </nav>
    );
}
