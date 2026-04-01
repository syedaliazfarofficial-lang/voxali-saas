import React, { useState, useEffect } from 'react';
import { Gift, Plus, Search, Tag, Copy, CheckCircle2, MoreHorizontal, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useTenant } from '../context/TenantContext';
import { showToast } from './ui/ToastNotification';
import { Skeleton } from './ui/Skeleton';

interface GiftCard {
    id: string;
    code: string;
    initial_value: number;
    current_balance: number;
    status: string;
    recipient_email?: string;
    created_at: string;
}

export const GiftCardsTab: React.FC = () => {
    const { tenantId } = useTenant();
    const [giftCards, setGiftCards] = useState<GiftCard[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [saving, setSaving] = useState(false);
    
    const [newAmount, setNewAmount] = useState('');
    const [newEmail, setNewEmail] = useState('');

    const generateCode = () => {
        // Generate a random code like VXL-A8B9-3X2F
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = 'VXL-';
        for(let i=0; i<4; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
        code += '-';
        for(let i=0; i<4; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
        return code;
    };

    const fetchGiftCards = async () => {
        if (!tenantId) return;
        setLoading(true);
        const { data } = await supabase
            .from('gift_cards')
            .select('*')
            .eq('tenant_id', tenantId)
            .order('created_at', { ascending: false });
        if (data) setGiftCards(data);
        setLoading(false);
    };

    useEffect(() => { fetchGiftCards(); }, [tenantId]);

    const handleCreateGiftCard = async () => {
        if (!tenantId || !newAmount) {
            showToast('Please enter an initial value', 'error');
            return;
        }

        setSaving(true);
        const code = generateCode();
        const value = parseFloat(newAmount);

        const { error } = await supabase.from('gift_cards').insert({
            tenant_id: tenantId,
            code: code,
            initial_value: value,
            current_balance: value,
            recipient_email: newEmail || null,
            status: 'active'
        });

        if (!error) {
            showToast('Gift Card Created Successfully!', 'success');
            setShowModal(false);
            setNewAmount('');
            setNewEmail('');
            fetchGiftCards();
            
            // Auto copy to clipboard
            navigator.clipboard.writeText(code);
            showToast('Code copied to clipboard: ' + code, 'success');
        } else {
            showToast('Error: ' + error.message, 'error');
        }
        setSaving(false);
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-center mb-4 border-b border-white/5 pb-4">
                <div>
                    <h3 className="font-bold text-xl text-white flex items-center gap-2"><Gift className="w-5 h-5 text-purple-400" /> Gift Cards</h3>
                    <p className="text-xs text-white/40 mt-1">Generate and track digital gift cards for your clients.</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="bg-purple-500/20 text-purple-400 border border-purple-500/30 px-5 py-2.5 rounded-xl text-xs font-bold shadow-lg hover:bg-purple-500/30 transition-all flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" /> GENERATE NEW CARD
                </button>
            </div>

            {loading ? (
                <div className="space-y-2">
                     <Skeleton className="h-12 w-full rounded" />
                     <Skeleton className="h-12 w-full rounded" />
                </div>
            ) : (
                <div className="bg-[#121212] border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-[#1A1A1A] text-xs uppercase tracking-wider text-white/50 border-b border-white/10">
                            <tr>
                                <th className="px-6 py-4 font-bold">Code</th>
                                <th className="px-6 py-4 font-bold">Initial / Balance</th>
                                <th className="px-6 py-4 font-bold">Recipient</th>
                                <th className="px-6 py-4 font-bold text-center">Status</th>
                                <th className="px-6 py-4 font-bold text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {giftCards.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-white/40">No gift cards generated yet.</td>
                                </tr>
                            ) : (
                                giftCards.map(gc => (
                                    <tr key={gc.id} className="hover:bg-white/[0.02] transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono font-bold text-white tracking-widest">{gc.code}</span>
                                                <button onClick={() => { navigator.clipboard.writeText(gc.code); showToast('Copied!', 'success'); }} className="text-white/30 hover:text-white transition-colors"><Copy className="w-3 h-3" /></button>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-xs text-white/40 line-through">${gc.initial_value}</div>
                                            <div className="font-black text-purple-400 text-lg">${gc.current_balance}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-white/70 text-sm">{gc.recipient_email || <span className="text-white/20 italic">Over-the-counter</span>}</div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase tracking-widest \${gc.status === 'active' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' : 'bg-white/5 text-white/40'}`}>
                                                {gc.current_balance <= 0 ? 'DEPLETED' : gc.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button className="text-white/40 hover:text-white p-2 transition-colors"><MoreHorizontal className="w-4 h-4" /></button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Generate Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowModal(false)} />
                    <div className="bg-[#121212] border border-white/10 rounded-2xl w-full max-w-md relative shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between p-6 border-b border-white/10 bg-[#1A1A1A]">
                            <h3 className="text-xl font-bold flex items-center gap-2"><Gift className="w-5 h-5 text-purple-400" /> Issue Gift Card</h3>
                            <button onClick={() => setShowModal(false)} className="text-white/40 hover:text-white"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-6 space-y-5">
                            <div>
                                <label className="block text-xs font-bold text-white/50 uppercase tracking-wider mb-2">Card Amount ($) *</label>
                                <input 
                                    type="number" value={newAmount} onChange={e => setNewAmount(e.target.value)}
                                    placeholder="e.g. 100" 
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-purple-400 text-xl font-bold font-mono"
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-white/50 uppercase tracking-wider mb-2">Recipient Email (Optional)</label>
                                <input 
                                    type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)}
                                    placeholder="client@example.com" 
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-purple-400"
                                />
                                <p className="text-[10px] text-white/30 mt-2">If provided, we will automatically email them the digital card code.</p>
                            </div>
                            
                            <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-xl flex items-center gap-3">
                                <CheckCircle2 className="w-5 h-5 text-purple-400" />
                                <p className="text-xs text-purple-200/70">A secure 12-character code will be automatically generated upon creation.</p>
                            </div>
                        </div>
                        <div className="p-6 border-t border-white/10 bg-[#1A1A1A] flex justify-end gap-3">
                            <button onClick={() => setShowModal(false)} className="px-6 py-2.5 rounded-xl font-bold text-white/60 hover:text-white transition-colors">Cancel</button>
                            <button onClick={handleCreateGiftCard} disabled={saving} className="bg-purple-500 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-purple-400 disabled:opacity-50 transition-colors flex items-center gap-2">
                                {saving ? "Generating..." : "Generate Code"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
