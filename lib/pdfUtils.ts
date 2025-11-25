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
  hsn_code?: string;
  tax_type?: string;
  tax_rate?: number;
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

// Helper function to convert number to words
function numberToWords(num: number): string {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  
  if (num === 0) return 'Zero';
  if (num < 20) return ones[num];
  if (num < 100) {
    const ten = Math.floor(num / 10);
    const one = num % 10;
    return tens[ten] + (one > 0 ? ' ' + ones[one] : '');
  }
  if (num < 1000) {
    const hundred = Math.floor(num / 100);
    const remainder = num % 100;
    return ones[hundred] + ' Hundred' + (remainder > 0 ? ' ' + numberToWords(remainder) : '');
  }
  if (num < 100000) {
    const thousand = Math.floor(num / 1000);
    const remainder = num % 1000;
    return numberToWords(thousand) + ' Thousand' + (remainder > 0 ? ' ' + numberToWords(remainder) : '');
  }
  if (num < 10000000) {
    const lakh = Math.floor(num / 100000);
    const remainder = num % 100000;
    return numberToWords(lakh) + ' Lakh' + (remainder > 0 ? ' ' + numberToWords(remainder) : '');
  }
  const crore = Math.floor(num / 10000000);
  const remainder = num % 10000000;
  return numberToWords(crore) + ' Crore' + (remainder > 0 ? ' ' + numberToWords(remainder) : '');
}

function formatAmountInWords(amount: number): string {
  const rupees = Math.floor(amount);
  const paise = Math.round((amount - rupees) * 100);
  let words = numberToWords(rupees) + ' Rupees';
  if (paise > 0) {
    words += ' and ' + numberToWords(paise) + ' Paise';
  }
  return words + ' only';
}

// Parse address string to extract components
function parseAddress(address: string) {
  if (!address) return { name: '', address: '', state: '', pincode: '', stateCode: '' };
  
  const lines = address.split(',').map(s => s.trim());
  const name = lines[0] || '';
  const pincodeMatch = address.match(/\b\d{6}\b/);
  const pincode = pincodeMatch ? pincodeMatch[0] : '';
  
  // Try to extract state (usually second to last or last)
  let state = '';
  let stateCode = '';
  const statePatterns = [
    /(ANDHRA PRADESH|TAMIL NADU|KARNATAKA|KERALA|MAHARASHTRA|GUJARAT|RAJASTHAN|PUNJAB|HARYANA|UTTAR PRADESH|WEST BENGAL|BIHAR|ODISHA|MADHYA PRADESH|JHARKHAND|ASSAM|CHHATTISGARH|HIMACHAL PRADESH|UTTARAKHAND|GOA|MANIPUR|MEGHALAYA|NAGALAND|TRIPURA|ARUNACHAL PRADESH|MIZORAM|SIKKIM|DELHI|PUDUCHERRY|CHANDIGARH|DADRA AND NAGAR HAVELI|DAMAN AND DIU|LAKSHADWEEP|JAMMU AND KASHMIR|LADAKH)/i
  ];
  
  for (const pattern of statePatterns) {
    const match = address.match(pattern);
    if (match) {
      state = match[1].toUpperCase();
      // Simple state code mapping (you may want to expand this)
      const stateCodeMap: { [key: string]: string } = {
        'ANDHRA PRADESH': '37',
        'TAMIL NADU': '33',
        'KARNATAKA': '29',
        'KERALA': '32',
        'MAHARASHTRA': '27',
        'GUJARAT': '24',
        'RAJASTHAN': '08',
        'PUNJAB': '03',
        'HARYANA': '06',
        'UTTAR PRADESH': '09',
        'WEST BENGAL': '19',
        'BIHAR': '10',
        'ODISHA': '21',
        'MADHYA PRADESH': '23',
        'JHARKHAND': '20',
        'ASSAM': '18',
        'CHHATTISGARH': '22',
        'HIMACHAL PRADESH': '02',
        'UTTARAKHAND': '05',
        'GOA': '30',
        'DELHI': '07',
      };
      stateCode = stateCodeMap[state] || '';
      break;
    }
  }
  
  const addressLines = lines.slice(1).join(', ');
  
  return { name, address: addressLines, state, pincode, stateCode };
}

export async function generateOrderPdf(order: Order) {
  // Debug: Log order data to see what we're receiving
  console.log('Generating PDF for order:', order.order_number);
  console.log('Order items count:', order.order_items?.length || 0);
  console.log('Order items:', order.order_items);
  
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginLeft = 40;
  const marginRight = 40;
  const marginTop = 40;
  let cursorY = marginTop;

  const formatINR = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { 
      maximumFractionDigits: 2,
      minimumFractionDigits: 2
    }).format(Number(amount || 0));
  };

  const formatNumber = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { 
      maximumFractionDigits: 2,
      minimumFractionDigits: 2
    }).format(Number(amount || 0));
  };

  // Default seller information (can be made configurable)
  const sellerInfo = {
    name: 'ONLY2U',
    address: 'FLAT NO I, 9-1-87, MEGHANA MANOR APPARTMENTS, Old Lancer Lane, Regimental Bazaar, Secunderabad, Hyderabad, Telangana, 500003, IN',
    pan: 'AAECO9300L',
    gstin: '36AAECO9300L1Z9',
  };

  // Parse addresses
  const billingAddress = parseAddress(order.billing_address || '');
  const shippingAddress = parseAddress(order.shipping_address || '');
  const placeOfSupply = shippingAddress.state || 'N/A';
  const placeOfDelivery = shippingAddress.state || 'N/A';

  // Calculate totals and tax breakdown
  // Default GST rate is 18% if not specified
  const DEFAULT_GST_RATE = 18;
  const DEFAULT_TAX_TYPE = 'IGST';
  
  // Define orderDate and formattedDate at the top level so they're available throughout
  const orderDate = new Date(order.created_at);
  const formattedDate = orderDate.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const invoiceNumber = `INV-${order.order_number}`;
  
  let totalNetAmount = 0;
  let totalTaxAmount = 0;
  // Use order_items from the order - these contain product_name, quantity, unit_price, etc.
  const items = order.order_items || [];
  
  // Validate that we have order items
  if (items.length === 0) {
    console.error('No order items found for order:', order.order_number);
    console.error('Order object:', order);
    // Show error message in PDF
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(255, 0, 0);
    doc.text('ERROR: No order items found for this order', marginLeft, cursorY);
    cursorY += 20;
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Order Number: ${order.order_number}`, marginLeft, cursorY);
    cursorY += 14;
    doc.text('Please ensure order items are loaded before generating PDF.', marginLeft, cursorY);
    doc.save(`invoice_${order.order_number}_error.pdf`);
    return;
  }
  
  // Tax breakdown by type and rate
  const taxBreakdown: { [key: string]: { rate: number; amount: number; netAmount: number } } = {};
  
  items.forEach(item => {
    // The unit_price is the final price (inclusive of tax)
    // Net Amount = Total Amount (they are the same)
    const totalAmount = Number(item.unit_price) * Number(item.quantity);
    totalNetAmount += totalAmount;
    
    // Calculate tax portion from the total amount
    // If total is ₹1,180 with 18% tax, tax = 1,180 × 18 / 118 = ₹180
    // Use default 18% GST if tax_rate is 0, null, or undefined
    const taxRate = (item.tax_rate && item.tax_rate > 0) ? item.tax_rate : DEFAULT_GST_RATE;
    // Tax amount = (Total × Tax Rate) / (100 + Tax Rate)
    // This gives us the tax portion included in the total
    const taxAmount = (totalAmount * taxRate) / (100 + taxRate);
    totalTaxAmount += taxAmount;
    
    // Group taxes by type and rate
    const taxType = item.tax_type || DEFAULT_TAX_TYPE;
    const taxKey = `${taxType}-${taxRate}`;
    if (!taxBreakdown[taxKey]) {
      taxBreakdown[taxKey] = { rate: taxRate, amount: 0, netAmount: 0 };
    }
    taxBreakdown[taxKey].amount += taxAmount;
    taxBreakdown[taxKey].netAmount += totalAmount; // Use total amount for breakdown
  });

  // Total amount = Net amount (they are the same)
  // Tax breakdown shows the tax portion included in that total
  const invoiceTotal = totalNetAmount;

  // Header Section with Box - Increased height for larger logo
  const headerBoxHeight = 70; // Increased from 50 to 70
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.rect(marginLeft, 20, pageWidth - marginLeft - marginRight, headerBoxHeight);
  
  // Add logo from public folder
  // For Next.js, public folder assets are accessible at root path
  const logoUrl = '/label.png';
  const logoHeight = 60; // Increased from 40 to 60
  const logoWidth = 150; // Increased from 100 to 150
  
  // Load image and convert to base64 for jsPDF
  try {
    // Load image asynchronously
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    // Wait for image to load
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = logoUrl;
      
      // If image is already cached, resolve immediately
      if (img.complete) {
        resolve(null);
      }
    });
    
    // Convert image to base64 data URL
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(img, 0, 0);
      const dataUrl = canvas.toDataURL('image/png');
      // Position logo more prominently - centered vertically in header box
      const logoY = 20 + (headerBoxHeight - logoHeight) / 2; // Center vertically in header box
      doc.addImage(dataUrl, 'PNG', marginLeft + 10, logoY, logoWidth, logoHeight);
    }
  } catch (error) {
    console.warn('Could not load logo image, using text fallback:', error);
    // Fallback to text if image fails to load
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(28);
    doc.setTextColor(0, 0, 0);
    const textY = 20 + headerBoxHeight / 2; // Center vertically
    doc.text('ONLY2U', marginLeft + 10, textY);
  }
  
  // Invoice Title (centered)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  const titleY = 20 + headerBoxHeight / 2 - 8;
  doc.text('TAX INVOICE', pageWidth / 2, titleY, { align: 'center' });
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const subtitleY = titleY + 12;
  doc.text('(Original for Recipient)', pageWidth / 2, subtitleY, { align: 'center' });
  
  cursorY = 20 + headerBoxHeight + 10;

  // Seller Information Box (Left side, full width for now)
  const sellerBoxY = cursorY;
  const sellerBoxHeight = 75;
  const sellerBoxWidth = 180;
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.rect(marginLeft, sellerBoxY, sellerBoxWidth, sellerBoxHeight);
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text('SOLD BY', marginLeft + 5, sellerBoxY + 8);
  
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.2);
  doc.line(marginLeft + 2, sellerBoxY + 12, marginLeft + sellerBoxWidth - 2, sellerBoxY + 12);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  let sellerTextY = sellerBoxY + 20;
  doc.text(sellerInfo.name, marginLeft + 5, sellerTextY);
  sellerTextY += 10;
  
  const sellerAddressLines = doc.splitTextToSize(sellerInfo.address, sellerBoxWidth - 10);
  sellerAddressLines.forEach((line: string) => {
    doc.text(line, marginLeft + 5, sellerTextY);
    sellerTextY += 9;
  });
  
  doc.text(`PAN: ${sellerInfo.pan}`, marginLeft + 5, sellerTextY);
  sellerTextY += 9;
  doc.text(`GSTIN: ${sellerInfo.gstin}`, marginLeft + 5, sellerTextY);
  
  cursorY = sellerBoxY + sellerBoxHeight + 15;

  // Billing and Shipping Address Boxes (Side by Side) - Fixed Layout
  const addressBoxY = cursorY;
  const addressBoxHeight = 80;
  const availableWidth = pageWidth - marginLeft - marginRight;
  const addressGap = 15;
  // Calculate box width to fit three boxes with gaps
  const addressBoxWidth = Math.floor((availableWidth - (addressGap * 2)) / 3);
  
  // Billing Address Box (Left)
  const billingX = marginLeft;
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.rect(billingX, addressBoxY, addressBoxWidth, addressBoxHeight);
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('BILLING ADDRESS', billingX + 5, addressBoxY + 8);
  
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.2);
  doc.line(billingX + 2, addressBoxY + 12, billingX + addressBoxWidth - 2, addressBoxY + 12);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  let billingTextY = addressBoxY + 20;
  doc.text(billingAddress.name || order.user?.name || 'N/A', billingX + 5, billingTextY);
  billingTextY += 10;
  
  const billingAddressLines = doc.splitTextToSize(billingAddress.address || order.billing_address || 'N/A', addressBoxWidth - 10);
  billingAddressLines.forEach((line: string) => {
    doc.text(line, billingX + 5, billingTextY);
    billingTextY += 9;
  });
  
  if (billingAddress.stateCode) {
    doc.text(`State Code: ${billingAddress.stateCode}`, billingX + 5, billingTextY);
  }

  // Shipping Address Box (Middle)
  const shippingX = billingX + addressBoxWidth + addressGap;
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.rect(shippingX, addressBoxY, addressBoxWidth, addressBoxHeight);
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('SHIPPING ADDRESS', shippingX + 5, addressBoxY + 8);
  
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.2);
  doc.line(shippingX + 2, addressBoxY + 12, shippingX + addressBoxWidth - 2, addressBoxY + 12);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  let shippingTextY = addressBoxY + 20;
  doc.text(shippingAddress.name || order.user?.name || 'N/A', shippingX + 5, shippingTextY);
  shippingTextY += 10;
  
  const shippingAddressLines = doc.splitTextToSize(shippingAddress.address || order.shipping_address || 'N/A', addressBoxWidth - 10);
  shippingAddressLines.forEach((line: string) => {
    doc.text(line, shippingX + 5, shippingTextY);
    shippingTextY += 9;
  });
  
  if (shippingAddress.stateCode) {
    doc.text(`State Code: ${shippingAddress.stateCode}`, shippingX + 5, shippingTextY);
    shippingTextY += 9;
  }
  doc.setFontSize(8);
  doc.text(`Place of Supply: ${placeOfSupply}`, shippingX + 5, shippingTextY);
  shippingTextY += 8;
  doc.text(`Place of Delivery: ${placeOfDelivery}`, shippingX + 5, shippingTextY);
  
  // Order and Invoice Details Box (Right) - Ensure it fits
  const orderDetailsX = shippingX + addressBoxWidth + addressGap;
  const orderDetailsBoxY = addressBoxY;
  const orderDetailsBoxHeight = addressBoxHeight;
  // Use remaining width for order details box
  const orderDetailsBoxWidth = pageWidth - marginRight - orderDetailsX;
  
  // Only draw if there's enough space
  if (orderDetailsBoxWidth > 100 && orderDetailsX + orderDetailsBoxWidth <= pageWidth - marginRight) {
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.rect(orderDetailsX, orderDetailsBoxY, orderDetailsBoxWidth, orderDetailsBoxHeight);
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('ORDER DETAILS', orderDetailsX + 5, orderDetailsBoxY + 8);
    
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.2);
    doc.line(orderDetailsX + 2, orderDetailsBoxY + 12, orderDetailsX + orderDetailsBoxWidth - 2, orderDetailsBoxY + 12);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    let orderTextY = orderDetailsBoxY + 20;
    doc.text(`Order No:`, orderDetailsX + 5, orderTextY);
    doc.setFontSize(8);
    const orderNoLines = doc.splitTextToSize(order.order_number, orderDetailsBoxWidth - 60);
    doc.text(orderNoLines[0] || order.order_number, orderDetailsX + orderDetailsBoxWidth - 5, orderTextY, { align: 'right' });
    orderTextY += 10;
    
    doc.setFontSize(9);
    doc.text(`Order Date:`, orderDetailsX + 5, orderTextY);
    doc.text(`${formattedDate}`, orderDetailsX + orderDetailsBoxWidth - 5, orderTextY, { align: 'right' });
    orderTextY += 10;
    doc.text(`Invoice No:`, orderDetailsX + 5, orderTextY);
    doc.setFontSize(8);
    const invoiceNoLines = doc.splitTextToSize(invoiceNumber, orderDetailsBoxWidth - 60);
    doc.text(invoiceNoLines[0] || invoiceNumber, orderDetailsX + orderDetailsBoxWidth - 5, orderTextY, { align: 'right' });
    orderTextY += 10;
    doc.setFontSize(9);
    doc.text(`Invoice Date:`, orderDetailsX + 5, orderTextY);
    doc.text(`${formattedDate}`, orderDetailsX + orderDetailsBoxWidth - 5, orderTextY, { align: 'right' });
  } else {
    // If order details box doesn't fit, place it below addresses
    const orderDetailsBoxYBelow = addressBoxY + addressBoxHeight + 15;
    const orderDetailsBoxHeightBelow = 50;
    const orderDetailsBoxWidthBelow = 180;
    const orderDetailsXBelow = pageWidth - marginRight - orderDetailsBoxWidthBelow;
    
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.rect(orderDetailsXBelow, orderDetailsBoxYBelow, orderDetailsBoxWidthBelow, orderDetailsBoxHeightBelow);
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('ORDER DETAILS', orderDetailsXBelow + 5, orderDetailsBoxYBelow + 8);
    
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.2);
    doc.line(orderDetailsXBelow + 2, orderDetailsBoxYBelow + 12, orderDetailsXBelow + orderDetailsBoxWidthBelow - 2, orderDetailsBoxYBelow + 12);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    let orderTextY = orderDetailsBoxYBelow + 20;
    doc.text(`Order No: ${order.order_number}`, orderDetailsXBelow + 5, orderTextY);
    orderTextY += 10;
    doc.text(`Order Date: ${formattedDate}`, orderDetailsXBelow + 5, orderTextY);
    orderTextY += 10;
    doc.text(`Invoice No: ${invoiceNumber}`, orderDetailsXBelow + 5, orderTextY);
    orderTextY += 10;
    doc.text(`Invoice Date: ${formattedDate}`, orderDetailsXBelow + 5, orderTextY);
    
    cursorY = orderDetailsBoxYBelow + orderDetailsBoxHeightBelow + 15;
  }
  
  cursorY = addressBoxY + addressBoxHeight + 20;

  // Item Particulars Section
  if (items && items.length > 0) {
    const itemsSectionY = cursorY;
    
    // Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('ITEM PARTICULARS', marginLeft + 5, itemsSectionY + 12);
    
    cursorY = itemsSectionY + 25;
    
    // Table Headers - Matching the invoice format
    doc.setDrawColor(200, 200, 200);
    doc.setFillColor(240, 240, 240);
    doc.setLineWidth(0.3);
    doc.rect(marginLeft, cursorY - 5, pageWidth - marginLeft - marginRight, 20, 'FD');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.text('Sl. No', marginLeft + 5, cursorY + 5);
    doc.text('Description', marginLeft + 35, cursorY + 5);
    doc.text('Unit Price', marginLeft + 180, cursorY + 5);
    doc.text('Tax Rate', marginLeft + 260, cursorY + 5);
    doc.text('Tax Type', marginLeft + 320, cursorY + 5);
    doc.text('Tax Amount', marginLeft + 380, cursorY + 5);
    doc.text('Total Amount', marginLeft + 450, cursorY + 5);
    doc.text('Qty', marginLeft + 520, cursorY + 5);
    
    cursorY += 20;
    
    // Items List
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    
    items.forEach((item, index) => {
      // Check if we need a new page
      if (cursorY > pageHeight - 100) {
        doc.addPage();
        cursorY = marginTop + 20;
      }
      
      const productName = item.product_name || 'Product';
      const quantity = Number(item.quantity) || 0;
      const unitPrice = Number(item.unit_price) || 0;
      const productSku = item.product_sku || '';
      const size = item.size || '';
      const color = item.color || '';
      const hsnCode = item.hsn_code || '';
      
      // Calculate tax for this item
      // Since unit_price is inclusive of tax, we need to calculate backwards
      const taxRate = (item.tax_rate && item.tax_rate > 0) ? item.tax_rate : DEFAULT_GST_RATE;
      const taxType = item.tax_type || DEFAULT_TAX_TYPE;
      
      // Calculate: If total is inclusive, extract net and tax
      // Total = Net + Tax, and Tax = Net × Rate / 100
      // So: Total = Net + (Net × Rate / 100) = Net × (1 + Rate/100)
      // Therefore: Net = Total / (1 + Rate/100)
      const totalAmount = unitPrice * quantity;
      const netAmount = totalAmount / (1 + taxRate / 100);
      const taxAmount = totalAmount - netAmount;
      
      // Build description with HSN code
      const descriptionParts = [productName];
      if (productSku) descriptionParts.push(`SKU: ${productSku}`);
      if (size) descriptionParts.push(`Size: ${size}`);
      if (color) descriptionParts.push(`Color: ${color}`);
      if (hsnCode) descriptionParts.push(`HSN: ${hsnCode}`);
      const description = descriptionParts.join(' | ');
      
      // Wrap description if too long
      const maxDescWidth = 140;
      const descLines = doc.splitTextToSize(description, maxDescWidth);
      const itemHeight = Math.max(12, descLines.length * 10);
      
      // Draw item row background (white, alternating for readability)
      if (index % 2 === 0) {
        doc.setFillColor(255, 255, 255);
      } else {
        doc.setFillColor(250, 250, 250);
      }
      doc.rect(marginLeft, cursorY - itemHeight + 2, pageWidth - marginLeft - marginRight, itemHeight, 'F');
      
      // Serial Number
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(String(index + 1), marginLeft + 5, cursorY);
      
      // Description (may span multiple lines)
      let descY = cursorY;
      descLines.forEach((line: string, lineIndex: number) => {
        doc.text(line, marginLeft + 35, descY);
        if (lineIndex < descLines.length - 1) {
          descY += 10;
        }
      });
      
      // Unit Price (showing net amount per unit)
      doc.text(formatINR(netAmount / quantity), marginLeft + 180, cursorY);
      
      // Tax Rate
      doc.text(`${formatNumber(taxRate)}%`, marginLeft + 260, cursorY);
      
      // Tax Type
      doc.text(taxType, marginLeft + 320, cursorY);
      
      // Tax Amount
      doc.text(formatINR(taxAmount), marginLeft + 380, cursorY);
      
      // Total Amount (showing total price including tax)
      doc.setFont('helvetica', 'bold');
      doc.text(formatINR(totalAmount), marginLeft + 450, cursorY);
      doc.setFont('helvetica', 'normal');
      
      // Quantity
      doc.text(String(quantity), marginLeft + 520, cursorY);
      
      // Move to next item
      cursorY += itemHeight + 2;
      
      // Add separator line between items
      if (index < items.length - 1) {
        doc.setDrawColor(240, 240, 240);
        doc.setLineWidth(0.1);
        doc.line(marginLeft + 5, cursorY - 1, marginLeft + pageWidth - marginLeft - marginRight - 5, cursorY - 1);
        cursorY += 2;
      }
    });
    
    // Draw bottom border
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.line(marginLeft, cursorY, marginLeft + pageWidth - marginLeft - marginRight, cursorY);
    
    cursorY += 15;
  } else {
    // No items message
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('No items found in this order.', marginLeft, cursorY);
    cursorY += 20;
  }

  // Amount Details Section - Clean Layout
  const summarySectionY = cursorY;
  const summarySectionHeight = 100;
  
  // Create a single summary box spanning the width
  const summaryBoxWidth = pageWidth - marginLeft - marginRight;
  const summaryBoxX = marginLeft;
  const summaryBoxY = summarySectionY;
  
  // Main Summary Box
  doc.setDrawColor(50, 50, 50);
  doc.setLineWidth(0.5);
  doc.rect(summaryBoxX, summaryBoxY, summaryBoxWidth, summarySectionHeight);
  
  // Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(255, 255, 255);
  doc.setFillColor(50, 50, 50);
  doc.rect(summaryBoxX, summaryBoxY, summaryBoxWidth, 18, 'F');
  doc.text('INVOICE SUMMARY', summaryBoxX + summaryBoxWidth / 2, summaryBoxY + 12, { align: 'center' });
  
  doc.setTextColor(0, 0, 0);
  let summaryTextY = summaryBoxY + 30;
  
  // Left side - Tax Breakdown
  const leftColumnX = summaryBoxX + 10;
  const rightColumnX = summaryBoxX + summaryBoxWidth / 2 + 10;
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Tax Breakdown:', leftColumnX, summaryTextY);
  summaryTextY += 12;
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  
  // Group by tax type (IGST first, then SGST)
  const taxTypes = ['IGST', 'SGST'];
  let hasTaxBreakdown = false;
  
  taxTypes.forEach(taxType => {
    const matchingKeys = Object.keys(taxBreakdown).filter(key => key.startsWith(taxType));
    if (matchingKeys.length > 0) {
      matchingKeys.forEach(key => {
        const breakdown = taxBreakdown[key];
        doc.text(
          `${taxType} @ ${formatNumber(breakdown.rate)}%: ${formatINR(breakdown.amount)}`,
          leftColumnX + 5,
          summaryTextY
        );
        summaryTextY += 10;
        hasTaxBreakdown = true;
      });
    }
  });
  
  // If no tax breakdown found, show total tax
  if (!hasTaxBreakdown && totalTaxAmount > 0) {
    doc.text(`Total Tax: ${formatINR(totalTaxAmount)}`, leftColumnX + 5, summaryTextY);
    summaryTextY += 10;
  }
  
  // Right side - Amount Summary
  let amountTextY = summaryBoxY + 30;
  const amountValueX = summaryBoxX + summaryBoxWidth - 120; // Fixed position for amounts, not all the way right
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Net Amount:', rightColumnX, amountTextY);
  doc.setFont('helvetica', 'bold');
  doc.text(formatINR(totalNetAmount), amountValueX, amountTextY);
  amountTextY += 12;
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text(`(Tax included: ${formatINR(totalTaxAmount)})`, amountValueX, amountTextY);
  amountTextY += 15;
  
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(rightColumnX, amountTextY, summaryBoxX + summaryBoxWidth - 10, amountTextY);
  amountTextY += 12;
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text('TOTAL:', rightColumnX, amountTextY);
  doc.text(formatINR(invoiceTotal), amountValueX, amountTextY);
  
  cursorY = summaryBoxY + summarySectionHeight + 15;

  // Amount in Words Box
  const amountWordsBoxY = cursorY;
  const amountWordsBoxHeight = 20;
  
  doc.setDrawColor(240, 240, 240);
  doc.setFillColor(240, 240, 240);
  doc.setLineWidth(0.3);
  doc.rect(marginLeft, amountWordsBoxY, pageWidth - marginLeft - marginRight, amountWordsBoxHeight, 'FD');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  const amountInWords = formatAmountInWords(invoiceTotal);
  doc.text(`Amount in Words: ${amountInWords}`, marginLeft + 5, amountWordsBoxY + 12);
  
  cursorY = amountWordsBoxY + amountWordsBoxHeight + 20;

  // Authorization Section
  const authBoxY = cursorY;
  const authBoxWidth = 180;
  const authBoxHeight = 50;
  
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.rect(pageWidth - marginRight - authBoxWidth, authBoxY, authBoxWidth, authBoxHeight);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('For', pageWidth - marginRight - authBoxWidth + 5, authBoxY + 15);
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(sellerInfo.name, pageWidth - marginRight - authBoxWidth + 5, authBoxY + 28);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Authorized Signatory', pageWidth - marginRight - authBoxWidth + 5, authBoxY + 42);
  
  cursorY = authBoxY + authBoxHeight + 15;

  // Reverse Charge Status
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Whether tax is payable under reverse charge - No', marginLeft, cursorY);
  cursorY += 20;

  // Payment Transaction Details
  if (order.payment_method) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Payment Transaction Details:', marginLeft, cursorY);
    cursorY += 14;
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Payment Transaction ID: ${order.id.substring(0, 20)}`, marginLeft, cursorY);
    cursorY += 12;
    doc.text(`Date & Time: ${orderDate.toLocaleString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })} hrs`, marginLeft, cursorY);
    cursorY += 12;
    doc.text(`Invoice Value: ${formatINR(invoiceTotal)}`, marginLeft, cursorY);
    cursorY += 12;
    doc.text(`Mode of Payment: ${order.payment_method}`, marginLeft, cursorY);
    cursorY += 20;
  }

  // Footer Notes
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  const footerNotes = [
    'Please note that this invoice is not a demand for payment',
    'Customers desirous of availing input GST credit are requested to create a Business account',
  ];
  footerNotes.forEach((note, index) => {
    doc.text(note, marginLeft, cursorY);
    cursorY += 10;
  });

  // Page Number
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Page 1 of 1', pageWidth - marginRight, pageHeight - 20, { align: 'right' });

  const filename = `invoice_${order.order_number}.pdf`;
  doc.save(filename);
}
