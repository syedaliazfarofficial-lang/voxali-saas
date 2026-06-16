import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    Users, Search, Plus, CreditCard, Calendar, DollarSign,
    MoreHorizontal, Mail, Phone, Tag, Loader2, X, Edit3,
    Trash2, Download, FileText, Upload
} from 'lucide-react';
import { supabase, supabaseAdmin } from '../lib/supabase';
import { useTenant } from '../context/TenantContext';
import { showToast } from './ui/ToastNotification';
import { ConfirmModal } from './ui/ConfirmModal';
import { ClientProfileModal } from './ClientProfileModal';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Skeleton } from './ui/Skeleton';

interface Client {
    id: string; name: string; phone: string; email: string | null;
    total_visits: number; total_spend: number; created_at: string;
    notes?: string | null; tags?: string[] | null;
    loyalty_points: number;
}

export const ClientCRM: React.FC = () => {
    const [clients, setClients] = useState<Client[]>([]);
    const { tenantId } = useTenant();
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
    const [editNotes, setEditNotes] = useState('');
    const [editTags, setEditTags] = useState('');

    // Profile Modal
    const [profileClientId, setProfileClientId] = useState<string | null>(null);

    // Dropdown & delete state
    const [openMenu, setOpenMenu] = useState<string | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<Client | null>(null);
    const [deleting, setDeleting] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [importing, setImporting] = useState(false);

    // Actions Menu (3-dots) state
    const [showActionsMenu, setShowActionsMenu] = useState(false);
    const actionsMenuRef = useRef<HTMLDivElement>(null);

    const fetchClients = useCallback(async () => {
        if (!tenantId) return;
        setLoading(true);

        const { data } = await supabase
            .from('clients')
            .select('id, name, phone, email, notes, tags, created_at, loyalty_points')
            .eq('tenant_id', tenantId)
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
            if (actionsMenuRef.current && !actionsMenuRef.current.contains(e.target as Node)) {
                setShowActionsMenu(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !tenantId) return;

        setImporting(true);
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const text = event.target?.result as string;
                // Basic CSV parsing splitting by newlines and commas
                const rows = text.split('\n').map(row => row.split(',').map(col => col.trim().replace(/^"|"$/g, '')));
                
                if (rows.length < 2) {
                    showToast('CSV is empty or invalid.', 'error');
                    setImporting(false);
                    return;
                }

                // Header mapping
                const header = rows[0].map(h => h.toLowerCase());
                const nameIdx = header.findIndex(h => h.includes('name') || h === 'client');
                const phoneIdx = header.findIndex(h => h.includes('phone') || h === 'contact');
                const emailIdx = header.findIndex(h => h.includes('email'));

                if (nameIdx === -1 || phoneIdx === -1) {
                    showToast('CSV MUST contain "Name" and "Phone" columns.', 'error');
                    setImporting(false);
                    return;
                }

                const validRows = rows.slice(1).filter(r => r.length > Math.max(nameIdx, phoneIdx) && r[nameIdx] && r[phoneIdx]);
                let successCount = 0;

                // Process sequentially to be safe with Supabase limits
                for (const row of validRows) {
                    const name = row[nameIdx];
                    let phone = row[phoneIdx];
                    const email = emailIdx !== -1 ? row[emailIdx] : null;

                    // Ensure phone has + prefix if missing but looks like it needs one
                    if (phone && !phone.startsWith('+')) {
                        // Very naive approach - user should provide country codes in CSV
                        // phone = '+' + phone.replace(/\D/g, ''); 
                    }

                    const { error } = await supabase
                        .from('clients')
                        .insert({ tenant_id: tenantId, name, phone, email: email || null });
                    
                    if (!error) successCount++;
                }

                showToast(`Successfully imported ${successCount} clients!`, 'success');
                fetchClients();
            } catch (err) {
                console.error(err);
                showToast('Failed to parse CSV file.', 'error');
            } finally {
                setImporting(false);
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        };
        reader.readAsText(file);
    };

    const handleAddClient = async () => {
        if (!formName || !formPhone) return;
        setSaving(true);

        const { error } = await supabase
            .from('clients')
            .insert({ tenant_id: tenantId, name: formName, phone: formPhone, email: formEmail || null })
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
        setEditNotes(client.notes || '');
        setEditTags(client.tags ? client.tags.join(', ') : '');
        setShowEditModal(true);
        setOpenMenu(null);
    };

    const handleEditClient = async () => {
        if (!editingClient || !editName || !editPhone) return;
        setSaving(true);

        const tagsArray = editTags.split(',').map(t => t.trim()).filter(t => t.length > 0);

        const { error } = await supabase
            .from('clients')
            .update({ 
                name: editName, 
                phone: editPhone, 
                email: editEmail || null,
                notes: editNotes || null,
                tags: tagsArray.length > 0 ? tagsArray : null
            })
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



    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex items-center justify-between gap-4 border-b border-white/5 pb-4 mb-4">
                {/* Left Side: Icon + Title + Unified Capsule Inline */}
                <div className="flex items-center gap-4 flex-nowrap min-w-0">
                    <div className="flex items-center gap-2.5 flex-shrink-0">
                        <div className="p-2 bg-luxe-gold/10 rounded-xl border border-luxe-gold/20">
                            <Users className="w-5 h-5 text-luxe-gold" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold whitespace-nowrap text-white">Client Database</h3>
                            <p className="text-[9px] text-white/40 uppercase tracking-widest whitespace-nowrap">360° View</p>
                        </div>
                    </div>
                    
                    {/* Unified Premium Stats Capsule */}
                    {loading ? (
                        <div className="h-8 w-60 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 flex items-center justify-center flex-shrink-0">
                            <Skeleton variant="text" width="80%" height={10} />
                        </div>
                    ) : (
                        <div className="flex items-center gap-3.5 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 text-xs text-white/50 flex-shrink-0">
                            <div className="flex items-center gap-1.5">
                                <span className="text-[9px] text-white/40 uppercase font-black tracking-wider">Clients</span>
                                <span className="font-bold text-white">{totalClients}</span>
                                <span className="text-[9px] text-emerald-400 font-bold bg-emerald-400/10 px-1.5 py-0.5 rounded-full">+{newThisMonth}</span>
                            </div>
                            <div className="h-3 w-[1px] bg-white/10" />
                            <div className="flex items-center gap-1.5">
                                <span className="text-[9px] text-white/40 uppercase font-black tracking-wider">Avg Spend</span>
                                <span className="font-bold text-luxe-gold">${avgSpend.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                            </div>
                            <div className="h-3 w-[1px] bg-white/10" />
                            <div className="flex items-center gap-1.5">
                                <span className="text-[9px] text-white/40 uppercase font-black tracking-wider">New</span>
                                <span className="font-bold text-blue-400">{newThisMonth}</span>
                            </div>
                        </div>
                    )}
                </div>
                
                {/* Right Side: Search + Add Client + Action Menu */}
                <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="relative">
                        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                        <input
                            type="text" placeholder="Search clients..." value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="bg-white/5 border border-white/10 rounded-full pl-9 pr-4 py-1.5 text-xs outline-none focus:border-white/20 w-44 transition-all text-white placeholder-white/30"
                        />
                    </div>
                    
                    <button
                        onClick={() => setShowModal(true)}
                        className="bg-gold-gradient text-luxe-obsidian px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-1 hover:bg-white/90 active:scale-[0.98] transition-all whitespace-nowrap"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        ADD CLIENT
                    </button>

                    {/* More Actions Dropdown (3-dots) */}
                    <div className="relative" ref={actionsMenuRef}>
                        <button
                            onClick={() => setShowActionsMenu(!showActionsMenu)}
                            className="p-1.5 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-all flex items-center justify-center"
                        >
                            <MoreHorizontal className="w-4 h-4" />
                        </button>
                        
                        {showActionsMenu && (
                            <div className="absolute right-0 top-full mt-2 w-44 bg-luxe-obsidian border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
                                <button
                                    onClick={() => { setShowActionsMenu(false); fileInputRef.current?.click(); }}
                                    disabled={importing}
                                    className="w-full px-4 py-2.5 text-left text-xs flex items-center gap-2 hover:bg-white/5 text-white/80 transition-colors disabled:opacity-50"
                                >
                                    <Upload className="w-3.5 h-3.5 text-luxe-gold" /> Import CSV
                                </button>
                                <button
                                    onClick={() => { setShowActionsMenu(false); exportPDF(); }}
                                    className="w-full px-4 py-2.5 text-left text-xs flex items-center gap-2 hover:bg-white/5 text-white/80 transition-colors"
                                >
                                    <FileText className="w-3.5 h-3.5 text-luxe-gold" /> Export PDF
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Client Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {loading ? (
                    [1,2,3,4,5,6,7,8].map(i => (
                        <div key={i} className="glass-panel p-4">
                            <div className="flex items-center gap-3 mb-4">
                                <Skeleton variant="rect" width={44} height={44} className="rounded-xl" />
                                <div className="space-y-1.5 flex-1">
                                    <Skeleton variant="text" width="60%" />
                                    <Skeleton variant="text" width="80%" height={10} />
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-2 mb-4">
                                <Skeleton variant="rect" height={42} />
                                <Skeleton variant="rect" height={42} />
                                <Skeleton variant="rect" height={42} />
                            </div>
                            <Skeleton variant="text" width="50%" height={10} />
                        </div>
                    ))
                ) : filtered.map(client => {
                    const isNew = new Date(client.created_at).getTime() > Date.now() - 7 * 24 * 3600 * 1000;
                    const isVip = client.total_spend > 1000;
                    return (
                        <div 
                            key={client.id} 
                            onClick={() => setProfileClientId(client.id)}
                            className="glass-panel p-4 group hover:gold-border duration-300 transition-all relative overflow-visible flex flex-col h-full cursor-pointer"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-11 h-11 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-lg font-black text-luxe-gold group-hover:bg-luxe-gold/10 transition-colors flex-shrink-0">
                                        {client.name.charAt(0)}
                                    </div>
                                    <div className="min-w-0">
                                        <h4 className="font-bold tracking-tight text-sm truncate">{client.name}</h4>
                                        <p className="text-[11px] text-white/40 flex items-center gap-1.5 mt-0.5">
                                            <Phone className="w-3 h-3 flex-shrink-0" /> <span className="truncate">{client.phone}</span>
                                        </p>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                                    {isVip && (
                                        <span className="text-[8px] font-black uppercase tracking-widest bg-luxe-gold/20 text-luxe-gold px-1.5 py-0.5 rounded-full flex items-center gap-1">
                                            <Tag className="w-2 h-2" /> VIP
                                        </span>
                                    )}
                                    {isNew && (
                                        <span className="text-[8px] font-black uppercase tracking-widest bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded-full">NEW</span>
                                    )}
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-2 mb-4">
                                <div className="p-2 bg-white/5 rounded-lg border border-white/5 group-hover:bg-white/10 transition-colors text-center">
                                    <p className="text-[8px] text-white/30 uppercase font-black tracking-widest mb-0.5">Spent</p>
                                    <p className="text-xs font-bold text-green-400">${client.total_spend.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                                </div>
                                <div className="p-2 bg-white/5 rounded-lg border border-white/5 group-hover:bg-white/10 transition-colors text-center">
                                    <p className="text-[8px] text-white/30 uppercase font-black tracking-widest mb-0.5">Visits</p>
                                    <p className="text-xs font-bold text-white">{client.total_visits}</p>
                                </div>
                                <div className="p-2 bg-luxe-gold/5 rounded-lg border border-luxe-gold/10 group-hover:bg-luxe-gold/10 transition-colors text-center">
                                    <p className="text-[8px] text-luxe-gold/60 uppercase font-black tracking-widest mb-0.5">Points</p>
                                    <p className="text-xs font-black text-luxe-gold">{client.loyalty_points || 0}</p>
                                </div>
                            </div>

                            {/* Tags & Notes UI */}
                            {(client.tags && client.tags.length > 0) || client.notes ? (
                                <div className="mb-4 space-y-2">
                                    {client.tags && client.tags.length > 0 && (
                                        <div className="flex flex-wrap gap-1">
                                            {client.tags.map((tag, idx) => (
                                                <span key={idx} className="bg-luxe-gold/10 text-luxe-gold border border-luxe-gold/20 text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider">
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                    {client.notes && (
                                        <p className="text-xs text-white/50 bg-white/5 p-2 rounded-lg border border-white/5 italic line-clamp-2">
                                            "{client.notes}"
                                        </p>
                                    )}
                                </div>
                            ) : null}

                            <div className="mt-auto pt-3 border-t border-white/5 flex items-center justify-between">
                                <p className="text-[10px] text-white/30 truncate max-w-[80%]">
                                    {client.email || 'No email'}
                                </p>
                                {/* 3-dots Dropdown */}
                                <div className="relative flex-shrink-0" ref={openMenu === client.id ? menuRef : undefined}>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setOpenMenu(openMenu === client.id ? null : client.id); }}
                                        className="p-1.5 bg-white/5 rounded-lg hover:bg-white/10 transition-all"
                                    >
                                        <MoreHorizontal className="w-3.5 h-3.5" />
                                    </button>
                                    {openMenu === client.id && (
                                        <div className="absolute right-0 bottom-full mb-2 w-48 bg-luxe-obsidian border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); openEdit(client); }}
                                                className="w-full px-4 py-3 text-left text-sm flex items-center gap-3 hover:bg-white/5 transition-colors"
                                            >
                                                <Edit3 className="w-4 h-4 text-luxe-gold" /> Edit Client
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setDeleteTarget(client); setOpenMenu(null); }}
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
                            <div>
                                <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 block">Tags (Comma Separated)</label>
                                <input value={editTags} onChange={e => setEditTags(e.target.value)} placeholder="VIP, Needs Coffee, Allergy"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-luxe-gold/50 transition-all" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 block">Internal Notes</label>
                                <textarea value={editNotes} onChange={e => setEditNotes(e.target.value)} placeholder="Client preferences..."
                                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-luxe-gold/50 transition-all min-h-[80px]" />
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

            {/* Profile Modal */}
            <ClientProfileModal 
                clientId={profileClientId} 
                onClose={() => setProfileClientId(null)} 
            />
        </div>
    );
};

const SummaryItem: React.FC<{ label: string; value: string; trend: string }> = ({ label, value, trend }) => (
    <div className="glass-panel px-3 py-1.5 flex items-center gap-2.5 text-xs border border-white/5 hover:border-luxe-gold/20 transition-all rounded-xl">
        <div>
            <p className="text-white/40 text-[9px] font-bold uppercase tracking-wider leading-none mb-0.5">{label}</p>
            <h4 className="text-xs font-black text-white leading-none">{value}</h4>
        </div>
        <span className="text-[9px] font-bold text-luxe-gold bg-luxe-gold/10 px-1.5 py-0.5 rounded leading-none whitespace-nowrap">{trend}</span>
    </div>
);
