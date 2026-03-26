import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useTenant } from '../context/TenantContext';
import { showToast } from './ui/ToastNotification';
import { Calculator, Calendar, DollarSign, Download, Loader2, Save, FileText } from 'lucide-react';
import { generatePayslipPDF } from '../utils/pdfGenerator';

interface StaffMember {
    id: string;
    full_name: string;
    base_salary: number;
    commission_rate: number;
}

interface PayrollRun {
    id: string;
    staff_id: string;
    period_start: string;
    period_end: string;
    base_salary_allocated: number;
    total_commission: number;
    total_tips: number;
    deductions: number;
    net_payout: number;
    status: string;
    created_at: string;
    staff?: StaffMember;
}

export const PayrollRunsView: React.FC = () => {
    const { tenantId, salonName } = useTenant();
    const [staff, setStaff] = useState<StaffMember[]>([]);
    const [selectedStaffId, setSelectedStaffId] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [loading, setLoading] = useState(false);
    const [calculating, setCalculating] = useState(false);
    const [saving, setSaving] = useState(false);
    const [history, setHistory] = useState<PayrollRun[]>([]);

    // Calculation Results
    const [result, setResult] = useState<{
        base_salary: number;
        commission: number;
        tips: number;
        deductions: number;
        net_payout: number;
        bookings_count: number;
        total_revenue: number;
    } | null>(null);

    useEffect(() => {
        if (!tenantId) return;
        
        // Auto-select dates (First day of current month to today)
        const rootDate = new Date();
        const firstDay = new Date(rootDate.getFullYear(), rootDate.getMonth(), 1);
        setStartDate(firstDay.toISOString().split('T')[0]);
        setEndDate(rootDate.toISOString().split('T')[0]);

        fetchStaffAndHistory();
    }, [tenantId]);

    const fetchStaffAndHistory = async () => {
        setLoading(true);
        // Fetch staff
        const { data: staffData } = await supabase
            .from('staff')
            .select('id, full_name, base_salary, commission_rate')
            .eq('tenant_id', tenantId)
            .eq('is_active', true);
        
        if (staffData) setStaff(staffData);

        // Fetch payroll runs history
        const { data: historyData } = await supabase
            .from('payroll_runs')
            .select('*, staff:staff_id(full_name)')
            .eq('tenant_id', tenantId)
            .order('created_at', { ascending: false });

        if (historyData) setHistory(historyData);
        setLoading(false);
    };

    const handleCalculate = async () => {
        if (!tenantId || !selectedStaffId || !startDate || !endDate) {
            showToast('Please select staff and date range', 'error');
            return;
        }
        
        setCalculating(true);
        setResult(null);

        const s = staff.find(st => st.id === selectedStaffId);
        if (!s) return;

        try {
            // 1. Fetch completed bookings for staff
            const endOfDay = `${endDate}T23:59:59.999Z`;
            const { data: bookings } = await supabase
                .from('bookings')
                .select('id, total_price')
                .eq('tenant_id', tenantId)
                .eq('stylist_id', selectedStaffId)
                .eq('status', 'completed')
                .gte('start_time', startDate)
                .lte('start_time', endOfDay);

            const bookingIds = bookings?.map(b => b.id) || [];
            
            // 2. Fetch booking items to calculate exact commission
            let totalComm = 0;
            let totalRev = 0;
            if (bookingIds.length > 0) {
                const { data: items } = await supabase
                    .from('booking_items')
                    .select('price_snapshot')
                    .in('booking_id', bookingIds);
                
                if (items) {
                    items.forEach(item => {
                        totalRev += Number(item.price_snapshot || 0);
                        totalComm += Number(item.price_snapshot || 0) * (s.commission_rate / 100);
                    });
                }
            }

            // 3. Fetch Tips from Payments
            let totalTips = 0;
            if (bookingIds.length > 0) {
                const { data: payments } = await supabase
                    .from('payments')
                    .select('tip_amount')
                    .eq('tenant_id', tenantId)
                    .in('booking_id', bookingIds)
                    .eq('status', 'completed');
                    
                if (payments) {
                    payments.forEach(p => {
                        totalTips += Number(p.tip_amount || 0);
                    });
                }
            }

            // 4. Fetch Staff Deductions (Advances)
            let totalDeds = 0;
            const { data: advances } = await supabase
                .from('staff_payments')
                .select('amount')
                .eq('tenant_id', tenantId)
                .eq('staff_id', selectedStaffId)
                .in('payment_type', ['advance', 'deduction'])
                .gte('payment_date', startDate)
                .lte('payment_date', endOfDay);
                
            if (advances) {
                advances.forEach(a => {
                    totalDeds += Number(a.amount || 0);
                });
            }

            // Base Salary logic (assume monthly salary divided by 30 days)
            const d1 = new Date(startDate);
            const d2 = new Date(endDate);
            const diffTime = Math.abs(d2.getTime() - d1.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
            
            let baseAlloc = 0;
            if (s.base_salary > 0) {
                baseAlloc = (s.base_salary / 30) * diffDays;
            }

            setResult({
                base_salary: baseAlloc,
                commission: totalComm,
                tips: totalTips,
                deductions: totalDeds,
                net_payout: baseAlloc + totalComm + totalTips - totalDeds,
                bookings_count: bookingIds.length,
                total_revenue: totalRev
            });
        } catch (err: any) {
            showToast(err.message, 'error');
        }
        setCalculating(false);
    };

    const handleSaveRun = async () => {
        if (!tenantId || !selectedStaffId || !result) return;
        setSaving(true);
        
        try {
            const { error } = await supabase.from('payroll_runs').insert({
                tenant_id: tenantId,
                staff_id: selectedStaffId,
                period_start: startDate,
                period_end: endDate,
                base_salary_allocated: result.base_salary,
                total_commission: result.commission,
                total_tips: result.tips,
                deductions: result.deductions,
                status: 'draft'
            });
            
            if (error) throw error;
            
            showToast('Payroll run saved successfully!', 'success');
            setResult(null);
            fetchStaffAndHistory();
        } catch (err: any) {
            showToast(err.message, 'error');
        }
        setSaving(false);
    };

    const downloadPDF = async (run: PayrollRun) => {
        try {
            generatePayslipPDF({ salonName: salonName || 'Voxali Salon', payrollRun: run });
            showToast('Payslip downloaded!', 'success');
        } catch(e) {
            console.error(e);
            showToast('Failed to generate PDF', 'error');
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Left Col: Calculator Form */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="glass-panel p-6 border border-white/5 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-luxe-gold/5 rounded-full blur-3xl" />
                        
                        <h3 className="text-lg font-bold flex items-center gap-2 mb-6">
                            <Calculator className="w-5 h-5 text-luxe-gold" />
                            Run Payroll
                        </h3>
                        
                        <div className="space-y-4 relative z-10">
                            <div>
                                <label className="block text-xs font-bold text-white/40 uppercase mb-2">Select Staff</label>
                                <select 
                                    value={selectedStaffId} 
                                    onChange={(e) => setSelectedStaffId(e.target.value)}
                                    title="Staff Member"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:border-luxe-gold/50 outline-none"
                                >
                                    <option value="">-- Choose Stylist --</option>
                                    {staff.map(s => (
                                        <option key={s.id} value={s.id}>{s.full_name}</option>
                                    ))}
                                </select>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-white/40 uppercase mb-2">Start Date</label>
                                    <input 
                                        type="date" 
                                        value={startDate} 
                                        onChange={(e) => setStartDate(e.target.value)}
                                        title="Start Date"
                                        className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white [color-scheme:dark]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-white/40 uppercase mb-2">End Date</label>
                                    <input 
                                        type="date" 
                                        value={endDate} 
                                        onChange={(e) => setEndDate(e.target.value)}
                                        title="End Date"
                                        className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white [color-scheme:dark]"
                                    />
                                </div>
                            </div>
                            
                            <button 
                                onClick={handleCalculate}
                                disabled={calculating || loading}
                                className="w-full mt-4 bg-gold-gradient text-luxe-obsidian font-bold py-3 rounded-xl shadow-lg shadow-luxe-gold/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {calculating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Calculator className="w-5 h-5" />}
                                CALCULATE 
                            </button>
                        </div>
                    </div>

                    {/* Calculation Results Card */}
                    {result && (
                        <div className="glass-panel border-luxe-gold/30 border-2 overflow-hidden animate-in slide-in-from-left-4">
                            <div className="bg-luxe-gold/10 p-4 border-b border-luxe-gold/20 flex gap-3 items-center">
                                <FileText className="w-5 h-5 text-luxe-gold" />
                                <div>
                                    <h4 className="font-bold">Draft Payslip</h4>
                                    <p className="text-xs text-white/60">Ready to save</p>
                                </div>
                            </div>
                            <div className="p-6 space-y-4">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-white/60">Base Salary Alloc.</span>
                                    <span className="font-bold">${result.base_salary.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-white/60">Commission </span>
                                    <span className="font-bold text-green-400">+ ${result.commission.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-white/60">Tips</span>
                                    <span className="font-bold text-green-400">+ ${result.tips.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-white/60">Deductions/Advances</span>
                                    <span className="font-bold text-red-400">- ${result.deductions.toFixed(2)}</span>
                                </div>
                                
                                <div className="pt-4 border-t border-white/10 flex justify-between items-end">
                                    <span className="text-white/40 uppercase text-xs font-bold tracking-widest">Net Payout</span>
                                    <span className="text-2xl font-black text-luxe-gold">${result.net_payout.toFixed(2)}</span>
                                </div>
                                
                                <button 
                                    onClick={handleSaveRun}
                                    disabled={saving}
                                    className="w-full mt-2 bg-white/5 border border-luxe-gold/50 text-luxe-gold font-bold py-2 rounded-xl hover:bg-luxe-gold/10 transition-all flex items-center justify-center gap-2"
                                >
                                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    SAVE PAYROLL RUN
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Col: History */}
                <div className="lg:col-span-2 space-y-4">
                    <h3 className="text-lg font-bold flex items-center gap-2 mb-2">
                        <Calendar className="w-5 h-5 text-luxe-gold" />
                        Payroll History
                    </h3>
                    
                    {loading ? (
                        <div className="h-48 flex items-center justify-center">
                            <Loader2 className="w-8 h-8 text-luxe-gold animate-spin" />
                        </div>
                    ) : history.length === 0 ? (
                        <div className="glass-panel p-10 flex flex-col items-center justify-center text-center opacity-50">
                            <DollarSign className="w-12 h-12 text-white/20 mb-3" />
                            <p className="font-bold">No payroll runs yet</p>
                            <p className="text-xs text-white/60 mt-1">Calculate and save a run to see it here.</p>
                        </div>
                    ) : (
                        <div className="glass-panel border border-white/5 overflow-hidden">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-white/5 bg-white/[0.02]">
                                        <th className="text-left px-6 py-4 text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Period</th>
                                        <th className="text-left px-6 py-4 text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Staff</th>
                                        <th className="text-right px-6 py-4 text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Net Payout</th>
                                        <th className="text-center px-6 py-4 text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Status</th>
                                        <th className="text-center px-6 py-4 text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {history.map(run => (
                                        <tr key={run.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-sm">{new Date(run.period_start).toLocaleDateString()} - {new Date(run.period_end).toLocaleDateString()}</div>
                                                <div className="text-[10px] text-white/40">Ran {new Date(run.created_at).toLocaleDateString()}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="font-bold">{run.staff?.full_name}</span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className="font-black text-luxe-gold">${Number(run.net_payout).toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`px-2 py-1 rounded-md text-[10px] font-bold ${
                                                    run.status === 'paid' ? 'bg-green-500/10 text-green-400' : 'bg-orange-500/10 text-orange-400'
                                                }`}>
                                                    {run.status.toUpperCase()}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <button 
                                                    onClick={() => downloadPDF(run)}
                                                    className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-white/60 hover:text-white transition-all"
                                                    title="Download Payslip"
                                                >
                                                    <Download className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};
