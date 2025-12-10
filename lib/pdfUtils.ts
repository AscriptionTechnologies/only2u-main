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
  discount?: number;
  hsn_code?: string;
  tax_type?: string;
  tax_rate?: number;
  // Tax calculation properties (added during processing)
  cgst_rate?: number;
  sgst_rate?: number;
  igst_rate?: number;
  cgst_amount?: number;
  sgst_amount?: number;
  igst_amount?: number;
  net_amount?: number;
  tax_amount?: number;
  item_total?: number;
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
        /(ANDHRA PRADESH|TAMIL NADU|KARNATAKA|KERALA|MAHARASHTRA|GUJARAT|RAJASTHAN|PUNJAB|HARYANA|UTTAR PRADESH|WEST BENGAL|BIHAR|ODISHA|MADHYA PRADESH|JHARKHAND|ASSAM|CHHATTISGARH|HIMACHAL PRADESH|UTTARAKHAND|GOA|MANIPUR|MEGHALAYA|NAGALAND|TRIPURA|ARUNACHAL PRADESH|MIZORAM|SIKKIM|DELHI|PUDUCHERRY|CHANDIGARH|DADRA AND NAGAR HAVELI|DAMAN AND DIU|LAKSHADWEEP|JAMMU AND KASHMIR|LADAKH|TELANGANA)/i
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
            'TELANGANA': '36',
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
    name: 'Shubhamastu Shopping Mall Private Limited',
    address: '17/397, VRC centre, Nellore, Andhra Pradesh, IN',
    pan: 'ABFCSO076F',
    gstin: '37ABFCS0076F1ZE',
  };

  // Parse addresses
  const billingAddress = parseAddress(order.billing_address || '');
  const shippingAddress = parseAddress(order.shipping_address || '');
  const placeOfSupply = shippingAddress.state || 'N/A';
  const placeOfDelivery = shippingAddress.state || 'N/A';

  // Determine supply type (InterState or IntraState)
  // Seller state code is '37' (Andhra Pradesh) from GSTIN 37ABFCS0076F1ZE
  const sellerStateCode = '37';
  const buyerStateCode = shippingAddress.stateCode || billingAddress.stateCode || '';
  
  // If buyer state code is not available, try to extract from state name
  let finalBuyerStateCode = buyerStateCode;
  if (!finalBuyerStateCode && shippingAddress.state) {
    // Try to match state name to state code
    const stateNameToCode: { [key: string]: string } = {
      'TELANGANA': '36',
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
    const stateUpper = shippingAddress.state.toUpperCase();
    finalBuyerStateCode = stateNameToCode[stateUpper] || '';
  }
  
  // Determine if interstate: different states = interstate, same state = intrastate
  // If state code cannot be determined, default to intrastate (same state assumption)
  const isInterState = finalBuyerStateCode !== '' && sellerStateCode !== finalBuyerStateCode;
  
  // Define orderDate and formattedDate at the top level so they're available throughout
  const orderDate = new Date(order.created_at);
  const formattedDate = orderDate.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const invoiceNumber = `INV-${order.order_number}`;
  
  let totalNetAmount = 0;
  let totalTaxAmount = 0;
  let totalCGST = 0;
  let totalSGST = 0;
  let totalIGST = 0;
  
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
  
  /**
   * Calculate tax based on tiered structure:
   * - For products <= ₹2500:
   *   - Interstate: 5% IGST
   *   - Intrastate: 2.5% CGST + 2.5% SGST
   * - For products > ₹2500:
   *   - Interstate: 18% IGST
   *   - Intrastate: 9% CGST + 9% SGST
   */
  const calculateTaxForItem = (unitPrice: number, isInterState: boolean) => {
    const PRICE_THRESHOLD = 2500;
    
    if (unitPrice <= PRICE_THRESHOLD) {
      // Low value items
      if (isInterState) {
        return { igstRate: 5, cgstRate: 0, sgstRate: 0 };
      } else {
        return { igstRate: 0, cgstRate: 2.5, sgstRate: 2.5 };
      }
    } else {
      // High value items
      if (isInterState) {
        return { igstRate: 18, cgstRate: 0, sgstRate: 0 };
      } else {
        return { igstRate: 0, cgstRate: 9, sgstRate: 9 };
      }
    }
  };
  
  items.forEach(item => {
    const unitPrice = Number(item.unit_price) || 0;
    const quantity = Number(item.quantity) || 0;
    const totalAmount = unitPrice * quantity;
    
    // Calculate tax rates based on unit price and supply type
    const taxRates = calculateTaxForItem(unitPrice, isInterState);
    const totalTaxRate = taxRates.igstRate + taxRates.cgstRate + taxRates.sgstRate;
    
    // Calculate net amount (excluding tax) and tax amount
    // If price is inclusive: Net = Total / (1 + TaxRate/100)
    // If price is exclusive: Net = Total, Tax = Net * TaxRate/100
    // Assuming unit_price is exclusive of tax, we calculate tax on top
    const netAmount = totalAmount;
    const cgstAmount = (netAmount * taxRates.cgstRate) / 100;
    const sgstAmount = (netAmount * taxRates.sgstRate) / 100;
    const igstAmount = (netAmount * taxRates.igstRate) / 100;
    const itemTaxAmount = cgstAmount + sgstAmount + igstAmount;
    const itemTotal = netAmount + itemTaxAmount;
    
    totalNetAmount += netAmount;
    totalTaxAmount += itemTaxAmount;
    totalCGST += cgstAmount;
    totalSGST += sgstAmount;
    totalIGST += igstAmount;
    
    // Store tax rates in item for display
    item.tax_rate = totalTaxRate;
    item.tax_type = isInterState ? 'IGST' : 'CGST+SGST';
    item.cgst_rate = taxRates.cgstRate;
    item.sgst_rate = taxRates.sgstRate;
    item.igst_rate = taxRates.igstRate;
    item.cgst_amount = cgstAmount;
    item.sgst_amount = sgstAmount;
    item.igst_amount = igstAmount;
    item.net_amount = netAmount;
    item.tax_amount = itemTaxAmount;
    item.item_total = itemTotal;
    
    // Group taxes by type and rate for breakdown
    if (isInterState) {
      const taxKey = `IGST-${taxRates.igstRate}`;
      if (!taxBreakdown[taxKey]) {
        taxBreakdown[taxKey] = { rate: taxRates.igstRate, amount: 0, netAmount: 0 };
      }
      taxBreakdown[taxKey].amount += igstAmount;
      taxBreakdown[taxKey].netAmount += netAmount;
    } else {
      const cgstKey = `CGST-${taxRates.cgstRate}`;
      const sgstKey = `SGST-${taxRates.sgstRate}`;
      if (!taxBreakdown[cgstKey]) {
        taxBreakdown[cgstKey] = { rate: taxRates.cgstRate, amount: 0, netAmount: 0 };
      }
      if (!taxBreakdown[sgstKey]) {
        taxBreakdown[sgstKey] = { rate: taxRates.sgstRate, amount: 0, netAmount: 0 };
      }
      taxBreakdown[cgstKey].amount += cgstAmount;
      taxBreakdown[cgstKey].netAmount += netAmount;
      taxBreakdown[sgstKey].amount += sgstAmount;
      taxBreakdown[sgstKey].netAmount += netAmount;
    }
  });

  // Total invoice amount = Net amount + Tax
  const invoiceTotal = totalNetAmount + totalTaxAmount;

  // Header Section with Box - Increased height for larger logo and domain name
  const headerBoxHeight = 80; // Increased to accommodate logo and domain name
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
      
      // Add domain name below logo
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      const domainY = logoY + logoHeight + 5;
      const logoCenterX = marginLeft + 10 + (logoWidth / 2);
      const domainText = 'only2u.app';
      const domainTextWidth = doc.getTextWidth(domainText);
      doc.text(domainText, logoCenterX - (domainTextWidth / 2), domainY);
      doc.setTextColor(0, 0, 0);
    }
  } catch (error) {
    console.warn('Could not load logo image, using text fallback:', error);
    // Fallback to text if image fails to load
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(28);
    doc.setTextColor(0, 0, 0);
    const textY = 20 + headerBoxHeight / 2; // Center vertically
    doc.text('ONLY2U', marginLeft + 10, textY);
    
    // Add domain name below text fallback
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    const domainY = textY + 15;
    doc.text('only2u.app', marginLeft + 10, domainY);
    doc.setTextColor(0, 0, 0);
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
    
    // Add some space before the section
    cursorY += 5;
    
    // Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('ITEM PARTICULARS', marginLeft + 5, cursorY + 12);
    
    cursorY += 25;
    
    // Table Headers - Match the invoice format from image
    const headerHeight = 32; // Increased height for better visibility
    const headerY = cursorY;
    
    doc.setDrawColor(180, 180, 180);
    doc.setFillColor(245, 245, 245);
    doc.setLineWidth(0.5);
    doc.rect(marginLeft, headerY, pageWidth - marginLeft - marginRight, headerHeight, 'FD');
    
    // Draw vertical column separators in header
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.2);
    doc.line(marginLeft + 25, headerY, marginLeft + 25, headerY + headerHeight);
    doc.line(marginLeft + 158, headerY, marginLeft + 158, headerY + headerHeight);
    doc.line(marginLeft + 206, headerY, marginLeft + 206, headerY + headerHeight);
    doc.line(marginLeft + 244, headerY, marginLeft + 244, headerY + headerHeight);
    doc.line(marginLeft + 272, headerY, marginLeft + 272, headerY + headerHeight);
    doc.line(marginLeft + 318, headerY, marginLeft + 318, headerY + headerHeight);
    doc.line(marginLeft + 392, headerY, marginLeft + 392, headerY + headerHeight);
    doc.line(marginLeft + 452, headerY, marginLeft + 452, headerY + headerHeight);
    
    // Center text vertically in header
    const headerTextY = headerY + (headerHeight / 2) + 3; // Center vertically with slight adjustment
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    
    // Column positions (adjusted for new layout to match invoice format)
    // Page width: 595pt, margins: 40pt each side, usable: 515pt
    doc.text('Sl. No', marginLeft + 5, headerTextY);
    doc.text('Description', marginLeft + 28, headerTextY);
    doc.text('Unit Price', marginLeft + 161, headerTextY);
    doc.text('Discount', marginLeft + 209, headerTextY);
    doc.text('Qty', marginLeft + 247, headerTextY);
    doc.text('Net Amount', marginLeft + 275, headerTextY);
    doc.text('Tax Rate', marginLeft + 321, headerTextY);
    doc.text('Total Tax', marginLeft + 395, headerTextY);
    doc.text('Total Amount', marginLeft + 455, headerTextY);
    
    cursorY = headerY + headerHeight + 2; // Small gap after header
    
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
      const discount = Number(item.discount) || 0; // Get discount if available
      
      // Use pre-calculated tax values from the tax calculation above
      const netAmount = item.net_amount || (unitPrice * quantity - discount);
      const taxAmount = item.tax_amount || 0;
      const totalAmount = item.item_total || (netAmount + taxAmount);
      const taxRate = item.tax_rate || 0;
      const taxType = item.tax_type || (isInterState ? 'IGST' : 'CGST+SGST');
      const cgstRate = item.cgst_rate || 0;
      const sgstRate = item.sgst_rate || 0;
      const igstRate = item.igst_rate || 0;
      const cgstAmount = item.cgst_amount || 0;
      const sgstAmount = item.sgst_amount || 0;
      const igstAmount = item.igst_amount || 0;
      
      // Build description (HSN code will be shown below description, not in separate column)
      const descriptionParts = [productName];
      if (productSku) descriptionParts.push(`SKU: ${productSku}`);
      if (size) descriptionParts.push(`Size: ${size}`);
      if (color) descriptionParts.push(`Color: ${color}`);
      const description = descriptionParts.join(' | ');
      
      // Wrap description if too long (wider column now)
      const maxDescWidth = 125; // Width for description column (130pt - 5pt padding)
      const descLines = doc.splitTextToSize(description, maxDescWidth);
      
      // Calculate row height: base height + description lines + HSN line + tax rate breakdown, with padding
      const baseHeight = 20; // Base height for single line items
      const descHeight = Math.max(0, (descLines.length - 1) * 11); // Additional height for multi-line description
      const hsnHeight = hsnCode ? 11 : 0; // Space for HSN code below description
      // Add extra height if showing CGST+SGST breakdown (takes 2 lines)
      const taxRateHeight = (!isInterState && (cgstRate > 0 || sgstRate > 0)) ? 9 : 0;
      const rowPadding = 8; // Padding top and bottom
      const itemHeight = baseHeight + descHeight + hsnHeight + taxRateHeight + rowPadding;
      
      // Starting Y position for this row (centered vertically)
      const rowStartY = cursorY;
      
      // Draw item row background (white, alternating for readability)
      if (index % 2 === 0) {
        doc.setFillColor(255, 255, 255);
      } else {
        doc.setFillColor(250, 250, 250);
      }
      doc.rect(marginLeft, rowStartY, pageWidth - marginLeft - marginRight, itemHeight, 'F');
      
      // Draw vertical column separators
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.2);
      // Sl. No separator
      doc.line(marginLeft + 25, rowStartY, marginLeft + 25, rowStartY + itemHeight);
      // Description separator
      doc.line(marginLeft + 158, rowStartY, marginLeft + 158, rowStartY + itemHeight);
      // Unit Price separator
      doc.line(marginLeft + 206, rowStartY, marginLeft + 206, rowStartY + itemHeight);
      // Discount separator
      doc.line(marginLeft + 244, rowStartY, marginLeft + 244, rowStartY + itemHeight);
      // Qty separator
      doc.line(marginLeft + 272, rowStartY, marginLeft + 272, rowStartY + itemHeight);
      // Net Amount separator
      doc.line(marginLeft + 318, rowStartY, marginLeft + 318, rowStartY + itemHeight);
      // Tax Rate separator
      doc.line(marginLeft + 392, rowStartY, marginLeft + 392, rowStartY + itemHeight);
      // Total Tax separator
      doc.line(marginLeft + 452, rowStartY, marginLeft + 452, rowStartY + itemHeight);
      
      // Calculate center Y for this row
      const rowCenterY = rowStartY + (itemHeight / 2);
      const rowTopY = rowStartY + 6; // Top padding
      
      // Serial Number (centered vertically)
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(String(index + 1), marginLeft + 5, rowTopY + 7);
      
      // Description (may span multiple lines, starts from top)
      let descY = rowTopY;
      descLines.forEach((line: string, lineIndex: number) => {
        doc.text(line, marginLeft + 28, descY);
        if (lineIndex < descLines.length - 1) {
          descY += 11;
        }
      });
      
      // HSN Code (shown below description, not in separate column)
      if (hsnCode) {
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text(`HSN: ${hsnCode}`, marginLeft + 28, descY + 11);
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(9);
      }
      
      // Unit Price (centered vertically)
      doc.setFontSize(9);
      doc.text(formatINR(unitPrice), marginLeft + 161, rowTopY + 7);
      
      // Discount (centered vertically)
      doc.text(formatINR(discount), marginLeft + 209, rowTopY + 7);
      
      // Quantity (centered vertically)
      doc.text(String(quantity), marginLeft + 247, rowTopY + 7);
      
      // Net Amount (centered vertically)
      doc.text(formatINR(netAmount), marginLeft + 275, rowTopY + 7);
      
      // Tax Rate (centered vertically) - Show breakdown with amounts for CGST+SGST
      // Constrain text width to prevent overflow into Total Tax column
      doc.setFontSize(7);
      let taxRateY = rowTopY + 7;
      const taxRateMaxWidth = 65; // Maximum width for tax rate column (392 - 321 - 6pt padding)
      
      if (isInterState) {
        // Interstate: Show IGST
        if (igstRate > 0 && igstAmount > 0) {
          const igstText = `IGST ${formatNumber(igstRate)}% ${formatINR(igstAmount)}`;
          const igstLines = doc.splitTextToSize(igstText, taxRateMaxWidth);
          igstLines.forEach((line: string, idx: number) => {
            doc.text(line, marginLeft + 321, taxRateY);
            if (idx < igstLines.length - 1) taxRateY += 9;
          });
        } else {
          doc.text('0%', marginLeft + 321, taxRateY);
        }
      } else {
        // Intrastate: Always show CGST and SGST (even if 0 for some items in mixed orders)
        // Show CGST and SGST percentages with amounts separately on separate lines
        if (cgstRate > 0 && cgstAmount > 0) {
          const cgstText = `CGST ${formatNumber(cgstRate)}% ${formatINR(cgstAmount)}`;
          const cgstLines = doc.splitTextToSize(cgstText, taxRateMaxWidth);
          cgstLines.forEach((line: string, idx: number) => {
            doc.text(line, marginLeft + 321, taxRateY);
            if (idx < cgstLines.length - 1) taxRateY += 9;
          });
          taxRateY += 9;
        }
        if (sgstRate > 0 && sgstAmount > 0) {
          const sgstText = `SGST ${formatNumber(sgstRate)}% ${formatINR(sgstAmount)}`;
          const sgstLines = doc.splitTextToSize(sgstText, taxRateMaxWidth);
          sgstLines.forEach((line: string, idx: number) => {
            doc.text(line, marginLeft + 321, taxRateY);
            if (idx < sgstLines.length - 1) taxRateY += 9;
          });
        }
        // If both CGST and SGST are 0 or missing, show 0%
        if ((!cgstRate || cgstRate === 0) && (!sgstRate || sgstRate === 0) && 
            (!cgstAmount || cgstAmount === 0) && (!sgstAmount || sgstAmount === 0)) {
          doc.text('0%', marginLeft + 321, taxRateY);
        }
      }
      doc.setFontSize(9);
      
      // Total Tax (centered vertically)
      doc.text(formatINR(taxAmount), marginLeft + 395, rowTopY + 7);
      
      // Total Amount (centered vertically, bold)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text(formatINR(totalAmount), marginLeft + 455, rowTopY + 7);
      doc.setFont('helvetica', 'normal');
      
      // Move to next item with proper spacing
      cursorY = rowStartY + itemHeight;
      
      // Add separator line between items
      if (index < items.length - 1) {
        doc.setDrawColor(220, 220, 220);
        doc.setLineWidth(0.2);
        doc.line(marginLeft + 5, cursorY, marginLeft + pageWidth - marginLeft - marginRight - 5, cursorY);
        cursorY += 3; // Small gap after separator
      }
    });
    
    // Draw bottom border
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.5);
    doc.line(marginLeft, cursorY, marginLeft + pageWidth - marginLeft - marginRight, cursorY);
    
    cursorY += 20; // More space after table
  } else {
    // No items message
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('No items found in this order.', marginLeft, cursorY);
    cursorY += 20;
  }

  // Amount Details Section - Enhanced Layout with Proper Tax Breakdown
  const summarySectionY = cursorY;
  // Calculate dynamic height based on tax breakdown items
  const taxBreakdownLines = Object.keys(taxBreakdown).length;
  const summarySectionHeight = Math.max(120, 80 + (taxBreakdownLines * 12));
  
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
  
  // Left side - Tax Breakdown (Enhanced)
  const leftColumnX = summaryBoxX + 10;
  const rightColumnX = summaryBoxX + summaryBoxWidth / 2 + 10;
  const taxLabelWidth = 120;
  const taxValueX = leftColumnX + taxLabelWidth;
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('TAX BREAKDOWN:', leftColumnX, summaryTextY);
  summaryTextY += 15;
  
  // Draw a line under the header
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(leftColumnX, summaryTextY - 3, leftColumnX + summaryBoxWidth / 2 - 20, summaryTextY - 3);
  summaryTextY += 5;
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  
  // Show taxable value first
  doc.text('Taxable Value:', leftColumnX, summaryTextY);
  doc.setFont('helvetica', 'bold');
  doc.text(formatINR(totalNetAmount), taxValueX, summaryTextY);
  doc.setFont('helvetica', 'normal');
  summaryTextY += 12;
  
  // Group by tax type and show totals - Show only relevant taxes based on supply type
  let hasTaxBreakdown = false;
  
  if (isInterState) {
    // Interstate: Show only IGST
    if (totalIGST > 0) {
      const igstKeys = Object.keys(taxBreakdown).filter(key => key.startsWith('IGST'));
      if (igstKeys.length > 0) {
        // Show individual IGST rates if multiple
        igstKeys.forEach(key => {
          const breakdown = taxBreakdown[key];
          doc.text(
            `IGST @ ${formatNumber(breakdown.rate)}%:`,
            leftColumnX + 5,
            summaryTextY
          );
          doc.text(formatINR(breakdown.amount), taxValueX, summaryTextY);
          summaryTextY += 10;
          hasTaxBreakdown = true;
        });
      } else {
        // Show total IGST
        doc.text('IGST:', leftColumnX + 5, summaryTextY);
        doc.text(formatINR(totalIGST), taxValueX, summaryTextY);
        summaryTextY += 10;
        hasTaxBreakdown = true;
      }
    }
  } else {
    // Intrastate: Show only CGST and SGST
    if (totalCGST > 0) {
      const cgstKeys = Object.keys(taxBreakdown).filter(key => key.startsWith('CGST'));
      if (cgstKeys.length > 0) {
        // Show individual CGST rates if multiple
        cgstKeys.forEach(key => {
          const breakdown = taxBreakdown[key];
          doc.text(
            `CGST @ ${formatNumber(breakdown.rate)}%:`,
            leftColumnX + 5,
            summaryTextY
          );
          doc.text(formatINR(breakdown.amount), taxValueX, summaryTextY);
          summaryTextY += 10;
          hasTaxBreakdown = true;
        });
      } else {
        // Show total CGST
        doc.text('CGST:', leftColumnX + 5, summaryTextY);
        doc.text(formatINR(totalCGST), taxValueX, summaryTextY);
        summaryTextY += 10;
        hasTaxBreakdown = true;
      }
    }
    
    if (totalSGST > 0) {
      const sgstKeys = Object.keys(taxBreakdown).filter(key => key.startsWith('SGST'));
      if (sgstKeys.length > 0) {
        // Show individual SGST rates if multiple
        sgstKeys.forEach(key => {
          const breakdown = taxBreakdown[key];
          doc.text(
            `SGST @ ${formatNumber(breakdown.rate)}%:`,
            leftColumnX + 5,
            summaryTextY
          );
          doc.text(formatINR(breakdown.amount), taxValueX, summaryTextY);
          summaryTextY += 10;
          hasTaxBreakdown = true;
        });
      } else {
        // Show total SGST
        doc.text('SGST:', leftColumnX + 5, summaryTextY);
        doc.text(formatINR(totalSGST), taxValueX, summaryTextY);
        summaryTextY += 10;
        hasTaxBreakdown = true;
      }
    }
  }
  
  // Show total tax if breakdown exists
  if (hasTaxBreakdown && totalTaxAmount > 0) {
    summaryTextY += 3;
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.line(leftColumnX + 5, summaryTextY - 2, leftColumnX + summaryBoxWidth / 2 - 20, summaryTextY - 2);
    summaryTextY += 8;
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Total Tax:', leftColumnX + 5, summaryTextY);
    doc.text(formatINR(totalTaxAmount), taxValueX, summaryTextY);
    doc.setFont('helvetica', 'normal');
  } else if (!hasTaxBreakdown && totalTaxAmount > 0) {
    doc.text('Total Tax:', leftColumnX + 5, summaryTextY);
    doc.text(formatINR(totalTaxAmount), taxValueX, summaryTextY);
  }
  
  // Right side - Amount Summary
  let amountTextY = summaryBoxY + 30;
  const amountLabelWidth = 100;
  const amountValueX = summaryBoxX + summaryBoxWidth - 120;
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('AMOUNT SUMMARY:', rightColumnX, amountTextY);
  amountTextY += 15;
  
  // Draw a line under the header
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(rightColumnX, amountTextY - 3, summaryBoxX + summaryBoxWidth - 10, amountTextY - 3);
  amountTextY += 5;
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Taxable Value:', rightColumnX, amountTextY);
  doc.setFont('helvetica', 'bold');
  doc.text(formatINR(totalNetAmount), amountValueX, amountTextY);
  amountTextY += 12;
  
  doc.setFont('helvetica', 'normal');
  doc.text('Total Tax:', rightColumnX, amountTextY);
  doc.setFont('helvetica', 'bold');
  doc.text(formatINR(totalTaxAmount), amountValueX, amountTextY);
  amountTextY += 12;
  
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(rightColumnX, amountTextY, summaryBoxX + summaryBoxWidth - 10, amountTextY);
  amountTextY += 12;
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text('GRAND TOTAL:', rightColumnX, amountTextY);
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
