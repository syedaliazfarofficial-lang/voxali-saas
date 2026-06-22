import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import autoTable from 'jspdf-autotable';

interface ReportData {
    salonName: string;
    dateRangeStr: string;
    totalRevenue: number;
    expenses: any[];
    staffPayments: any[];
    netProfit: number;
}

// -------------------------------------------------------------
// DESIGN SYSTEM DESIGN TOKENS (Obsidian & Luxe Gold)
// -------------------------------------------------------------
const GOLD_COLOR: [number, number, number] = [197, 168, 128];   // Muted Luxe Gold (#C5A880)
const DARK_SLATE: [number, number, number] = [17, 24, 39];      // Deep Slate (#111827)
const EMERALD: [number, number, number] = [16, 185, 129];        // Emerald Green (#10B981)
const CRIMSON: [number, number, number] = [239, 68, 68];         // Crimson Red (#EF4444)
const BORDER_GRAY: [number, number, number] = [226, 232, 240];  // Slate-200 (#E2E8F0)
const TEXT_DARK: [number, number, number] = [15, 23, 42];        // Slate-900 (#0F172A)
const TEXT_MUTED: [number, number, number] = [100, 116, 139];    // Slate-500 (#64748B)

// Helper to draw a top accent bar and elegant header
const drawPremiumHeader = (doc: jsPDF, title: string, salonName: string, dateRangeStr: string, logoBase64?: string | null) => {
    const pageWidth = doc.internal.pageSize.getWidth();

    // 1. Top gold accent bar
    doc.setFillColor(GOLD_COLOR[0], GOLD_COLOR[1], GOLD_COLOR[2]);
    doc.rect(0, 0, pageWidth, 5, 'F');

    // 2. Dark Slate Header background
    doc.setFillColor(DARK_SLATE[0], DARK_SLATE[1], DARK_SLATE[2]);
    doc.rect(0, 5, pageWidth, 110, 'F');

    // 3. Logo & Title Layout
    let textX = 40;
    if (logoBase64) {
        try {
            doc.addImage(logoBase64, 'PNG', 40, 25, 45, 45);
            textX = 100;
        } catch (e) {
            console.error('Logo draw error:', e);
        }
    }

    doc.setFontSize(22);
    doc.setTextColor(GOLD_COLOR[0], GOLD_COLOR[1], GOLD_COLOR[2]);
    doc.setFont('helvetica', 'bold');
    doc.text((salonName || 'Salon').toUpperCase(), textX, 52);

    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'normal');
    doc.text(title.toUpperCase(), textX, 74);

    doc.setFontSize(8.5);
    doc.setTextColor(156, 163, 175); // gray-400
    doc.text(`Period: ${dateRangeStr}  |  Generated: ${new Date().toLocaleString()}`, 40, 100);
};

// ==========================================
// 1. PROFIT & LOSS STATEMENT (P&L) PDF
// ==========================================
export const generatePnLPDF = ({
    salonName,
    dateRangeStr,
    totalRevenue,
    expenses,
    staffPayments,
    netProfit
}: ReportData) => {
    const doc = new jsPDF('p', 'pt', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    // Draw Header
    drawPremiumHeader(doc, 'Financial Performance & P&L Statement', salonName, dateRangeStr);
    
    // 3 Metrics Cards
    const cardWidth = (pageWidth - 110) / 3;
    const cardY = 140;
    
    // Card 1: Gross Revenue
    doc.setDrawColor(BORDER_GRAY[0], BORDER_GRAY[1], BORDER_GRAY[2]);
    doc.setFillColor(250, 250, 250);
    doc.rect(40, cardY, cardWidth, 65, 'FD');
    doc.setFillColor(GOLD_COLOR[0], GOLD_COLOR[1], GOLD_COLOR[2]);
    doc.rect(40, cardY, 3, 65, 'F');
    
    doc.setFontSize(8);
    doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
    doc.setFont('helvetica', 'bold');
    doc.text('GROSS REVENUE', 52, cardY + 22);
    doc.setFontSize(14);
    doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]);
    doc.text(`$${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 52, cardY + 48);
    
    // Card 2: Total Expenses
    const totalExp = expenses.reduce((s, e) => s + Number(e.amount), 0);
    const card2X = 40 + cardWidth + 15;
    doc.setFillColor(250, 250, 250);
    doc.rect(card2X, cardY, cardWidth, 65, 'FD');
    doc.setFillColor(CRIMSON[0], CRIMSON[1], CRIMSON[2]);
    doc.rect(card2X, cardY, 3, 65, 'F');
    
    doc.setFontSize(8);
    doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL EXPENSES', card2X + 12, cardY + 22);
    doc.setFontSize(14);
    doc.setTextColor(CRIMSON[0], CRIMSON[1], CRIMSON[2]);
    doc.text(`$${totalExp.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, card2X + 12, cardY + 48);
    
    // Card 3: Net Profit
    const card3X = card2X + cardWidth + 15;
    doc.setFillColor(250, 250, 250);
    doc.rect(card3X, cardY, cardWidth + 10, 65, 'FD');
    doc.setFillColor(EMERALD[0], EMERALD[1], EMERALD[2]);
    doc.rect(card3X, cardY, 3, 65, 'F');
    
    doc.setFontSize(8);
    doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
    doc.setFont('helvetica', 'bold');
    doc.text('NET PROFIT', card3X + 12, cardY + 22);
    doc.setFontSize(14);
    doc.setTextColor(EMERALD[0], EMERALD[1], EMERALD[2]);
    doc.text(`$${netProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, card3X + 12, cardY + 48);
    
    let currentY = 235;
    
    // Business Expenses table
    doc.setFontSize(11);
    doc.setTextColor(DARK_SLATE[0], DARK_SLATE[1], DARK_SLATE[2]);
    doc.setFont('helvetica', 'bold');
    doc.text('BUSINESS EXPENSES', 40, currentY);
    currentY += 10;
    
    const expenseBody = expenses.map(e => [
        new Date(e.expense_date).toLocaleDateString(),
        (e.category || '').toUpperCase(),
        e.title || '',
        e.notes || '-',
        `$${Number(e.amount).toFixed(2)}`
    ]);
    
    if (expenseBody.length > 0) {
        autoTable(doc, {
            startY: currentY,
            head: [['Date', 'Category', 'Item / Title', 'Notes', 'Amount']],
            body: expenseBody,
            theme: 'striped',
            headStyles: { fillColor: DARK_SLATE, textColor: GOLD_COLOR, fontSize: 9 },
            styles: { fontSize: 8.5, cellPadding: 6, textColor: TEXT_DARK },
            columnStyles: { 4: { halign: 'right', fontStyle: 'bold' } }
        });
        currentY = (doc as any).lastAutoTable.finalY + 30;
    } else {
        doc.setFontSize(9);
        doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
        doc.setFont('helvetica', 'normal');
        doc.text('No expenses recorded for this period.', 40, currentY + 15);
        currentY += 40;
    }
    
    // Staff payments ledger table
    doc.setFontSize(11);
    doc.setTextColor(DARK_SLATE[0], DARK_SLATE[1], DARK_SLATE[2]);
    doc.setFont('helvetica', 'bold');
    doc.text('STAFF PAYMENTS LEDGER', 40, currentY);
    currentY += 10;
    
    const staffBody = staffPayments.map(p => [
        new Date(p.payment_date).toLocaleDateString(),
        p.staff?.full_name || 'Unknown',
        (p.payment_type || '').replace('_', ' ').toUpperCase(),
        p.notes || '-',
        `$${Number(p.amount).toFixed(2)}`
    ]);
    
    if (staffBody.length > 0) {
        autoTable(doc, {
            startY: currentY,
            head: [['Date', 'Staff Name', 'Payment Type', 'Notes', 'Amount']],
            body: staffBody,
            theme: 'striped',
            headStyles: { fillColor: DARK_SLATE, textColor: GOLD_COLOR, fontSize: 9 },
            styles: { fontSize: 8.5, cellPadding: 6, textColor: TEXT_DARK },
            columnStyles: { 4: { halign: 'right', fontStyle: 'bold' } }
        });
    } else {
        doc.setFontSize(9);
        doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
        doc.setFont('helvetica', 'normal');
        doc.text('No staff payments recorded for this period.', 40, currentY + 15);
    }
    
    // Footer
    doc.setFontSize(8);
    doc.setTextColor(180, 180, 180);
    doc.line(40, pageHeight - 50, pageWidth - 40, pageHeight - 50);
    doc.text(`This is an automatically generated financial statement.`, 40, pageHeight - 35);
    
    const safeName = (salonName || 'Salon').replace(/[^a-z0-9]/gi, '_').toLowerCase();
    doc.save(`${safeName}_financial_report.pdf`);
};

// ==========================================
// IMAGE LOADER HELPER
// ==========================================
const getBase64ImageFromUrl = async (imageUrl: string): Promise<string | null> => {
    try {
        const res = await fetch(imageUrl);
        const blob = await res.blob();
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
        });
    } catch (e) {
        console.warn('Failed to load branding logo for PDF', e);
        return null;
    }
};

// ==========================================
// 2. MASTER / COMPREHENSIVE SYSTEM REPORT
// ==========================================
export interface MasterReportData extends ReportData {
    logoUrl?: string | null;
    totalBookings: number;
    avgPerBooking: number;
    services: { service_name: string; booking_count: number; total_revenue: number }[];
    drawerData: { method: string; amount: number; count: number }[];
    dailyDrawerLogs?: { date: string, cash: number, card: number, other: number }[];
    totalExpectedCash: number;
    staffData: {
        name: string;
        bookings_count: number;
        service_revenue: number;
        commission_earned: number;
        tip_amount: number;
        total_payout: number;
    }[];
}

export const generateMasterReportPDF = async (data: MasterReportData) => {
    const doc = new jsPDF('p', 'pt', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    let logoBase64: string | null = null;
    if (data.logoUrl) {
        logoBase64 = await getBase64ImageFromUrl(data.logoUrl);
    }

    // ==============================================
    // PAGE 1: PERFORMANCE OVERVIEW
    // ==============================================
    drawPremiumHeader(doc, 'Master Report: Performance Overview', data.salonName, data.dateRangeStr, logoBase64);
    
    const cardWidth = (pageWidth - 110) / 3;
    const cardY = 140;
    
    // Revenue Card
    doc.setDrawColor(BORDER_GRAY[0], BORDER_GRAY[1], BORDER_GRAY[2]);
    doc.setFillColor(250, 250, 250);
    doc.rect(40, cardY, cardWidth, 65, 'FD');
    doc.setFillColor(GOLD_COLOR[0], GOLD_COLOR[1], GOLD_COLOR[2]);
    doc.rect(40, cardY, 3, 65, 'F');
    doc.setFontSize(8); doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]); doc.setFont('helvetica', 'bold');
    doc.text('TOTAL REVENUE', 52, cardY + 22);
    doc.setFontSize(14); doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]);
    doc.text(`$${data.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 52, cardY + 48);

    // Bookings Card
    const card2X = 40 + cardWidth + 15;
    doc.setFillColor(250, 250, 250);
    doc.rect(card2X, cardY, cardWidth, 65, 'FD');
    doc.setFillColor(DARK_SLATE[0], DARK_SLATE[1], DARK_SLATE[2]);
    doc.rect(card2X, cardY, 3, 65, 'F');
    doc.setFontSize(8); doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
    doc.text('TOTAL BOOKINGS', card2X + 12, cardY + 22);
    doc.setFontSize(14); doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]);
    doc.text(`${data.totalBookings}`, card2X + 12, cardY + 48);
    
    // Avg/Booking Card
    const card3X = card2X + cardWidth + 15;
    doc.setFillColor(250, 250, 250);
    doc.rect(card3X, cardY, cardWidth + 10, 65, 'FD');
    doc.setFillColor(EMERALD[0], EMERALD[1], EMERALD[2]);
    doc.rect(card3X, cardY, 3, 65, 'F');
    doc.setFontSize(8); doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
    doc.text('AVG / BOOKING', card3X + 12, cardY + 22);
    doc.setFontSize(14); doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]);
    doc.text(`$${data.avgPerBooking.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, card3X + 12, cardY + 48);

    let currentY = 240;
    doc.setFontSize(11); doc.setTextColor(DARK_SLATE[0], DARK_SLATE[1], DARK_SLATE[2]); doc.setFont('helvetica', 'bold');
    doc.text('TOP SERVICES BY REVENUE', 40, currentY);
    
    currentY += 20;
    const maxRev = Math.max(...data.services.map(s => s.total_revenue), 1);
    data.services.slice(0, 5).forEach((s) => {
        const barMaxWidth = pageWidth - 260;
        const barWidth = (s.total_revenue / maxRev) * barMaxWidth;
        
        doc.setFontSize(9); doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]); doc.setFont('helvetica', 'normal');
        doc.text(s.service_name.substring(0, 25).toUpperCase(), 40, currentY + 11);
        
        // Draw Bar Accent
        doc.setFillColor(GOLD_COLOR[0], GOLD_COLOR[1], GOLD_COLOR[2]);
        doc.rect(180, currentY, Math.max(barWidth, 3), 14, 'F');
        
        // Value Text
        doc.setFontSize(9.5); doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]); doc.setFont('helvetica', 'bold');
        doc.text(`$${s.total_revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 180 + barWidth + 10, currentY + 11);
        
        currentY += 26;
    });

    // AI smart suggestions card
    let aiY = Math.max(currentY + 20, 420);
    
    doc.setFillColor(DARK_SLATE[0], DARK_SLATE[1], DARK_SLATE[2]);
    doc.rect(40, aiY, pageWidth - 80, 110, 'F');
    doc.setFillColor(GOLD_COLOR[0], GOLD_COLOR[1], GOLD_COLOR[2]);
    doc.rect(40, aiY, 4, 110, 'F'); // left neon line
    
    doc.setFontSize(11); doc.setTextColor(GOLD_COLOR[0], GOLD_COLOR[1], GOLD_COLOR[2]); doc.setFont('helvetica', 'bold');
    doc.text('AUTOMATED PERFORMANCE INSIGHTS (AI)', 60, aiY + 25);
    
    doc.setFontSize(8.5); doc.setTextColor(220, 224, 230); doc.setFont('helvetica', 'normal');
    
    const topService = data.services.length > 0 ? data.services[0].service_name : 'Haircuts';
    const topStaff = data.staffData.length > 0 ? [...data.staffData].sort((a,b)=>b.service_revenue - a.service_revenue)[0].name : 'your team';
    
    const insight1 = `GROWTH OPPORTUNITY: Your top service is '${topService}'. Consider creating a package deal to increase volume by 15%.`;
    const insight2 = `STAFF EFFICIENCY: '${topStaff}' generated the most revenue this period. Keep morale high to ensure retention!`;
    const insight3 = `STRATEGY SUGGESTION: Net Profit is at $${data.netProfit.toLocaleString(undefined, { maximumFractionDigits: 0 })}. Consider running waitlist campaigns to fill slots.`;
    
    doc.text(`•  ${insight1}`, 60, aiY + 48, { maxWidth: pageWidth - 120 });
    doc.text(`•  ${insight2}`, 60, aiY + 68, { maxWidth: pageWidth - 120 });
    doc.text(`•  ${insight3}`, 60, aiY + 88, { maxWidth: pageWidth - 120 });

    // ==============================================
    // PAGE 2: STAFF PAYROLL
    // ==============================================
    doc.addPage();
    drawPremiumHeader(doc, 'Master Report: Staff Payroll Summary', data.salonName, data.dateRangeStr, logoBase64);
    
    currentY = 150;
    const staffPayroll = data.staffData.map(s => [
        s.name,
        s.bookings_count.toString(),
        `$${s.service_revenue.toLocaleString()}`,
        `$${s.commission_earned.toLocaleString()}`,
        `$${s.tip_amount.toLocaleString()}`,
        `$${s.total_payout.toLocaleString()}`
    ]);

    if (staffPayroll.length > 0) {
        autoTable(doc, {
            startY: currentY,
            head: [['Stylist', 'Bookings', 'Service Rev', 'Comm. Earned', 'Tips', 'Total Payout']],
            body: staffPayroll,
            theme: 'striped',
            headStyles: { fillColor: DARK_SLATE, textColor: GOLD_COLOR, fontSize: 9 },
            styles: { fontSize: 8.5, cellPadding: 6, textColor: TEXT_DARK },
            columnStyles: { 5: { halign: 'right', fontStyle: 'bold', textColor: EMERALD } }
        });
    }

    // ==============================================
    // PAGE 3: REGISTER DRAWER & CASH FLOW
    // ==============================================
    doc.addPage();
    drawPremiumHeader(doc, 'Master Report: Register Drawer Log', data.salonName, data.dateRangeStr, logoBase64);
    
    // Drawer Summary Card
    doc.setDrawColor(BORDER_GRAY[0], BORDER_GRAY[1], BORDER_GRAY[2]);
    doc.setFillColor(250, 250, 250);
    doc.rect(40, 140, pageWidth - 80, 55, 'FD');
    doc.setFillColor(GOLD_COLOR[0], GOLD_COLOR[1], GOLD_COLOR[2]);
    doc.rect(40, 140, 4, 55, 'F');
    
    doc.setFontSize(8); doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]); doc.setFont('helvetica', 'bold');
    doc.text('EXPECTED CASH IN DRAWER', 60, 162);
    doc.setFontSize(16); doc.setTextColor(GOLD_COLOR[0], GOLD_COLOR[1], GOLD_COLOR[2]);
    doc.text(`$${data.totalExpectedCash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 60, 183);

    currentY = 220;
    doc.setFontSize(11); doc.setTextColor(DARK_SLATE[0], DARK_SLATE[1], DARK_SLATE[2]);
    doc.text('PAYMENT METHODS BREAKDOWN', 40, currentY);
    
    currentY += 10;
    const paymentMethods = data.drawerData.map(d => [
        d.method.toUpperCase(),
        d.count.toString(),
        `$${d.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    ]);

    if (paymentMethods.length > 0) {
        autoTable(doc, {
            startY: currentY,
            head: [['Method', 'Transactions', 'Amount']],
            body: paymentMethods,
            theme: 'striped',
            headStyles: { fillColor: DARK_SLATE, textColor: GOLD_COLOR, fontSize: 9 },
            styles: { fontSize: 8.5, cellPadding: 6, textColor: TEXT_DARK },
            columnStyles: { 2: { halign: 'right', fontStyle: 'bold' } }
        });
        currentY = (doc as any).lastAutoTable.finalY + 30;
    } else {
        currentY += 20;
    }

    doc.setFontSize(11); doc.setTextColor(DARK_SLATE[0], DARK_SLATE[1], DARK_SLATE[2]);
    doc.text('DAILY LEDGER (ACTIVE DAYS)', 40, currentY);
    
    currentY += 10;
    const dailyDrawerBody = (data.dailyDrawerLogs || [])
        .filter(d => d.cash > 0 || d.card > 0 || d.other > 0)
        .map(d => [
            new Date(d.date).toLocaleDateString(),
            `$${d.cash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            `$${d.card.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            `$${d.other.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            `$${(d.cash + d.card + d.other).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        ]);

    if (dailyDrawerBody.length > 0) {
        autoTable(doc, {
            startY: currentY,
            head: [['Date', 'Cash', 'Card / Terminal', 'Other', 'Total Volume']],
            body: dailyDrawerBody,
            theme: 'striped',
            headStyles: { fillColor: DARK_SLATE, textColor: GOLD_COLOR, fontSize: 9 },
            styles: { fontSize: 8.5, cellPadding: 6, textColor: TEXT_DARK },
            columnStyles: { 
                1: { halign: 'right' },
                2: { halign: 'right' },
                3: { halign: 'right' },
                4: { halign: 'right', fontStyle: 'bold', textColor: GOLD_COLOR }
            }
        });
    }

    // ==============================================
    // PAGE 4: EXPENSES & PROFIT/LOSS
    // ==============================================
    doc.addPage();
    drawPremiumHeader(doc, 'Master Report: Financial Ledger', data.salonName, data.dateRangeStr, logoBase64);
    
    // Cards
    doc.setDrawColor(BORDER_GRAY[0], BORDER_GRAY[1], BORDER_GRAY[2]);
    doc.setFillColor(250, 250, 250);
    doc.rect(40, 140, cardWidth, 65, 'FD');
    doc.setFillColor(GOLD_COLOR[0], GOLD_COLOR[1], GOLD_COLOR[2]);
    doc.rect(40, 140, 3, 65, 'F');
    doc.setFontSize(8); doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]); doc.setFont('helvetica', 'bold');
    doc.text('GROSS REVENUE', 52, 162);
    doc.setFontSize(14); doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]);
    doc.text(`$${data.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 52, 183);
    
    const totalExp = data.expenses.reduce((s, e) => s + Number(e.amount), 0);
    doc.setFillColor(250, 250, 250);
    doc.rect(card2X, 140, cardWidth, 65, 'FD');
    doc.setFillColor(CRIMSON[0], CRIMSON[1], CRIMSON[2]);
    doc.rect(card2X, 140, 3, 65, 'F');
    doc.setFontSize(8); doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
    doc.text('TOTAL EXPENSES', card2X + 12, 162);
    doc.setFontSize(14); doc.setTextColor(CRIMSON[0], CRIMSON[1], CRIMSON[2]);
    doc.text(`$${totalExp.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, card2X + 12, 183);
    
    doc.setFillColor(250, 250, 250);
    doc.rect(card3X, 140, cardWidth + 10, 65, 'FD');
    doc.setFillColor(EMERALD[0], EMERALD[1], EMERALD[2]);
    doc.rect(card3X, 140, 3, 65, 'F');
    doc.setFontSize(8); doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
    doc.text('NET PROFIT', card3X + 12, 162);
    doc.setFontSize(14); doc.setTextColor(EMERALD[0], EMERALD[1], EMERALD[2]);
    doc.text(`$${data.netProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, card3X + 12, 183);
    
    currentY = 230;
    doc.setFontSize(11); doc.setTextColor(DARK_SLATE[0], DARK_SLATE[1], DARK_SLATE[2]);
    doc.text('BUSINESS EXPENSES RECORD', 40, currentY);
    currentY += 10;
    
    const expenseBody = data.expenses.map(e => [
        new Date(e.expense_date).toLocaleDateString(),
        (e.category || '').toUpperCase(),
        e.title || '',
        `$${Number(e.amount).toFixed(2)}`
    ]);
    
    if (expenseBody.length > 0) {
        autoTable(doc, {
            startY: currentY,
            head: [['Date', 'Category', 'Item / Title', 'Amount']],
            body: expenseBody,
            theme: 'striped',
            headStyles: { fillColor: DARK_SLATE, textColor: GOLD_COLOR, fontSize: 9 },
            styles: { fontSize: 8.5, cellPadding: 6, textColor: TEXT_DARK },
            columnStyles: { 3: { halign: 'right', fontStyle: 'bold' } }
        });
        currentY = (doc as any).lastAutoTable.finalY + 30;
    } else {
        currentY += 20;
    }
    
    doc.setFontSize(11); doc.setTextColor(DARK_SLATE[0], DARK_SLATE[1], DARK_SLATE[2]);
    doc.text('STAFF PAYMENTS RECORD', 40, currentY);
    currentY += 10;
    
    const staffBody = data.staffPayments.map(p => [
        new Date(p.payment_date).toLocaleDateString(),
        p.staff?.full_name || 'Unknown',
        (p.payment_type || '').replace('_', ' ').toUpperCase(),
        `$${Number(p.amount).toFixed(2)}`
    ]);
    
    if (staffBody.length > 0) {
        autoTable(doc, {
            startY: currentY,
            head: [['Date', 'Staff Name', 'Payment Type', 'Amount']],
            body: staffBody,
            theme: 'striped',
            headStyles: { fillColor: DARK_SLATE, textColor: GOLD_COLOR, fontSize: 9 },
            styles: { fontSize: 8.5, cellPadding: 6, textColor: TEXT_DARK },
            columnStyles: { 3: { halign: 'right', fontStyle: 'bold' } }
        });
    }
    
    const safeName = (data.salonName || 'Salon').replace(/[^a-z0-9]/gi, '_').toLowerCase();
    doc.save(`${safeName}_master_report_${data.dateRangeStr.replace(/\s+/g, '_')}.pdf`);
};

// ==========================================
// 3. STAFF PAYSLIP (SINGLE RUN) PDF
// ==========================================
export const generatePayslipPDF = ({ salonName, payrollRun }: { salonName: string, payrollRun: any }) => {
    const doc = new jsPDF('p', 'pt', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    const d1 = new Date(payrollRun.period_start).toLocaleDateString();
    const d2 = new Date(payrollRun.period_end).toLocaleDateString();
    
    drawPremiumHeader(doc, 'Staff Payroll Payslip Statement', salonName, `${d1} - ${d2}`);
    
    const staffName = payrollRun.staff?.full_name || 'Staff Member';
    let currentY = 145;
    
    // Info Block
    doc.setFontSize(11);
    doc.setTextColor(DARK_SLATE[0], DARK_SLATE[1], DARK_SLATE[2]);
    doc.setFont('helvetica', 'bold');
    doc.text('EMPLOYEE INFORMATION', 40, currentY);
    
    doc.setDrawColor(BORDER_GRAY[0], BORDER_GRAY[1], BORDER_GRAY[2]);
    doc.setFillColor(250, 250, 250);
    doc.rect(40, currentY + 10, pageWidth - 80, 60, 'FD');
    
    const textY = currentY + 28;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
    doc.text('Employee Name:', 55, textY);
    doc.text('Role Description:', 55, textY + 18);
    
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]);
    doc.text(staffName.toUpperCase(), 160, textY);
    doc.text('Stylist / Specialist', 160, textY + 18);
    
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
    doc.text('Run ID:', 340, textY);
    doc.text('Status:', 340, textY + 18);
    
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]);
    doc.text(payrollRun.id || 'N/A', 400, textY);
    
    const isApproved = payrollRun.status === 'approved' || payrollRun.status === 'paid';
    doc.setTextColor(isApproved ? EMERALD[0] : GOLD_COLOR[0], isApproved ? EMERALD[1] : GOLD_COLOR[1], isApproved ? EMERALD[2] : GOLD_COLOR[2]);
    doc.text((payrollRun.status || 'draft').toUpperCase(), 400, textY + 18);

    // Earnings Table
    currentY += 95;
    doc.setFontSize(11);
    doc.setTextColor(DARK_SLATE[0], DARK_SLATE[1], DARK_SLATE[2]);
    doc.setFont('helvetica', 'bold');
    doc.text('EARNINGS & ADDITIONS', 40, currentY);
    
    const earningsData = [
        ['Base Salary Allocation', `$${Number(payrollRun.base_salary_allocated || 0).toFixed(2)}`],
        ['Commissions from Services', `$${Number(payrollRun.total_commission || 0).toFixed(2)}`],
        ['Client Tips Collected', `$${Number(payrollRun.total_tips || 0).toFixed(2)}`],
    ];
    
    autoTable(doc, {
        startY: currentY + 10,
        head: [['Description', 'Amount']],
        body: earningsData,
        theme: 'striped',
        headStyles: { fillColor: DARK_SLATE, textColor: GOLD_COLOR, fontSize: 9 },
        styles: { fontSize: 8.5, cellPadding: 6, textColor: TEXT_DARK },
        columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } }
    });
    
    currentY = (doc as any).lastAutoTable.finalY + 25;
    
    // Deductions Table
    doc.setFontSize(11);
    doc.setTextColor(DARK_SLATE[0], DARK_SLATE[1], DARK_SLATE[2]);
    doc.setFont('helvetica', 'bold');
    doc.text('DEDUCTIONS & ADVANCES', 40, currentY);
    
    autoTable(doc, {
        startY: currentY + 10,
        head: [['Description', 'Amount']],
        body: [['Advances Taken / Miscellaneous Deductions', `-$${Number(payrollRun.deductions || 0).toFixed(2)}`]],
        theme: 'striped',
        headStyles: { fillColor: CRIMSON, textColor: [255, 255, 255], fontSize: 9 },
        styles: { fontSize: 8.5, cellPadding: 6, textColor: TEXT_DARK },
        columnStyles: { 1: { halign: 'right', fontStyle: 'bold', textColor: CRIMSON } }
    });
    
    currentY = (doc as any).lastAutoTable.finalY + 30;
    
    // Totals Box
    doc.setFillColor(250, 250, 250);
    doc.setDrawColor(GOLD_COLOR[0], GOLD_COLOR[1], GOLD_COLOR[2]);
    doc.setLineWidth(1.5);
    doc.rect(340, currentY, 210, 60, 'FD');
    doc.setFillColor(GOLD_COLOR[0], GOLD_COLOR[1], GOLD_COLOR[2]);
    doc.rect(340, currentY, 4, 60, 'F');
    
    doc.setFontSize(8);
    doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
    doc.setFont('helvetica', 'bold');
    doc.text('NET PAYOUT', 360, currentY + 22);
    
    doc.setFontSize(18);
    doc.setTextColor(EMERALD[0], EMERALD[1], EMERALD[2]);
    doc.text(`$${Number(payrollRun.net_payout || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 360, currentY + 44);

    // Footer
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(180, 180, 180);
    doc.line(40, pageHeight - 50, pageWidth - 40, pageHeight - 50);
    doc.text(`This is an automatically generated document by ${salonName || 'Salon'} ERP.`, 40, pageHeight - 35);
    
    const safeFilename = `${staffName.replace(/\s+/g, '_')}_Payslip_${d1.replace(/\//g, '-')}.pdf`;
    doc.save(safeFilename);
};

// ==========================================
// 4. SALARY / PAYROLL SUMMARY REPORT PDF
// ==========================================
export interface SalaryReportData {
    salonName: string;
    dateRangeStr: string;
    staffData: {
        name: string;
        bookings_count: number;
        base_salary: number;
        service_revenue: number;
        commission_percent: number;
        commission_earned: number;
        tip_amount: number;
        gross_payout: number;
        already_paid: number;
        total_payout: number;
        isUnassigned?: boolean;
    }[];
}

export const generateSalaryReportPDF = (data: SalaryReportData) => {
    const doc = new jsPDF('p', 'pt', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    // Draw Header
    drawPremiumHeader(doc, 'Staff Payroll & Salary Summary Report', data.salonName, data.dateRangeStr);
    
    // Calculations
    const totalExpected = data.staffData.reduce((sum, s) => sum + (s.gross_payout || 0), 0);
    const totalPaid = data.staffData.reduce((sum, s) => sum + (s.already_paid || 0), 0);
    const totalOutstanding = data.staffData.reduce((sum, s) => sum + (s.total_payout || 0), 0);
    
    // Summary Cards (3 Cards)
    const cardWidth = (pageWidth - 110) / 3;
    const cardY = 140;
    const card2X = 40 + cardWidth + 15;
    const card3X = card2X + cardWidth + 15;
    
    // Card 1: Gross Payout
    doc.setDrawColor(BORDER_GRAY[0], BORDER_GRAY[1], BORDER_GRAY[2]);
    doc.setFillColor(250, 250, 250);
    doc.rect(40, cardY, cardWidth, 60, 'FD');
    doc.setFillColor(GOLD_COLOR[0], GOLD_COLOR[1], GOLD_COLOR[2]);
    doc.rect(40, cardY, 3, 60, 'F');
    doc.setFontSize(7.5); doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]); doc.setFont('helvetica', 'bold');
    doc.text('TOTAL EXPECTED PAYOUT', 52, cardY + 22);
    doc.setFontSize(13); doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]);
    doc.text(`$${totalExpected.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 52, cardY + 44);
    
    // Card 2: Total Paid
    doc.setFillColor(250, 250, 250);
    doc.rect(card2X, cardY, cardWidth, 60, 'FD');
    doc.setFillColor(CRIMSON[0], CRIMSON[1], CRIMSON[2]);
    doc.rect(card2X, cardY, 3, 60, 'F');
    doc.setFontSize(7.5); doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
    doc.text('TOTAL PAID (ADVANCES/LEDGER)', card2X + 12, cardY + 22);
    doc.setFontSize(13); doc.setTextColor(CRIMSON[0], CRIMSON[1], CRIMSON[2]);
    doc.text(`$${totalPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, card2X + 12, cardY + 44);
    
    // Card 3: Net Outstanding
    doc.setFillColor(250, 250, 250);
    doc.rect(card3X, cardY, cardWidth + 10, 60, 'FD');
    doc.setFillColor(EMERALD[0], EMERALD[1], EMERALD[2]);
    doc.rect(card3X, cardY, 3, 60, 'F');
    doc.setFontSize(7.5); doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
    doc.text('TOTAL NET DUE OUTSTANDING', card3X + 12, cardY + 22);
    doc.setFontSize(13); doc.setTextColor(EMERALD[0], EMERALD[1], EMERALD[2]);
    doc.text(`$${totalOutstanding.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, card3X + 12, cardY + 44);
    
    let currentY = 225;
    
    // Staff Payroll Table
    const totalBookingsCount = data.staffData.reduce((sum, s) => sum + (s.bookings_count || 0), 0);
    const totalBaseSalary = data.staffData.reduce((sum, s) => sum + (s.base_salary || 0), 0);
    const totalServRev = data.staffData.reduce((sum, s) => sum + (s.service_revenue || 0), 0);
    const totalCommEarned = data.staffData.reduce((sum, s) => sum + (s.commission_earned || 0), 0);
    const totalTips = data.staffData.reduce((sum, s) => sum + (s.tip_amount || 0), 0);

    const staffBody = data.staffData.map(s => [
        s.name.toUpperCase(),
        s.bookings_count.toString(),
        `$${Number(s.base_salary || 0).toFixed(0)}`,
        `$${Number(s.service_revenue || 0).toFixed(0)}`,
        s.isUnassigned ? '-' : `${Number(s.commission_percent || 0)}%`,
        `$${Number(s.commission_earned || 0).toFixed(0)}`,
        `$${Number(s.tip_amount || 0).toFixed(0)}`,
        `$${Number(s.gross_payout || 0).toFixed(0)}`,
        `$${Number(s.already_paid || 0).toFixed(0)}`,
        `$${Number(s.total_payout || 0).toFixed(0)}`
    ]);

    // Append TOTALS Row
    staffBody.push([
        'TOTALS',
        totalBookingsCount.toString(),
        `$${totalBaseSalary.toFixed(0)}`,
        `$${totalServRev.toFixed(0)}`,
        '-',
        `$${totalCommEarned.toFixed(0)}`,
        `$${totalTips.toFixed(0)}`,
        `$${totalExpected.toFixed(0)}`,
        `$${totalPaid.toFixed(0)}`,
        `$${totalOutstanding.toFixed(0)}`
    ]);
    
    autoTable(doc, {
        startY: currentY,
        head: [['Stylist', 'Bookings', 'Base Sal.', 'Serv. Rev', 'Comm %', 'Comm.', 'Tips', 'Gross', 'Paid', 'Net Due']],
        body: staffBody,
        theme: 'striped',
        headStyles: { fillColor: DARK_SLATE, textColor: GOLD_COLOR, fontSize: 8 },
        styles: { fontSize: 7.5, cellPadding: 5, textColor: TEXT_DARK },
        columnStyles: { 
            7: { fontStyle: 'bold' },
            8: { textColor: CRIMSON },
            9: { fontStyle: 'bold', textColor: EMERALD }
        },
        didParseCell: (cellData) => {
            if (cellData.row.index === staffBody.length - 1) {
                cellData.cell.styles.fontStyle = 'bold';
                cellData.cell.styles.fillColor = [240, 240, 240];
                if (cellData.column.index === 9) {
                    cellData.cell.styles.textColor = EMERALD;
                } else if (cellData.column.index === 8) {
                    cellData.cell.styles.textColor = CRIMSON;
                } else {
                    cellData.cell.styles.textColor = [0, 0, 0];
                }
            }
        }
    });
    
    // Footer
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(180, 180, 180);
    doc.line(40, pageHeight - 50, pageWidth - 40, pageHeight - 50);
    doc.text(`This is a payroll summary report generated by ${data.salonName || 'Salon'} ERP.`, 40, pageHeight - 35);
    
    const safeName = (data.salonName || 'Salon').replace(/[^a-z0-9]/gi, '_').toLowerCase();
    doc.save(`${safeName}_salary_report_${data.dateRangeStr.replace(/\s+/g, '_')}.pdf`);
};

// ==========================================
// 5. INDIVIDUAL STAFF STATEMENT & PAYSLIP PDF
// ==========================================
export interface IndividualStaffReportData {
    salonName: string;
    dateRangeStr: string;
    staff: {
        name: string;
        bookings_count: number;
        base_salary: number;
        service_revenue: number;
        commission_percent: number;
        commission_earned: number;
        tip_amount: number;
        gross_payout: number;
        already_paid: number;
        total_payout: number;
    };
}

export const generateIndividualStaffReportPDF = (data: IndividualStaffReportData) => {
    const doc = new jsPDF('p', 'pt', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    // Draw Header
    drawPremiumHeader(doc, 'Staff Earnings Statement & Payslip', data.salonName, data.dateRangeStr);
    
    let currentY = 145;
    
    // Employee Info Card
    doc.setFontSize(11);
    doc.setTextColor(DARK_SLATE[0], DARK_SLATE[1], DARK_SLATE[2]);
    doc.setFont('helvetica', 'bold');
    doc.text('EMPLOYEE STATEMENT DETAILS', 40, currentY);
    
    doc.setDrawColor(BORDER_GRAY[0], BORDER_GRAY[1], BORDER_GRAY[2]);
    doc.setFillColor(250, 250, 250);
    doc.rect(40, currentY + 10, pageWidth - 80, 75, 'FD');

    const cardY = currentY + 28;
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
    doc.text('Employee Name:', 55, cardY);
    doc.text('Completed Jobs:', 55, cardY + 18);
    doc.text('Total Service Sales:', 55, cardY + 36);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]);
    doc.text(data.staff.name.toUpperCase(), 160, cardY);
    doc.text(`${data.staff.bookings_count} Bookings`, 160, cardY + 18);
    doc.text(`$${data.staff.service_revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 160, cardY + 36);

    // Right Column
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
    doc.text('Statement Date:', 340, cardY);
    doc.text('Statement Status:', 340, cardY + 18);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]);
    doc.text(new Date().toLocaleDateString(), 435, cardY);

    const isPaid = data.staff.total_payout <= 0;
    const statusText = isPaid ? 'PAID & CLEARED' : 'PENDING PAYOUT';
    const statusColor = isPaid ? EMERALD : GOLD_COLOR;
    
    // Status Pill
    doc.setFillColor(statusColor[0], statusColor[1], statusColor[2]);
    doc.rect(435, cardY + 8, 105, 15, 'F');
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    doc.text(statusText, 435 + 52.5, cardY + 18, { align: 'center' });

    // Itemized Ledger Table
    currentY += 110;
    doc.setFontSize(11);
    doc.setTextColor(DARK_SLATE[0], DARK_SLATE[1], DARK_SLATE[2]);
    doc.setFont('helvetica', 'bold');
    doc.text('ITEMIZED TRANSACTION LEDGER', 40, currentY);

    const ledgerBody = [
        ['Monthly Base Salary Allocation', `$${Number(data.staff.base_salary || 0).toFixed(2)}`, 'Earning'],
        [`Service Commission (${data.staff.commission_percent}%)`, `+ $${Number(data.staff.commission_earned || 0).toFixed(2)}`, 'Earning'],
        ['Client Tips Collected', `+ $${Number(data.staff.tip_amount || 0).toFixed(2)}`, 'Earning'],
        ['Already Paid (Ledger Deductions)', `-$${Number(data.staff.already_paid || 0).toFixed(2)}`, 'Deduction']
    ];

    autoTable(doc, {
        startY: currentY + 10,
        head: [['Transaction Details', 'Amount', 'Type']],
        body: ledgerBody,
        theme: 'striped',
        headStyles: { fillColor: DARK_SLATE, textColor: GOLD_COLOR, fontSize: 9 },
        styles: { fontSize: 8.5, cellPadding: 6, textColor: TEXT_DARK },
        columnStyles: { 
            1: { halign: 'right', fontStyle: 'bold' },
            2: { halign: 'center' }
        },
        didParseCell: (cellData) => {
            if (cellData.column.index === 1 && cellData.row.index === 3) {
                cellData.cell.styles.textColor = CRIMSON;
            }
        }
    });

    currentY = (doc as any).lastAutoTable.finalY + 25;

    // Totals Box
    doc.setFillColor(250, 250, 250);
    doc.setDrawColor(GOLD_COLOR[0], GOLD_COLOR[1], GOLD_COLOR[2]);
    doc.setLineWidth(1.5);
    doc.rect(340, currentY, 210, 60, 'FD');
    doc.setFillColor(GOLD_COLOR[0], GOLD_COLOR[1], GOLD_COLOR[2]);
    doc.rect(340, currentY, 4, 60, 'F');

    doc.setFontSize(8);
    doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
    doc.setFont('helvetica', 'bold');
    doc.text('NET PAYOUT DUE', 360, currentY + 22);

    doc.setFontSize(18);
    doc.setTextColor(isPaid ? EMERALD[0] : GOLD_COLOR[0], isPaid ? EMERALD[1] : GOLD_COLOR[1], isPaid ? EMERALD[2] : GOLD_COLOR[2]);
    doc.text(`$${Number(data.staff.total_payout || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 360, currentY + 44);

    // Footer
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(180, 180, 180);
    doc.line(40, pageHeight - 50, pageWidth - 40, pageHeight - 50);
    doc.text(`This is an official statement generated by ${data.salonName || 'Salon'} ERP.`, 40, pageHeight - 35);
    
    const safeFilename = `${data.staff.name.replace(/\s+/g, '_')}_Earnings_Statement.pdf`;
    doc.save(safeFilename);
};

export interface AnalyticsReportData {
    salonName: string;
    dateRangeStr: string;
    dailyData: { day: string; revenue: number; booking_count: number }[];
}

export const generateAnalyticsReportPDF = (data: AnalyticsReportData) => {
    const doc = new jsPDF('p', 'pt', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Draw Header
    drawPremiumHeader(doc, 'Daily Performance & Analytics Ledger', data.salonName, data.dateRangeStr);

    let currentY = 145;

    // Calculations
    const totalRevenue = data.dailyData.reduce((sum, r) => sum + (r.revenue || 0), 0);
    const totalBookings = data.dailyData.reduce((sum, r) => sum + (r.booking_count || 0), 0);

    // Summary Cards (2 Cards)
    const cardWidth = (pageWidth - 95) / 2;

    // Card 1: Total Revenue
    doc.setDrawColor(BORDER_GRAY[0], BORDER_GRAY[1], BORDER_GRAY[2]);
    doc.setFillColor(250, 250, 250);
    doc.rect(40, currentY, cardWidth, 60, 'FD');
    doc.setFillColor(GOLD_COLOR[0], GOLD_COLOR[1], GOLD_COLOR[2]);
    doc.rect(40, currentY, 3, 60, 'F');
    doc.setFontSize(8); doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]); doc.setFont('helvetica', 'bold');
    doc.text('AGGREGATE REVENUE', 52, currentY + 22);
    doc.setFontSize(14); doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]);
    doc.text(`$${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 52, currentY + 44);

    // Card 2: Total Bookings
    const card2X = 40 + cardWidth + 15;
    doc.setFillColor(250, 250, 250);
    doc.rect(card2X, currentY, cardWidth, 60, 'FD');
    doc.setFillColor(DARK_SLATE[0], DARK_SLATE[1], DARK_SLATE[2]);
    doc.rect(card2X, currentY, 3, 60, 'F');
    doc.setFontSize(8); doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
    doc.text('AGGREGATE BOOKINGS', card2X + 12, currentY + 22);
    doc.setFontSize(14); doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]);
    doc.text(`${totalBookings} Bookings`, card2X + 12, currentY + 44);

    currentY += 85;

    // Table Data
    const tableBody = data.dailyData.map(r => [
        r.day,
        `${r.booking_count} Bookings`,
        `$${Number(r.revenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    ]);

    // Append TOTALS Row
    tableBody.push([
        'TOTALS',
        `${totalBookings} Bookings`,
        `$${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    ]);

    autoTable(doc, {
        startY: currentY,
        head: [['Date / Day', 'Bookings Count', 'Daily Revenue']],
        body: tableBody,
        theme: 'striped',
        headStyles: { fillColor: DARK_SLATE, textColor: GOLD_COLOR, fontSize: 9 },
        styles: { fontSize: 8.5, cellPadding: 6, textColor: TEXT_DARK },
        columnStyles: { 
            2: { halign: 'right', fontStyle: 'bold', textColor: GOLD_COLOR }
        },
        didParseCell: (cellData) => {
            if (cellData.row.index === tableBody.length - 1) {
                cellData.cell.styles.fontStyle = 'bold';
                cellData.cell.styles.fillColor = [240, 240, 240];
                if (cellData.column.index === 2) {
                    cellData.cell.styles.textColor = GOLD_COLOR;
                } else {
                    cellData.cell.styles.textColor = [0, 0, 0];
                }
            }
        }
    });

    // Footer
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(180, 180, 180);
    doc.line(40, pageHeight - 50, pageWidth - 40, pageHeight - 50);
    doc.text(`This is an analytics ledger report generated by ${data.salonName || 'Salon'} ERP.`, 40, pageHeight - 35);

    const safeName = (data.salonName || 'Salon').replace(/[^a-z0-9]/gi, '_').toLowerCase();
    doc.save(`${safeName}_analytics_report_${data.dateRangeStr.replace(/\s+/g, '_')}.pdf`);
};

