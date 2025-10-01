import jsPDF from 'jspdf';
import 'jspdf-autotable';

type OrderItem = {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  product_sku: string;
  product_image?: string;
  size?: string;
  color?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
};

type Order = {
  id: string;
  user_id: string;
  order_number: string;
  status: string;
  total_amount: number;
  shipping_address?: string;
  billing_address?: string;
  payment_method?: string;
  payment_status?: string;
  notes?: string;
  created_at: string;
  order_items?: OrderItem[];
  user?: {
    name?: string;
    email?: string;
    phone?: string;
  };
};

export function generateOrderPdf(order: Order) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });

  const marginLeft = 40;
  let cursorY = 50;

  const formatINR = (amount: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(Number(amount || 0));

  // Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(`Order #${order.order_number}`, marginLeft, cursorY);
  cursorY += 22;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(`Date: ${new Date(order.created_at).toLocaleString()}`, marginLeft, cursorY);
  cursorY += 16;
  doc.text(`Status: ${order.status}`, marginLeft, cursorY);
  cursorY += 16;
  doc.text(`Payment: ${order.payment_method || 'N/A'} (${order.payment_status || 'N/A'})`, marginLeft, cursorY);
  cursorY += 24;

  // Customer
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('Customer', marginLeft, cursorY);
  cursorY += 16;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(`Name: ${order.user?.name || 'N/A'}`, marginLeft, cursorY);
  cursorY += 14;
  doc.text(`Email: ${order.user?.email || 'N/A'}`, marginLeft, cursorY);
  cursorY += 14;
  doc.text(`Phone: ${order.user?.phone || 'N/A'}`, marginLeft, cursorY);
  cursorY += 22;

  // Addresses
  const shipping = order.shipping_address || 'N/A';
  const billing = order.billing_address || 'N/A';
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('Addresses', marginLeft, cursorY);
  cursorY += 16;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  const shippingLines = doc.splitTextToSize(`Shipping: ${shipping}`, 515 - marginLeft);
  doc.text(shippingLines, marginLeft, cursorY);
  cursorY += shippingLines.length * 14 + 6;
  const billingLines = doc.splitTextToSize(`Billing: ${billing}`, 515 - marginLeft);
  doc.text(billingLines, marginLeft, cursorY);
  cursorY += billingLines.length * 14 + 20;

  // Items table
  const autoTable: any = (doc as any).autoTable;
  if (autoTable && order.order_items && order.order_items.length > 0) {
    autoTable({
      head: [[
        'Product', 'SKU', 'Size', 'Color', 'Qty', 'Unit Price', 'Total'
      ]],
      body: order.order_items.map((it) => [
        it.product_name,
        it.product_sku,
        it.size || '-',
        it.color || '-',
        String(it.quantity),
        formatINR(Number(it.unit_price)),
        formatINR(Number(it.total_price))
      ]),
      startY: cursorY,
      styles: { fontSize: 10 },
      headStyles: { fillColor: [240, 240, 240] },
      margin: { left: marginLeft, right: 40 }
    });
    cursorY = (doc as any).lastAutoTable.finalY + 16;
  }

  // Totals and notes
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(`Grand Total: ${formatINR(Number(order.total_amount))}`, marginLeft, cursorY);
  cursorY += 18;

  if (order.notes) {
    doc.setFont('helvetica', 'bold');
    doc.text('Notes', marginLeft, cursorY);
    cursorY += 14;
    doc.setFont('helvetica', 'normal');
    const noteLines = doc.splitTextToSize(order.notes, 515 - marginLeft);
    doc.text(noteLines, marginLeft, cursorY);
    cursorY += noteLines.length * 14;
  }

  const filename = `order_${order.order_number}.pdf`;
  doc.save(filename);
}


