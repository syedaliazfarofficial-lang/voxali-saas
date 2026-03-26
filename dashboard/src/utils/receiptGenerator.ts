import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import autoTable from 'jspdf-autotable';

export interface ReceiptItem {
    name: string;
    qty: number;
    price: number;
}

export interface ReceiptData {
    salonName: string;
    logoUrl?: string | null;
    clientName?: string;
    cashierName?: string;
    ticketNumber: string;
    date: Date;
    items: ReceiptItem[];
    subtotal: number;
    tax?: number;
    tip: number;
    total: number;
    paymentMethod: string;
}

// Helper to fetch logo image
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
        console.warn('Failed to load branding logo for Receipt', e);
        return null;
    }
};

export const generateReceiptPDF = async (data: ReceiptData) => {
    // Thermal receipt style (width ~80mm = ~226pt)
    const doc = new jsPDF('p', 'pt', [226, 600]); 
    let currentY = 20;
    const centerX = 113;

    let logoBase64: string | null = null;
    if (data.logoUrl) {
        logoBase64 = await getBase64ImageFromUrl(data.logoUrl);
    }

    // Logo / Salon Name
    if (logoBase64) {
        try {
            doc.addImage(logoBase64, 'PNG', centerX - 20, currentY, 40, 40);
            currentY += 50;
        } catch(e) { console.error('Logo draw error:', e); }
    }
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text((data.salonName || 'Voxali Salon').toUpperCase(), centerX, currentY, { align: 'center' });
    
    currentY += 15;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    
    const dateStr = data.date.toLocaleString();
    doc.text(`Receipt #${data.ticketNumber}`, centerX, currentY, { align: 'center' });
    currentY += 12;
    doc.text(dateStr, centerX, currentY, { align: 'center' });
    currentY += 12;

    if (data.clientName) {
        doc.text(`Client: ${data.clientName}`, centerX, currentY, { align: 'center' });
        currentY += 12;
    }
    if (data.cashierName) {
        doc.text(`Served By: ${data.cashierName}`, centerX, currentY, { align: 'center' });
        currentY += 12;
    }

    currentY += 10;
    doc.setLineWidth(0.5);
    doc.setLineDashPattern([2, 2], 0);
    doc.line(10, currentY, 216, currentY); // Dashed line
    doc.setLineDashPattern([], 0); // reset

    currentY += 15;

    // Items
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Qty', 10, currentY);
    doc.text('Item', 35, currentY);
    doc.text('Amount', 216, currentY, { align: 'right' });
    
    currentY += 10;
    doc.setFont('helvetica', 'normal');

    data.items.forEach(item => {
        // Truncate name to avoid wrapping issues in a small receipt
        const displayLabel = item.name.length > 20 ? item.name.substring(0, 18) + '...' : item.name;
        
        doc.text(`${item.qty}`, 10, currentY);
        doc.text(displayLabel, 35, currentY);
        doc.text(`$${(item.price * item.qty).toFixed(2)}`, 216, currentY, { align: 'right' });
        currentY += 15;
    });

    currentY += 5;
    doc.setLineDashPattern([2, 2], 0);
    doc.line(10, currentY, 216, currentY);
    doc.setLineDashPattern([], 0);

    currentY += 15;

    // Totals
    doc.setFontSize(9);
    doc.text('Subtotal:', 10, currentY);
    doc.text(`$${data.subtotal.toFixed(2)}`, 216, currentY, { align: 'right' });
    currentY += 12;

    if (data.tax && data.tax > 0) {
        doc.text('Tax:', 10, currentY);
        doc.text(`$${data.tax.toFixed(2)}`, 216, currentY, { align: 'right' });
        currentY += 12;
    }

    if (data.tip > 0) {
        doc.text('Tip:', 10, currentY);
        doc.text(`$${data.tip.toFixed(2)}`, 216, currentY, { align: 'right' });
        currentY += 12;
    }

    currentY += 5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('TOTAL:', 10, currentY);
    doc.text(`$${data.total.toFixed(2)}`, 216, currentY, { align: 'right' });

    currentY += 15;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`Payment Method: ${data.paymentMethod.toUpperCase()}`, 10, currentY);
    
    currentY += 25;
    doc.setFont('helvetica', 'italic');
    doc.text('Thank you for your visit!', centerX, currentY, { align: 'center' });
    
    // Auto-adjust page height to content height so it's a dynamic rolling receipt length
    const totalHeight = currentY + 30;
    
    // Internal hack for exact length thermal receipts if needed, but for browser PDF printing standard A4 or exact size works.
    // jsPDF doesn't allow dynamically changing height after creation, so sticking to 600pt default.
    // However, saving it will download a tall thin strip exactly like a POS machine!
    
    // Trigger download
    const filename = `Receipt_${data.ticketNumber}.pdf`;
    doc.save(filename);
};
