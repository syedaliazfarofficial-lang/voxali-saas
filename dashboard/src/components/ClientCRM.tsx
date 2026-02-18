import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    Users, Search, Plus, CreditCard, Calendar, DollarSign,
    MoreHorizontal, Mail, Phone, Tag, Loader2, X, Edit3,
    Trash2, Download, FileText
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { TENANT_ID } from '../config/constants';
import { showToast } from './ui/ToastNotification';
import { ConfirmModal } from './ui/ConfirmModal';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Client {
    id: string; name: string; phone: string; email: string | null;
    total_visits: number; total_spend: number; created_at: string;
}

export const ClientCRM: React.FC = () => {
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [formName, setFormName] = useState('');
    const [formPhone, setFormPhone] = useState('');
    const [formEmail, setFormEmail] = useState('');

    // Edit state
    const [editingClient, setEditingClient] = useState<Client | null>(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editName, setEditName] = useState('');
    const [editPhone, setEditPhone] = useState('');
    const [editEmail, setEditEmail] = useState('');

    // Dropdown & delete state
    const [openMenu, setOpenMenu] = useState<string | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<Client | null>(null);
    const [deleting, setDeleting] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    const fetchClients = useCallback(async () => {
        if (!TENANT_ID) return;
        setLoading(true);

        const { data } = await supabase
            .from('clients')
            .select('id, name, phone, email, created_at')
            .eq('tenant_id', TENANT_ID)
            .order('created_at', { ascending: false });

        if (data) {
            const enriched = await Promise.all(data.map(async (c: any) => {
                const { count } = await supabase
                    .from('bookings')
                    .select('*', { count: 'exact', head: true })
                    .eq('client_id', c.id)
                    .eq('status', 'completed');

                const { data: spendData } = await supabase
                    .from('bookings')
                    .select('total_price')
                    .eq('client_id', c.id)
                    .in('status', ['completed', 'confirmed']);

                const totalSpend = spendData?.reduce((sum: number, b: any) => sum + (b.total_price || 0), 0) || 0;
                return { ...c, total_visits: count || 0, total_spend: totalSpend };
            }));
            setClients(enriched);
        }
        setLoading(false);
    }, []);

    useEffect(() => { fetchClients(); }, [fetchClients]);

    // Close menu on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setOpenMenu(null);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const handleAddClient = async () => {
        if (!formName || !formPhone) return;
        setSaving(true);

        const { error } = await supabase
            .from('clients')
            .insert({ tenant_id: TENANT_ID, name: formName, phone: formPhone, email: formEmail || null })
            .select('id')
            .single();

        if (!error) {
            showToast('Client added successfully');
            setShowModal(false);
            setFormName(''); setFormPhone(''); setFormEmail('');
            fetchClients();
        } else {
            showToast(error.message, 'error');
        }
        setSaving(false);
    };

    // -- Edit --
    const openEdit = (client: Client) => {
        setEditingClient(client);
        setEditName(client.name);
        setEditPhone(client.phone);
        setEditEmail(client.email || '');
        setShowEditModal(true);
        setOpenMenu(null);
    };

    const handleEditClient = async () => {
        if (!editingClient || !editName || !editPhone) return;
        setSaving(true);

        const { error } = await supabase
            .from('clients')
            .update({ name: editName, phone: editPhone, email: editEmail || null })
            .eq('id', editingClient.id);

        if (!error) {
            showToast('Client updated');
            setShowEditModal(false);
            setEditingClient(null);
            fetchClients();
        } else {
            showToast(error.message, 'error');
        }
        setSaving(false);
    };

    // -- Delete --
    const handleDeleteClient = async () => {
        if (!deleteTarget) return;
        setDeleting(true);

        const { error } = await supabase
            .from('clients')
            .delete()
            .eq('id', deleteTarget.id);

        if (!error) {
            showToast(`${deleteTarget.name} deleted`);
            setDeleteTarget(null);
            fetchClients();
        } else {
            showToast(error.message, 'error');
        }
        setDeleting(false);
    };

    // -- Export PDF --
    const exportPDF = () => {
        const doc = new jsPDF();

        // Title
        doc.setFontSize(20);
        doc.setTextColor(40, 40, 40);
        doc.text('Client Report', 14, 22);

        doc.setFontSize(10);
        doc.setTextColor(130, 130, 130);
        doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 30);
        doc.text(`Total Clients: ${filtered.length}`, 14, 36);

        // Table
        autoTable(doc, {
            startY: 44,
            head: [['Name', 'Phone', 'Email', 'Visits', 'Lifetime Spend']],
            body: filtered.map(c => [
                c.name,
                c.phone,
                c.email || '—',
                String(c.total_visits),
                `$${c.total_spend.toLocaleString()}`,
            ]),
            headStyles: {
                fillColor: [212, 175, 55],
                textColor: [20, 20, 20],
                fontStyle: 'bold',
                fontSize: 9,
            },
            bodyStyles: { fontSize: 9 },
            alternateRowStyles: { fillColor: [248, 248, 248] },
            margin: { left: 14, right: 14 },
        });

        doc.save('client-report.pdf');
        showToast('PDF exported!');
    };

    const filtered = clients.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.phone.includes(search) ||
        (c.email || '').toLowerCase().includes(search.toLowerCase())
    );

    const totalClients = clients.length;
    const avgSpend = clients.length ? (clients.reduce((s, c) => s + c.total_spend, 0) / clients.length) : 0;
    const newThisMonth = clients.filter(c => {
        const d = new Date(c.created_at);
        const now = new Date();
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;

    if (loading) {
        return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 text-luxe-gold animate-spin" /></div>;
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-luxe-gold/10 rounded-2xl border border-luxe-gold/20">
                        <Users className="w-6 h-6 text-luxe-gold" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold">Client Database</h3>
                        <p className="text-xs text-white/40 uppercase tracking-widest">360° Management View</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                        <input
                            type="text" placeholder="Search clients..." value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs outline-none focus:border-luxe-gold/50 w-64"
                        />
                    </div>
                    <button
                        onClick={exportPDF}
                        className="px-4 py-2 rounded-xl border border-white/10 text-white/60 hover:text-luxe-gold hover:border-luxe-gold/30 transition-all flex items-center gap-2 text-xs font-bold"
                    >
                        <FileText className="w-4 h-4" /> EXPORT PDF
                    </button>
                    <button
                        onClick={() => setShowModal(true)}
                        className="bg-gold-gradient text-luxe-obsidian px-6 py-2 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-luxe-gold/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                    >
                        <Plus className="w-5 h-5" />
                        ADD CLIENT
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <SummaryItem label="Total Clients" value={String(totalClients)} trend={`+${newThisMonth} this month`} />
                <SummaryItem label="Avg. Lifetime Value" value={`$${avgSpend.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} trend="Per client" />
                <SummaryItem label="New This Month" value={String(newThisMonth)} trend="Active growth" />
            </div>

            {/* Client Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filtered.map(client => {
                    const isNew = new Date(client.created_at).getTime() > Date.now() - 7 * 24 * 3600 * 1000;
                    const isVip = client.total_spend > 1000;
                    return (
                        <div key={client.id} className="glass-panel p-6 group hover:gold-border duration-300 transition-all relative overflow-visible flex flex-col h-full">
                            <div className="flex justify-between items-start mb-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center text-xl font-black text-luxe-gold group-hover:bg-luxe-gold/10 transition-colors">
                                        {client.name.charAt(0)}
                                    </div>
                                    <div>
                                        <h4 className="font-bold tracking-tight">{client.name}</h4>
                                        <p className="text-xs text-white/40 flex items-center gap-1.5 mt-0.5">
                                            <Phone className="w-3 h-3" /> {client.phone}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    {isVip && (
                                        <span className="text-[9px] font-black uppercase tracking-widest bg-luxe-gold/20 text-luxe-gold px-2 py-1 rounded-full flex items-center gap-1">
                                            <Tag className="w-2 h-2" /> VIP
                                        </span>
                                    )}
                                    {isNew && (
                                        <span className="text-[9px] font-black uppercase tracking-widest bg-blue-500/20 text-blue-400 px-2 py-1 rounded-full">NEW</span>
                                    )}
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div className="p-3 bg-white/5 rounded-xl border border-white/5 group-hover:bg-white/10 transition-colors">
                                    <p className="text-[9px] text-white/30 uppercase font-black tracking-widest mb-1">Lifetime</p>
                                    <p className="text-sm font-bold text-green-400">${client.total_spend.toLocaleString()}</p>
                                </div>
                                <div className="p-3 bg-white/5 rounded-xl border border-white/5 group-hover:bg-white/10 transition-colors">
                                    <p className="text-[9px] text-white/30 uppercase font-black tracking-widest mb-1">Visits</p>
                                    <p className="text-sm font-bold">{client.total_visits} times</p>
                                </div>
                            </div>
                            <div className="mt-auto pt-6 border-t border-white/5 flex items-center justify-between">
                                <p className="text-[10px] text-white/30">
                                    {client.email || 'No email'}
                                </p>
                                {/* 3-dots Dropdown */}
                                <div className="relative" ref={openMenu === client.id ? menuRef : undefined}>
                                    <button
                                        onClick={() => setOpenMenu(openMenu === client.id ? null : client.id)}
                                        className="p-2 bg-white/5 rounded-xl hover:bg-white/10 transition-all"
                                    >
                                        <MoreHorizontal className="w-4 h-4" />
                                    </button>
                                    {openMenu === client.id && (
                                        <div className="absolute right-0 bottom-full mb-2 w-48 bg-luxe-obsidian border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
                                            <button
                                                onClick={() => openEdit(client)}
                                                className="w-full px-4 py-3 text-left text-sm flex items-center gap-3 hover:bg-white/5 transition-colors"
                                            >
                                                <Edit3 className="w-4 h-4 text-luxe-gold" /> Edit Client
                                            </button>
                                            <button
                                                onClick={() => { setDeleteTarget(client); setOpenMenu(null); }}
                                                className="w-full px-4 py-3 text-left text-sm flex items-center gap-3 hover:bg-red-500/10 text-red-400 transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" /> Delete Client
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {filtered.length === 0 && !loading && (
                <div className="glass-panel p-16 flex flex-col items-center justify-center text-center">
                    <Users className="w-12 h-12 text-white/10 mb-4" />
                    <h4 className="font-bold text-lg text-white/50">No clients found</h4>
                    <p className="text-white/30 text-sm mt-1">Try a different search or add a new client.</p>
                </div>
            )}

            {/* Add Client Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
                    <div className="bg-luxe-obsidian border border-white/10 rounded-2xl p-8 w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold flex items-center gap-2">
                                <Plus className="w-6 h-6 text-luxe-gold" />
                                Add New Client
                            </h3>
                            <button onClick={() => setShowModal(false)} className="p-2 hover:bg-white/10 rounded-xl transition-all">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 block">Full Name *</label>
                                <input value={formName} onChange={e => setFormName(e.target.value)} placeholder="Jessica Martinez"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-luxe-gold/50 transition-all" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 block">Phone *</label>
                                <input value={formPhone} onChange={e => setFormPhone(e.target.value)} placeholder="+1 555-0101"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-luxe-gold/50 transition-all" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 block">Email (optional)</label>
                                <input value={formEmail} onChange={e => setFormEmail(e.target.value)} placeholder="jessica@email.com"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-luxe-gold/50 transition-all" />
                            </div>
                        </div>
                        <button
                            onClick={handleAddClient}
                            disabled={saving || !formName || !formPhone}
                            className="w-full mt-6 bg-gold-gradient text-luxe-obsidian font-bold py-3 rounded-xl shadow-lg shadow-luxe-gold/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                            {saving ? 'ADDING...' : 'ADD CLIENT'}
                        </button>
                    </div>
                </div>
            )}

            {/* Edit Client Modal */}
            {showEditModal && editingClient && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowEditModal(false)}>
                    <div className="bg-luxe-obsidian border border-white/10 rounded-2xl p-8 w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold flex items-center gap-2">
                                <Edit3 className="w-6 h-6 text-luxe-gold" />
                                Edit Client
                            </h3>
                            <button onClick={() => setShowEditModal(false)} className="p-2 hover:bg-white/10 rounded-xl transition-all">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 block">Full Name *</label>
                                <input value={editName} onChange={e => setEditName(e.target.value)} placeholder="Jessica Martinez"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-luxe-gold/50 transition-all" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 block">Phone *</label>
                                <input value={editPhone} onChange={e => setEditPhone(e.target.value)} placeholder="+1 555-0101"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-luxe-gold/50 transition-all" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 block">Email (optional)</label>
                                <input value={editEmail} onChange={e => setEditEmail(e.target.value)} placeholder="jessica@email.com"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-luxe-gold/50 transition-all" />
                            </div>
                        </div>
                        <button
                            onClick={handleEditClient}
                            disabled={saving || !editName || !editPhone}
                            className="w-full mt-6 bg-gold-gradient text-luxe-obsidian font-bold py-3 rounded-xl shadow-lg shadow-luxe-gold/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Edit3 className="w-5 h-5" />}
                            {saving ? 'SAVING...' : 'UPDATE CLIENT'}
                        </button>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            <ConfirmModal
                open={!!deleteTarget}
                title="Delete Client"
                message={`Are you sure you want to delete ${deleteTarget?.name}? This action cannot be undone. All associated booking history will remain.`}
                confirmLabel="Delete"
                danger
                loading={deleting}
                onConfirm={handleDeleteClient}
                onCancel={() => setDeleteTarget(null)}
            />
        </div>
    );
};

const SummaryItem: React.FC<{ label: string; value: string; trend: string }> = ({ label, value, trend }) => (
    <div className="glass-panel p-6 border-b-2 border-transparent hover:border-luxe-gold/30 transition-all">
        <p className="text-white/40 text-xs font-black uppercase tracking-[0.2em] mb-2">{label}</p>
        <div className="flex items-end justify-between">
            <h3 className="text-2xl font-black">{value}</h3>
            <span className="text-[10px] font-bold text-luxe-gold bg-luxe-gold/10 px-2 py-1 rounded">{trend}</span>
        </div>
    </div>
);
