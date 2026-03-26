import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ReportData {
    salonName: string;
    dateRangeStr: string;
    totalRevenue: number;
    expenses: any[];
    staffPayments: any[];
    netProfit: number;
}

export const generatePnLPDF = ({
    salonName,
    dateRangeStr,
    totalRevenue,
    expenses,
    staffPayments,
    netProfit
}: ReportData) => {
    // A4 Portrait
    const doc = new jsPDF('p', 'pt', 'a4');
    
    // Branding Colors
    const primaryColor = [212, 175, 55]; // #D4AF37 Luxe Gold
    const darkBg = [26, 26, 26];         // #1A1A1A Obsidian
    
    // Header
    doc.setFillColor(darkBg[0], darkBg[1], darkBg[2]);
    doc.rect(0, 0, doc.internal.pageSize.getWidth(), 100, 'F');
    
    doc.setFontSize(24);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFont('helvetica', 'bold');
    doc.text((salonName || 'Salon').toUpperCase(), 40, 50);
    
    doc.setFontSize(14);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'normal');
    doc.text('Financial Performance & P&L Report', 40, 75);
    
    // Date Range and Timestamp
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Report Period: ${dateRangeStr}`, 40, 130);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 40, 145);
    
    // Summary Cards
    doc.setDrawColor(200, 200, 200);
    doc.setFillColor(250, 250, 250);
    
    // Card 1: Revenue
    doc.rect(40, 170, 150, 60, 'FD');
    doc.setFontSize(10);
    doc.setTextColor(150, 150, 150);
    doc.setFont('helvetica', 'bold');
    doc.text('GROSS REVENUE', 50, 190);
    doc.setFontSize(16);
    doc.setTextColor(darkBg[0], darkBg[1], darkBg[2]);
    doc.text(`$${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 50, 215);
    
    // Card 2: Expenses
    const totalExp = expenses.reduce((s, e) => s + Number(e.amount), 0);
    doc.rect(205, 170, 150, 60, 'FD');
    doc.setFontSize(10);
    doc.setTextColor(150, 150, 150);
    doc.text('TOTAL EXPENSES', 215, 190);
    doc.setFontSize(16);
    doc.setTextColor(220, 53, 69); // Red
    doc.text(`$${totalExp.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 215, 215);
    
    // Card 3: Net Profit
    doc.rect(370, 170, 185, 60, 'FD');
    doc.setDrawColor(16, 185, 129); // Emerald
    doc.setLineWidth(3);
    doc.line(370, 170, 370, 230); // Left border
    doc.setFontSize(10);
    doc.setTextColor(150, 150, 150);
    doc.text('NET PROFIT', 385, 190);
    doc.setFontSize(22);
    doc.setTextColor(16, 185, 129);
    doc.text(`$${netProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 385, 215);
    
    doc.setLineWidth(1); // Reset
    
    let currentY = 270;
    
    // ---------------------------------------------
    // BUSINESS EXPENSES TABLE
    // ---------------------------------------------
    doc.setFontSize(14);
    doc.setTextColor(darkBg[0], darkBg[1], darkBg[2]);
    doc.setFont('helvetica', 'bold');
    doc.text('Business Expenses', 40, currentY);
    currentY += 15;
    
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
            theme: 'grid',
            headStyles: { fillColor: primaryColor, textColor: 255 },
            styles: { fontSize: 9, cellPadding: 5 },
            columnStyles: { 4: { halign: 'right', fontStyle: 'bold' } }
        });
        currentY = (doc as any).lastAutoTable.finalY + 40;
    } else {
        doc.setFontSize(10);
        doc.setTextColor(150, 150, 150);
        doc.setFont('helvetica', 'normal');
        doc.text('No expenses recorded for this period.', 40, currentY);
        currentY += 40;
    }
    
    // ---------------------------------------------
    // STAFF PAYROLL / LEDGER TABLE
    // ---------------------------------------------
    doc.setFontSize(14);
    doc.setTextColor(darkBg[0], darkBg[1], darkBg[2]);
    doc.setFont('helvetica', 'bold');
    doc.text('Staff Payments Ledger', 40, currentY);
    currentY += 15;
    
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
            theme: 'grid',
            headStyles: { fillColor: [16, 185, 129], textColor: 255 },
            styles: { fontSize: 9, cellPadding: 5 },
            columnStyles: { 4: { halign: 'right', fontStyle: 'bold' } }
        });
    } else {
        doc.setFontSize(10);
        doc.setTextColor(150, 150, 150);
        doc.setFont('helvetica', 'normal');
        doc.text('No staff payments recorded for this period.', 40, currentY);
    }
    
    // Save
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
// MASTER / COMPREHENSIVE REPORT
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
    const primaryColor: [number, number, number] = [212, 175, 55]; // Luxe Gold
    const darkBg: [number, number, number] = [26, 26, 26];         // Obsidian
    
    let logoBase64: string | null = null;
    if (data.logoUrl) {
        logoBase64 = await getBase64ImageFromUrl(data.logoUrl);
    }
    
    const drawHeader = (title: string, includeLogo = true) => {
        doc.setFillColor(darkBg[0], darkBg[1], darkBg[2]);
        doc.rect(0, 0, doc.internal.pageSize.getWidth(), 100, 'F');
        
        doc.setFontSize(24);
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.setFont('helvetica', 'bold');
        
        let textX = 40;
        if (includeLogo && logoBase64) {
            try {
                // Approximate 40x40 square image
                doc.addImage(logoBase64, 'PNG', 40, 25, 40, 40);
                textX = 95;
            } catch(e) { console.error('Logo draw error:', e); }
        }
        
        doc.text((data.salonName || 'Salon').toUpperCase(), textX, 50);
        
        doc.setFontSize(14);
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'normal');
        doc.text(title, textX, 75);
        
        doc.setFontSize(10);
        doc.setTextColor(150, 150, 150);
        doc.text(`Period: ${data.dateRangeStr} | Generated: ${new Date().toLocaleString()}`, 40, 130);
    };

    // ==============================================
    // PAGE 1: PERFORMANCE OVERVIEW
    // ==============================================
    drawHeader('Master Report: Performance Overview', true);
    
    doc.setDrawColor(200, 200, 200);
    doc.setFillColor(250, 250, 250);
    
    // Cards
    doc.rect(40, 150, 160, 60, 'FD');
    doc.setFontSize(10); doc.setTextColor(150, 150, 150); doc.setFont('helvetica', 'bold');
    doc.text('TOTAL REVENUE', 50, 170);
    doc.setFontSize(18); doc.setTextColor(darkBg[0], darkBg[1], darkBg[2]);
    doc.text(`$${data.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 50, 195);

    doc.rect(215, 150, 160, 60, 'FD');
    doc.setFontSize(10); doc.setTextColor(150, 150, 150);
    doc.text('TOTAL BOOKINGS', 225, 170);
    doc.setFontSize(18); doc.setTextColor(darkBg[0], darkBg[1], darkBg[2]);
    doc.text(`${data.totalBookings}`, 225, 195);
    
    doc.rect(390, 150, 165, 60, 'FD');
    doc.setFontSize(10); doc.setTextColor(150, 150, 150);
    doc.text('AVG / BOOKING', 400, 170);
    doc.setFontSize(18); doc.setTextColor(darkBg[0], darkBg[1], darkBg[2]);
    doc.text(`$${data.avgPerBooking.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 400, 195);

    let currentY = 250;
    doc.setFontSize(14); doc.setTextColor(darkBg[0], darkBg[1], darkBg[2]);
    doc.text('Top Revenue Services (Visualized)', 40, currentY);
    
    currentY += 25;
    const maxRev = Math.max(...data.services.map(s => s.total_revenue), 1);
    data.services.slice(0, 5).forEach((s) => {
        const barWidth = (s.total_revenue / maxRev) * 200; // max length 200pt
        
        doc.setFontSize(10); doc.setTextColor(100, 100, 100);
        doc.text(s.service_name.substring(0, 25), 40, currentY + 12);
        
        // Draw Bar
        doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.rect(200, currentY, Math.max(barWidth, 2), 15, 'F');
        
        // Value Text
        doc.setFontSize(10); doc.setTextColor(50, 50, 50); doc.setFont('helvetica', 'bold');
        doc.text(`$${s.total_revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 200 + barWidth + 10, currentY + 12);
        doc.setFont('helvetica', 'normal');
        
        currentY += 30;
    });

    // ==============================================
    // PAGE 1: AI SMART SUGGESTIONS
    // ==============================================
    let aiY = Math.max(currentY + 20, 420);
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(40, aiY, 515, 30, 'FD'); // Gold header for AI block
    
    doc.setFontSize(12); doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold');
    doc.text('✧ AI VISION - Insights', 50, aiY + 20);
    
    doc.setFillColor(darkBg[0], darkBg[1], darkBg[2]);
    doc.rect(40, aiY + 30, 515, 90, 'FD'); // Black body
    
    doc.setFontSize(10); doc.setTextColor(200, 200, 200); doc.setFont('helvetica', 'normal');
    
    const topService = data.services.length > 0 ? data.services[0].service_name : 'Haircuts';
    const topStaff = data.staffData.length > 0 ? [...data.staffData].sort((a,b)=>b.service_revenue - a.service_revenue)[0].name : 'your team';
    
    const insight1 = `[Growth Opportunity] Your top service is '${topService}'. Consider creating a package deal to increase volume by 15%.`;
    const insight2 = `[Staff Performance] '${topStaff}' generated the most revenue this period. Keep morale high to ensure retention!`;
    const insight3 = `[Financials] Net Profit is at $${data.netProfit.toLocaleString(undefined, { maximumFractionDigits: 0 })}. Consider running automated waitlist campaigns to fill empty slots.`;
    
    doc.text(`• ${insight1}`, 50, aiY + 55, { maxWidth: 495 });
    doc.text(`• ${insight2}`, 50, aiY + 75, { maxWidth: 495 });
    doc.text(`• ${insight3}`, 50, aiY + 95, { maxWidth: 495 });

    // ==============================================
    // PAGE 2: STAFF COMMISSIONS & PAYROLL
    // ==============================================
    doc.addPage();
    drawHeader('Master Report: Staff Payroll Breakdown');
    
    currentY = 160;
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
            theme: 'grid',
            headStyles: { fillColor: darkBg, textColor: 255 },
            styles: { fontSize: 9, cellPadding: 5 },
            columnStyles: { 5: { halign: 'right', fontStyle: 'bold', textColor: primaryColor } }
        });
    }

    // ==============================================
    // PAGE 3: DAILY DRAWER & CASH FLOW
    // ==============================================
    doc.addPage();
    drawHeader('Master Report: Register Drawer');
    
    // Drawer Summary Card
    doc.setDrawColor(200, 200, 200);
    doc.setFillColor(250, 250, 250);
    doc.rect(40, 150, 515, 60, 'FD');
    doc.setFontSize(12); doc.setTextColor(150, 150, 150); doc.setFont('helvetica', 'bold');
    doc.text('EXPECTED CASH IN DRAWER', 50, 175);
    doc.setFontSize(22); doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(`$${data.totalExpectedCash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 50, 198);

    currentY = 240;
    doc.setFontSize(14); doc.setTextColor(darkBg[0], darkBg[1], darkBg[2]);
    doc.text('Payment Methods Breakdown', 40, currentY);
    
    currentY += 15;
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
            theme: 'grid',
            headStyles: { fillColor: [59, 130, 246], textColor: 255 }, // Blue
            styles: { fontSize: 9, cellPadding: 5 }
        });
        currentY = (doc as any).lastAutoTable.finalY + 30;
    } else {
        currentY += 20;
    }

    doc.setFontSize(14); doc.setTextColor(darkBg[0], darkBg[1], darkBg[2]);
    doc.text('Daily Breakdown (Entire Period)', 40, currentY);
    
    currentY += 15;
    const dailyDrawerBody = (data.dailyDrawerLogs || [])
        // Only show days that had actual volume to avoid a sea of zeroes
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
            theme: 'grid',
            headStyles: { fillColor: darkBg, textColor: 255 },
            styles: { fontSize: 9, cellPadding: 5 },
            columnStyles: { 
                1: { halign: 'right' },
                2: { halign: 'right' },
                3: { halign: 'right' },
                4: { halign: 'right', fontStyle: 'bold', textColor: primaryColor }
            }
        });
    }

    // ==============================================
    // PAGE 4: EXPENSES & PROFIT/LOSS
    // ==============================================
    doc.addPage();
    drawHeader('Master Report: Expenses & P&L');
    
    // Cards
    doc.setDrawColor(200, 200, 200);
    doc.setFillColor(250, 250, 250);
    doc.rect(40, 150, 150, 60, 'FD');
    doc.setFontSize(10); doc.setTextColor(150, 150, 150);
    doc.text('GROSS REVENUE', 50, 170);
    doc.setFontSize(16); doc.setTextColor(darkBg[0], darkBg[1], darkBg[2]);
    doc.text(`$${data.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 50, 195);
    
    const totalExp = data.expenses.reduce((s, e) => s + Number(e.amount), 0);
    doc.setDrawColor(200, 200, 200);
    doc.setFillColor(250, 250, 250);
    doc.rect(205, 150, 150, 60, 'FD');
    doc.setFontSize(10); doc.setTextColor(150, 150, 150);
    doc.text('TOTAL EXPENSES', 215, 170);
    doc.setFontSize(16); doc.setTextColor(220, 53, 69); // Red
    doc.text(`$${totalExp.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 215, 195);
    
    doc.setDrawColor(200, 200, 200);
    doc.setFillColor(250, 250, 250);
    doc.rect(370, 150, 185, 60, 'FD');
    doc.setDrawColor(16, 185, 129); // Emerald
    doc.setLineWidth(3); doc.line(370, 150, 370, 210); // Left border
    doc.setFontSize(10); doc.setTextColor(150, 150, 150);
    doc.text('NET PROFIT', 385, 170);
    doc.setFontSize(22); doc.setTextColor(16, 185, 129);
    doc.text(`$${data.netProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 385, 195);
    
    doc.setLineWidth(1); // Reset
    
    currentY = 240;
    doc.setFontSize(14); doc.setTextColor(darkBg[0], darkBg[1], darkBg[2]);
    doc.text('Business Expenses', 40, currentY);
    currentY += 15;
    
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
            theme: 'grid',
            headStyles: { fillColor: primaryColor, textColor: 255 },
            styles: { fontSize: 9, cellPadding: 5 }
        });
        currentY = (doc as any).lastAutoTable.finalY + 30;
    } else {
        currentY += 20;
    }
    
    currentY += 10;
    doc.setFontSize(14); doc.setTextColor(darkBg[0], darkBg[1], darkBg[2]);
    doc.text('Staff Payments Ledger', 40, currentY);
    currentY += 15;
    
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
            theme: 'grid',
            headStyles: { fillColor: [16, 185, 129], textColor: 255 },
            styles: { fontSize: 9, cellPadding: 5 }
        });
    }
    
    const safeName = (data.salonName || 'Salon').replace(/[^a-z0-9]/gi, '_').toLowerCase();
    doc.save(`${safeName}_master_report_${data.dateRangeStr.replace(/\s+/g, '_')}.pdf`);
};

export const generatePayslipPDF = ({ salonName, payrollRun }: { salonName: string, payrollRun: any }) => {
    // A4 Portrait
    const doc = new jsPDF('p', 'pt', 'a4');
    
    // Branding Colors
    const primaryColor = [212, 175, 55]; // #D4AF37 Luxe Gold
    const darkBg = [26, 26, 26];         // #1A1A1A Obsidian
    
    // Header
    doc.setFillColor(darkBg[0], darkBg[1], darkBg[2]);
    doc.rect(0, 0, doc.internal.pageSize.getWidth(), 120, 'F');
    
    doc.setFontSize(26);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFont('helvetica', 'bold');
    doc.text((salonName || 'Salon').toUpperCase(), 40, 50);
    
    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'normal');
    doc.text('STAFF PAYSLIP', 40, 75);
    
    // Period details
    doc.setFontSize(10);
    doc.setTextColor(150, 150, 150);
    const d1 = new Date(payrollRun.period_start).toLocaleDateString();
    const d2 = new Date(payrollRun.period_end).toLocaleDateString();
    doc.text(`Pay Period: ${d1} - ${d2}`, 40, 100);
    
    // Staff Info
    const staffName = payrollRun.staff?.full_name || 'Staff Member';
    doc.setFontSize(14);
    doc.setTextColor(darkBg[0], darkBg[1], darkBg[2]);
    doc.setFont('helvetica', 'bold');
    doc.text('Employee Information', 40, 160);
    doc.setLineWidth(1);
    doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.line(40, 170, 550, 170); // divider
    
    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    doc.text('Name:', 40, 195);
    doc.setTextColor(darkBg[0], darkBg[1], darkBg[2]);
    doc.text(staffName.toUpperCase(), 120, 195);
    
    doc.setTextColor(100, 100, 100);
    doc.text('Role:', 40, 215);
    doc.setTextColor(darkBg[0], darkBg[1], darkBg[2]);
    doc.text('Stylist / Specialist', 120, 215);
    
    doc.setTextColor(100, 100, 100);
    doc.text('Status:', 350, 195);
    doc.setTextColor(darkBg[0], darkBg[1], darkBg[2]);
    doc.text((payrollRun.status || 'draft').toUpperCase(), 400, 195);

    // Earnings breakdown
    doc.setFontSize(14);
    doc.setTextColor(darkBg[0], darkBg[1], darkBg[2]);
    doc.setFont('helvetica', 'bold');
    doc.text('Earnings Breakdown', 40, 260);
    doc.line(40, 270, 550, 270); // divider
    
    const tableData = [
        ['Base Salary Allocation', `$${Number(payrollRun.base_salary_allocated || 0).toFixed(2)}`],
        ['Commissions from Services', `$${Number(payrollRun.total_commission || 0).toFixed(2)}`],
        ['Tips Received', `$${Number(payrollRun.total_tips || 0).toFixed(2)}`],
    ];
    
    autoTable(doc, {
        startY: 280,
        head: [['Description', 'Amount']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [40, 40, 40], textColor: 255 },
        styles: { fontSize: 11, cellPadding: 8 }
    });
    
    const finalY = (doc as any).lastAutoTable.finalY + 30;
    
    // Deductions
    doc.setFontSize(14);
    doc.setTextColor(darkBg[0], darkBg[1], darkBg[2]);
    doc.setFont('helvetica', 'bold');
    doc.text('Deductions & Advances', 40, finalY);
    doc.line(40, finalY + 10, 550, finalY + 10);
    
    autoTable(doc, {
        startY: finalY + 20,
        head: [['Description', 'Amount']],
        body: [['Advances Taken / Miscellaneous Deductions', `-$${Number(payrollRun.deductions || 0).toFixed(2)}`]],
        theme: 'grid',
        headStyles: { fillColor: [220, 53, 69], textColor: 255 }, // Red heading
        styles: { fontSize: 11, cellPadding: 8 }
    });
    
    const finalY2 = (doc as any).lastAutoTable.finalY + 40;
    
    // Net Payout Box
    doc.setFillColor(250, 250, 250);
    doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setLineWidth(2);
    doc.rect(350, finalY2, 200, 70, 'FD'); // box
    
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.setFont('helvetica', 'bold');
    doc.text('NET PAYOUT', 370, finalY2 + 25);
    
    doc.setFontSize(22);
    doc.setTextColor(16, 185, 129); // Green
    doc.text(`$${Number(payrollRun.net_payout || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 370, finalY2 + 55);

    // Footer
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(150, 150, 150);
    doc.setLineWidth(0.5);
    doc.setDrawColor(200, 200, 200);
    doc.line(40, pageHeight - 50, 550, pageHeight - 50);
    doc.text(`This is an automatically generated document by ${salonName || 'Salon'} ERP.`, 40, pageHeight - 35);
    doc.text(`Run ID: ${payrollRun.id}`, 40, pageHeight - 20);

    const safeFilename = `${staffName.replace(/\s+/g, '_')}_Payslip_${d1.replace(/\//g, '-')}.pdf`;
    doc.save(safeFilename);
};
