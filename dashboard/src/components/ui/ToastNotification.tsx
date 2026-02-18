import React, { useState, useEffect, useCallback } from 'react';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';

type ToastVariant = 'success' | 'error' | 'info';

interface Toast {
    id: number;
    message: string;
    variant: ToastVariant;
    exiting?: boolean;
}

let toastIdCounter = 0;
let globalAddToast: ((message: string, variant?: ToastVariant) => void) | null = null;

/** Call this from anywhere to show a toast */
export function showToast(message: string, variant: ToastVariant = 'success') {
    globalAddToast?.(message, variant);
}

const variantConfig: Record<ToastVariant, {
    icon: React.ElementType;
    border: string;
    bg: string;
    text: string;
    glow: string;
    iconColor: string;
}> = {
    success: {
        icon: CheckCircle2,
        border: 'border-luxe-gold/30',
        bg: 'bg-luxe-obsidian/90',
        text: 'text-white',
        glow: 'shadow-[0_0_30px_rgba(212,175,55,0.15)]',
        iconColor: 'text-luxe-gold',
    },
    error: {
        icon: XCircle,
        border: 'border-red-500/30',
        bg: 'bg-luxe-obsidian/90',
        text: 'text-white',
        glow: 'shadow-[0_0_30px_rgba(239,68,68,0.15)]',
        iconColor: 'text-red-400',
    },
    info: {
        icon: Info,
        border: 'border-blue-500/30',
        bg: 'bg-luxe-obsidian/90',
        text: 'text-white',
        glow: 'shadow-[0_0_30px_rgba(96,165,250,0.15)]',
        iconColor: 'text-blue-400',
    },
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const addToast = useCallback((message: string, variant: ToastVariant = 'success') => {
        const id = ++toastIdCounter;
        setToasts(prev => [...prev.slice(-4), { id, message, variant }]);

        // Auto dismiss after 3s
        setTimeout(() => {
            setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
            setTimeout(() => {
                setToasts(prev => prev.filter(t => t.id !== id));
            }, 300);
        }, 3000);
    }, []);

    const dismiss = useCallback((id: number) => {
        setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 300);
    }, []);

    useEffect(() => {
        globalAddToast = addToast;
        return () => { globalAddToast = null; };
    }, [addToast]);

    return (
        <>
            {children}
            {/* Toast Container */}
            <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-3 pointer-events-none" style={{ maxWidth: 380 }}>
                {toasts.map(toast => {
                    const cfg = variantConfig[toast.variant];
                    const Icon = cfg.icon;
                    return (
                        <div
                            key={toast.id}
                            className={`
                                pointer-events-auto flex items-center gap-3 px-5 py-3.5 rounded-2xl border
                                backdrop-blur-xl ${cfg.bg} ${cfg.border} ${cfg.glow}
                                transition-all duration-300 ease-out
                                ${toast.exiting
                                    ? 'opacity-0 translate-x-8 scale-95'
                                    : 'opacity-100 translate-x-0 scale-100 animate-in slide-in-from-right-4'
                                }
                            `}
                        >
                            <Icon className={`w-5 h-5 flex-shrink-0 ${cfg.iconColor}`} />
                            <span className={`text-sm font-semibold flex-1 ${cfg.text}`}>{toast.message}</span>
                            <button
                                onClick={() => dismiss(toast.id)}
                                className="p-1 rounded-lg hover:bg-white/10 transition-colors flex-shrink-0"
                            >
                                <X className="w-3.5 h-3.5 text-white/40" />
                            </button>
                        </div>
                    );
                })}
            </div>
        </>
    );
};
