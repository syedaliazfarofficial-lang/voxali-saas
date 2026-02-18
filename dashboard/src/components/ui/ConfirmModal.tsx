import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
    open: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    danger?: boolean;
    loading?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
    open,
    title,
    message,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    danger = false,
    loading = false,
    onConfirm,
    onCancel,
}) => {
    if (!open) return null;

    return (
        <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998] flex items-center justify-center p-4"
            onClick={onCancel}
        >
            <div
                className="bg-luxe-obsidian border border-white/10 rounded-2xl p-8 w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95 duration-200"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-start gap-4 mb-6">
                    {danger && (
                        <div className="p-3 bg-red-500/10 rounded-2xl border border-red-500/20 flex-shrink-0">
                            <AlertTriangle className="w-6 h-6 text-red-400" />
                        </div>
                    )}
                    <div className="flex-1">
                        <h3 className="text-lg font-bold mb-1">{title}</h3>
                        <p className="text-sm text-white/50 leading-relaxed">{message}</p>
                    </div>
                    <button
                        onClick={onCancel}
                        className="p-2 hover:bg-white/10 rounded-xl transition-all flex-shrink-0"
                    >
                        <X className="w-5 h-5 text-white/40" />
                    </button>
                </div>
                <div className="flex items-center gap-3 justify-end">
                    <button
                        onClick={onCancel}
                        className="px-6 py-2.5 rounded-xl border border-white/10 text-white/60 hover:text-white hover:bg-white/5 transition-all text-sm font-bold"
                    >
                        {cancelLabel}
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={loading}
                        className={`px-6 py-2.5 rounded-xl font-bold text-sm shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ${danger
                                ? 'bg-red-500 text-white shadow-red-500/20 hover:bg-red-600'
                                : 'bg-gold-gradient text-luxe-obsidian shadow-luxe-gold/20'
                            }`}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
};
