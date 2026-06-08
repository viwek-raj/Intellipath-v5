'use client';

import { useEffect, useRef, useState } from 'react';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

declare global {
    interface Window {
        google?: {
            accounts: {
                id: {
                    initialize: (config: any) => void;
                    renderButton: (element: HTMLElement, config: any) => void;
                    prompt: () => void;
                };
            };
        };
    }
}

interface GoogleSignInButtonProps {
    onError?: (message: string) => void;
}

export default function GoogleSignInButton({ onError }: GoogleSignInButtonProps) {
    const buttonRef = useRef<HTMLDivElement>(null);
    const { login } = useAuth();
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
        if (!clientId) {
            console.error('NEXT_PUBLIC_GOOGLE_CLIENT_ID is not set');
            return;
        }

        const handleCredentialResponse = async (response: any) => {
            setIsLoading(true);
            try {
                const { data } = await api.post('/auth/google', {
                    credential: response.credential,
                });
                login(data.token, data);
            } catch (err: any) {
                const message = err.response?.data?.message || 'Google sign-in failed';
                onError?.(message);
            } finally {
                setIsLoading(false);
            }
        };

        const initializeGoogle = () => {
            if (!window.google?.accounts?.id) return;

            window.google.accounts.id.initialize({
                client_id: clientId,
                callback: handleCredentialResponse,
                auto_select: false,
                cancel_on_tap_outside: true,
            });

            if (buttonRef.current) {
                window.google.accounts.id.renderButton(buttonRef.current, {
                    type: 'standard',
                    theme: 'outline',
                    size: 'large',
                    text: 'continue_with',
                    shape: 'rectangular',
                    width: '100%',
                    logo_alignment: 'left',
                });
            }
        };

        // Load the Google Identity Services script
        if (window.google?.accounts?.id) {
            initializeGoogle();
        } else {
            const script = document.createElement('script');
            script.src = 'https://accounts.google.com/gsi/client';
            script.async = true;
            script.defer = true;
            script.onload = initializeGoogle;
            document.head.appendChild(script);

            return () => {
                // Cleanup: only remove if it's still in the DOM
                if (script.parentNode) {
                    script.parentNode.removeChild(script);
                }
            };
        }
    }, [login, onError]);

    return (
        <div className="w-full">
            {isLoading && (
                <div className="flex items-center justify-center py-2.5">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
                    <span className="ml-2 text-sm text-gray-500">Signing in...</span>
                </div>
            )}
            <div
                ref={buttonRef}
                className={`flex justify-center ${isLoading ? 'hidden' : ''}`}
                style={{ colorScheme: 'auto' }}
            />
        </div>
    );
}
