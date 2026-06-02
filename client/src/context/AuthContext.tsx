'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

interface User {
    _id: string;
    name: string;
    email: string;
    role: string;
    accountStatus: string;
    mustChangePassword?: boolean;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    login: (token: string, userData: User) => void;
    logout: () => void;
    isLoading: boolean;
    isAdmin: () => boolean;
    isInstructor: () => boolean;
    isApproved: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const storedToken = localStorage.getItem('token');
        const storedUser = localStorage.getItem('userInfo');

        if (storedToken && storedUser) {
            setToken(storedToken);
            setUser(JSON.parse(storedUser));
        }
        setIsLoading(false);
    }, []);

    const login = (newToken: string, userData: User) => {
        localStorage.setItem('token', newToken);
        localStorage.setItem('userInfo', JSON.stringify(userData));
        // Set cookie for middleware access (expires in 30 days)
        document.cookie = `token=${newToken}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;
        // Store role+status in cookies for middleware route protection
        document.cookie = `userRole=${userData.role}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;
        document.cookie = `accountStatus=${userData.accountStatus}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;
        setToken(newToken);
        setUser(userData);

        // Route based on status + role + mustChangePassword
        if (userData.accountStatus === 'suspended') {
            // Suspended users shouldn't be logged in, but if they reach here, clear and redirect to login
            logout();
        } else if (userData.role === 'admin') {
            router.push('/admin');
        } else if (userData.role === 'instructor') {
            if (userData.mustChangePassword) {
                router.push('/instructor/change-password');
            } else {
                router.push('/instructor');
            }
        } else {
            router.push('/dashboard');
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('userInfo');
        // Remove cookies
        document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
        document.cookie = 'userRole=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
        document.cookie = 'accountStatus=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
        setToken(null);
        setUser(null);
        router.push('/login');
    };

    const isAdmin = () => user?.role === 'admin';
    const isInstructor = () => user?.role === 'instructor';
    const isActive = () => user?.accountStatus === 'active';

    return (
        <AuthContext.Provider value={{ user, token, login, logout, isLoading, isAdmin, isInstructor, isApproved: isActive }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
