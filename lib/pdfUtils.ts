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
  unit_of_measurement?: string;
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

export async function generateOrderPdf(
  order: Order, 
  customSellerInfo?: { name: string; address: string; pan: string; gstin: string },
  options?: {
    useBilledBy?: boolean; // Use "BILLED BY" instead of "SOLD BY"
    useBilledTo?: boolean; // Use "BILLED TO" instead of billing/shipping address
    hideShippingAddress?: boolean; // Hide shipping address section
    hideOrderDetails?: boolean; // Hide order details section
    hideUnitPrice?: boolean; // Hide unit price column
    hideQty?: boolean; // Hide quantity column
    hideUnit?: boolean; // Hide unit of measurement column
    hideTransactionDetails?: boolean; // Hide transaction details section
  }
) {
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

  // Default seller information (can be overridden)
  const sellerInfo = customSellerInfo || {
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
  // Seller state code extracted from GSTIN (first 2 digits)
  // Default is '37' (Andhra Pradesh) for Shubhamastu, '36' (Telangana) for Only2U
  const sellerStateCode = sellerInfo.gstin.substring(0, 2) || '37';
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

  // Billing Address Box (or BILLED TO)
  if (!options?.hideShippingAddress && !options?.useBilledTo) {
    // Original layout with billing and shipping addresses
    const addressBoxY = cursorY;
    const addressBoxHeight = 80;
    const availableWidth = pageWidth - marginLeft - marginRight;
    const addressGap = 15;
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
    
    // Order Details Box (Right) - Only if not hidden
    if (!options?.hideOrderDetails) {
      const orderDetailsX = shippingX + addressBoxWidth + addressGap;
      const orderDetailsBoxY = addressBoxY;
      const orderDetailsBoxHeight = addressBoxHeight;
      const orderDetailsBoxWidth = pageWidth - marginRight - orderDetailsX;
      
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
      }
    }
    
    cursorY = addressBoxY + addressBoxHeight + 20;
  } else if (options?.useBilledTo) {
    // Simplified layout: Just BILLED TO box
    const billedToBoxY = cursorY;
    const billedToBoxHeight = 75;
    const billedToBoxWidth = 180;
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.rect(marginLeft, billedToBoxY, billedToBoxWidth, billedToBoxHeight);
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text('BILLED TO', marginLeft + 5, billedToBoxY + 8);
    
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.2);
    doc.line(marginLeft + 2, billedToBoxY + 12, marginLeft + billedToBoxWidth - 2, billedToBoxY + 12);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    let billedToTextY = billedToBoxY + 20;
    doc.text(billingAddress.name || order.user?.name || 'N/A', marginLeft + 5, billedToTextY);
    billedToTextY += 10;
    
    const billedToAddressLines = doc.splitTextToSize(billingAddress.address || order.billing_address || 'N/A', billedToBoxWidth - 10);
    billedToAddressLines.forEach((line: string) => {
      doc.text(line, marginLeft + 5, billedToTextY);
      billedToTextY += 9;
    });
    
    if (billingAddress.stateCode) {
      doc.text(`State Code: ${billingAddress.stateCode}`, marginLeft + 5, billedToTextY);
      billedToTextY += 9;
    }
    // Try to get GSTIN from order user or vendor info if available
    const vendorGSTIN = (order.user as any)?.gstin || (order as any)?.vendorGSTIN;
    if (vendorGSTIN) {
      doc.text(`GSTIN: ${vendorGSTIN}`, marginLeft + 5, billedToTextY);
    }
    
    cursorY = billedToBoxY + billedToBoxHeight + 15;
  } else {
    // Just billing address, no shipping
    const addressBoxY = cursorY;
    const addressBoxHeight = 80;
    const addressBoxWidth = 180;
    
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
    
    cursorY = addressBoxY + addressBoxHeight + 15;
  }

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
    
    // Calculate column positions dynamically based on options
    let colPositions = {
      slNo: marginLeft + 5,
      description: marginLeft + 28,
      unitPrice: marginLeft + 161,
      discount: marginLeft + 209,
      qty: marginLeft + 247,
      unit: marginLeft + 262,
      netAmount: marginLeft + 287,
      taxRate: marginLeft + 330,
      totalTax: marginLeft + 402,
      totalAmount: marginLeft + 462,
    };
    
    // Adjust positions if columns are hidden
    if (options?.hideUnitPrice) {
      // Shift everything after unit price left
      const shift = 45; // Width of unit price column
      colPositions.discount -= shift;
      colPositions.qty -= shift;
      colPositions.unit -= shift;
      colPositions.netAmount -= shift;
      colPositions.taxRate -= shift;
      colPositions.totalTax -= shift;
      colPositions.totalAmount -= shift;
    }
    
    if (options?.hideQty) {
      // Shift everything after qty left
      const shift = 16; // Width of qty column
      colPositions.unit -= shift;
      colPositions.netAmount -= shift;
      colPositions.taxRate -= shift;
      colPositions.totalTax -= shift;
      colPositions.totalAmount -= shift;
    }
    
    if (options?.hideUnit) {
      // Shift everything after unit left
      const shift = 23; // Width of unit column
      colPositions.netAmount -= shift;
      colPositions.taxRate -= shift;
      colPositions.totalTax -= shift;
      colPositions.totalAmount -= shift;
    }
    
    // Draw vertical column separators in header (adjust based on options)
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.2);
    doc.line(colPositions.slNo + 20, headerY, colPositions.slNo + 20, headerY + headerHeight); // After Sl. No
    doc.line(colPositions.description + 130, headerY, colPositions.description + 130, headerY + headerHeight); // After Description
    
    if (!options?.hideUnitPrice) {
      doc.line(colPositions.unitPrice + 45, headerY, colPositions.unitPrice + 45, headerY + headerHeight); // After Unit Price
    }
    
    doc.line(colPositions.discount + 35, headerY, colPositions.discount + 35, headerY + headerHeight); // After Discount
    
    if (!options?.hideQty) {
      doc.line(colPositions.qty + 13, headerY, colPositions.qty + 13, headerY + headerHeight); // After Qty
    }
    
    if (!options?.hideUnit) {
      doc.line(colPositions.unit + 23, headerY, colPositions.unit + 23, headerY + headerHeight); // After Unit
    }
    
    doc.line(colPositions.netAmount + 41, headerY, colPositions.netAmount + 41, headerY + headerHeight); // After Net Amount
    doc.line(colPositions.taxRate + 70, headerY, colPositions.taxRate + 70, headerY + headerHeight); // After Tax Rate
    doc.line(colPositions.totalTax + 60, headerY, colPositions.totalTax + 60, headerY + headerHeight); // After Total Tax
    
    // Center text vertically in header
    const headerTextY = headerY + (headerHeight / 2) + 3; // Center vertically with slight adjustment
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    
    // Column headers
    doc.text('Sl. No', colPositions.slNo, headerTextY);
    doc.text('Description', colPositions.description, headerTextY);
    
    if (!options?.hideUnitPrice) {
      doc.text('Unit Price', colPositions.unitPrice, headerTextY);
    }
    
    doc.text('Discount', colPositions.discount, headerTextY);
    
    if (!options?.hideQty) {
      doc.text('Qty', colPositions.qty, headerTextY);
    }
    
    if (!options?.hideUnit) {
      doc.text('Unit', colPositions.unit, headerTextY);
    }
    
    doc.text('Net Amount', colPositions.netAmount, headerTextY);
    doc.text('Tax Rate', colPositions.taxRate, headerTextY);
    doc.text('Total Tax', colPositions.totalTax, headerTextY);
    doc.text('Total Amount', colPositions.totalAmount, headerTextY);
    
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
      const unitOfMeasurement = item.unit_of_measurement || 'PCS';
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
      
      // Calculate column positions for separators (same as header)
      let colPosSep = {
        slNo: marginLeft + 5,
        description: marginLeft + 28,
        unitPrice: marginLeft + 161,
        discount: marginLeft + 209,
        qty: marginLeft + 247,
        unit: marginLeft + 262,
        netAmount: marginLeft + 287,
        taxRate: marginLeft + 330,
        totalTax: marginLeft + 402,
        totalAmount: marginLeft + 462,
      };
      
      if (options?.hideUnitPrice) {
        const shift = 45;
        colPosSep.discount -= shift;
        colPosSep.qty -= shift;
        colPosSep.unit -= shift;
        colPosSep.netAmount -= shift;
        colPosSep.taxRate -= shift;
        colPosSep.totalTax -= shift;
        colPosSep.totalAmount -= shift;
      }
      
      if (options?.hideQty) {
        const shift = 16;
        colPosSep.unit -= shift;
        colPosSep.netAmount -= shift;
        colPosSep.taxRate -= shift;
        colPosSep.totalTax -= shift;
        colPosSep.totalAmount -= shift;
      }
      
      // Draw vertical column separators
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.2);
      // Sl. No separator
      doc.line(colPosSep.slNo + 20, rowStartY, colPosSep.slNo + 20, rowStartY + itemHeight);
      // Description separator
      doc.line(colPosSep.description + 130, rowStartY, colPosSep.description + 130, rowStartY + itemHeight);
      // Unit Price separator (only if not hidden)
      if (!options?.hideUnitPrice) {
        doc.line(colPosSep.unitPrice + 45, rowStartY, colPosSep.unitPrice + 45, rowStartY + itemHeight);
      }
      // Discount separator
      doc.line(colPosSep.discount + 35, rowStartY, colPosSep.discount + 35, rowStartY + itemHeight);
      // Qty separator (only if not hidden)
      if (!options?.hideQty) {
        doc.line(colPosSep.qty + 13, rowStartY, colPosSep.qty + 13, rowStartY + itemHeight);
      }
      // Unit separator
      doc.line(colPosSep.unit + 23, rowStartY, colPosSep.unit + 23, rowStartY + itemHeight);
      // Net Amount separator
      doc.line(colPosSep.netAmount + 41, rowStartY, colPosSep.netAmount + 41, rowStartY + itemHeight);
      // Tax Rate separator
      doc.line(colPosSep.taxRate + 70, rowStartY, colPosSep.taxRate + 70, rowStartY + itemHeight);
      // Total Tax separator
      doc.line(colPosSep.totalTax + 60, rowStartY, colPosSep.totalTax + 60, rowStartY + itemHeight);
      
      // Calculate center Y for this row
      const rowCenterY = rowStartY + (itemHeight / 2);
      const rowTopY = rowStartY + 6; // Top padding
      
      // Serial Number (centered vertically)
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(String(index + 1), colPosSep.slNo, rowTopY + 7);
      
      // Description (may span multiple lines, starts from top)
      let descY = rowTopY;
      descLines.forEach((line: string, lineIndex: number) => {
        doc.text(line, colPosSep.description, descY);
        if (lineIndex < descLines.length - 1) {
          descY += 11;
        }
      });
      
      // HSN Code (shown below description, not in separate column)
      if (hsnCode) {
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text(`HSN: ${hsnCode}`, colPosSep.description, descY + 11);
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(9);
      }
      
      // Unit Price (centered vertically) - only if not hidden
      if (!options?.hideUnitPrice) {
        doc.setFontSize(9);
        doc.text(formatINR(unitPrice), colPosSep.unitPrice, rowTopY + 7);
      }
      
      // Discount (centered vertically)
      doc.setFontSize(9);
      doc.text(formatINR(discount), colPosSep.discount, rowTopY + 7);
      
      // Quantity (centered vertically) - only if not hidden
      if (!options?.hideQty) {
        doc.text(String(quantity), colPosSep.qty, rowTopY + 7);
      }
      
      // Unit of Measurement (centered vertically) - only if not hidden
      if (!options?.hideUnit) {
        doc.text(unitOfMeasurement, colPosSep.unit, rowTopY + 7);
      }
      
      // Net Amount (centered vertically) - show price here if unit price is hidden
      doc.setFontSize(9);
      doc.text(formatINR(netAmount), colPosSep.netAmount, rowTopY + 7);
      
      // Tax Rate (centered vertically) - Show breakdown with amounts for CGST+SGST
      // Constrain text width to prevent overflow into Total Tax column
      doc.setFontSize(7);
      let taxRateY = rowTopY + 7;
      const taxRateMaxWidth = 65; // Maximum width for tax rate column
      
      if (isInterState) {
        // Interstate: Show IGST
        if (igstRate > 0 && igstAmount > 0) {
          const igstText = `IGST ${formatNumber(igstRate)}% ${formatINR(igstAmount)}`;
          const igstLines = doc.splitTextToSize(igstText, taxRateMaxWidth);
          igstLines.forEach((line: string, idx: number) => {
            doc.text(line, colPosSep.taxRate, taxRateY);
            if (idx < igstLines.length - 1) taxRateY += 9;
          });
        } else {
          doc.text('0%', colPosSep.taxRate, taxRateY);
        }
      } else {
        // Intrastate: Always show CGST and SGST (even if 0 for some items in mixed orders)
        // Show CGST and SGST percentages with amounts separately on separate lines
        if (cgstRate > 0 && cgstAmount > 0) {
          const cgstText = `CGST ${formatNumber(cgstRate)}% ${formatINR(cgstAmount)}`;
          const cgstLines = doc.splitTextToSize(cgstText, taxRateMaxWidth);
          cgstLines.forEach((line: string, idx: number) => {
            doc.text(line, colPosSep.taxRate, taxRateY);
            if (idx < cgstLines.length - 1) taxRateY += 9;
          });
          taxRateY += 9;
        }
        if (sgstRate > 0 && sgstAmount > 0) {
          const sgstText = `SGST ${formatNumber(sgstRate)}% ${formatINR(sgstAmount)}`;
          const sgstLines = doc.splitTextToSize(sgstText, taxRateMaxWidth);
          sgstLines.forEach((line: string, idx: number) => {
            doc.text(line, colPosSep.taxRate, taxRateY);
            if (idx < sgstLines.length - 1) taxRateY += 9;
          });
        }
        // If both CGST and SGST are 0 or missing, show 0%
        if ((!cgstRate || cgstRate === 0) && (!sgstRate || sgstRate === 0) && 
            (!cgstAmount || cgstAmount === 0) && (!sgstAmount || sgstAmount === 0)) {
          doc.text('0%', colPosSep.taxRate, taxRateY);
        }
      }
      doc.setFontSize(9);
      
      // Total Tax (centered vertically)
      doc.text(formatINR(taxAmount), colPosSep.totalTax, rowTopY + 7);
      
      // Total Amount (centered vertically, bold)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text(formatINR(totalAmount), colPosSep.totalAmount, rowTopY + 7);
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

  // Payment Transaction Details (hide if option is set)
  if (!options?.hideTransactionDetails && order.payment_method) {
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

// Type definitions for Sales Return
type ReturnItem = {
  id: string;
  return_id: string;
  order_item_id: string;
  product_id: string;
  product_name: string;
  product_sku: string;
  size?: string;
  color?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  discount?: number;
  hsn_code?: string;
  unit_of_measurement?: string;
  cgst_rate?: number;
  sgst_rate?: number;
  igst_rate?: number;
  cgst_amount?: number;
  sgst_amount?: number;
  igst_amount?: number;
  tax_amount?: number;
  net_amount?: number;
};

type OrderReturn = {
  id: string;
  order_id: string;
  return_number: string;
  return_reason?: string;
  return_status: string;
  refund_amount: number;
  refund_method?: string;
  refund_status: string;
  return_date: string;
  processed_at?: string;
  notes?: string;
  created_at: string;
  return_items?: ReturnItem[];
  order?: Order;
  user?: {
    name?: string;
    email?: string;
    phone?: string;
  };
};

// Generate Sales Return Invoice PDF
export async function generateReturnInvoicePdf(returnOrder: OrderReturn) {
  const doc = new jsPDF('portrait', 'pt', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginLeft = 40;
  const marginRight = 40;
  const marginTop = 40;
  let cursorY = marginTop;

  // Helper function to format INR currency
  const formatINR = (amount: number | undefined | null) => {
    if (amount === undefined || amount === null) return '0.00';
    return new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(amount || 0));
  };

  const formatNumber = (num: number | undefined | null) => {
    if (num === undefined || num === null) return '0';
    return Number(num).toFixed(2);
  };

  // Default seller information
  const sellerInfo = {
    name: 'Shubhamastu Shopping Mall Private Limited',
    address: '17/397, VRC centre, Nellore, Andhra Pradesh, IN',
    pan: 'ABFCSO076F',
    gstin: '37ABFCS0076F1ZE',
  };

  const sellerStateCode = '37';

  // Parse addresses from original order
  const originalOrder = returnOrder.order;
  const billingAddress = originalOrder ? parseAddress(originalOrder.billing_address || '') : { name: '', address: '', state: '', pincode: '', stateCode: '' };
  const shippingAddress = originalOrder ? parseAddress(originalOrder.shipping_address || '') : { name: '', address: '', state: '', pincode: '', stateCode: '' };
  
  const buyerStateCode = shippingAddress.stateCode || billingAddress.stateCode || '';
  let finalBuyerStateCode = buyerStateCode;
  
  if (!finalBuyerStateCode && shippingAddress.state) {
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
  
  const isInterState = finalBuyerStateCode !== '' && sellerStateCode !== finalBuyerStateCode;

  const returnDate = new Date(returnOrder.return_date || returnOrder.created_at);
  const formattedDate = returnDate.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const returnInvoiceNumber = `RET-INV-${returnOrder.return_number}`;
  const originalInvoiceNumber = originalOrder ? `INV-${originalOrder.order_number}` : 'N/A';

  // Totals will be recalculated during item processing
  let totalNetAmount = 0;
  let totalTaxAmount = 0;
  let totalCGST = 0;
  let totalSGST = 0;
  let totalIGST = 0;

  const items = returnOrder.return_items || [];

  if (items.length === 0) {
    console.error('No return items found for return:', returnOrder.return_number);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(255, 0, 0);
    doc.text('ERROR: No return items found for this return', marginLeft, cursorY);
    cursorY += 20;
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Return Number: ${returnOrder.return_number}`, marginLeft, cursorY);
    doc.save(`return_invoice_${returnOrder.return_number}_error.pdf`);
    return;
  }

  // Header Section with Box
  const headerBoxHeight = 80;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.rect(marginLeft, 20, pageWidth - marginLeft - marginRight, headerBoxHeight);

  // Add logo
  const logoUrl = '/label.png';
  const logoHeight = 60;
  const logoWidth = 150;

  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = logoUrl;
      
      if (img.complete) {
        resolve(null);
      }
    });
    
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(img, 0, 0);
      const dataUrl = canvas.toDataURL('image/png');
      const logoY = 20 + (headerBoxHeight - logoHeight) / 2;
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
    console.warn('Could not load logo image:', error);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(28);
    doc.setTextColor(0, 0, 0);
    const textY = 20 + headerBoxHeight / 2;
    doc.text('ONLY2U', marginLeft + 10, textY);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    const domainY = textY + 15;
    doc.text('only2u.app', marginLeft + 10, domainY);
    doc.setTextColor(0, 0, 0);
  }

  // Title: SALES RETURN INVOICE (centered, red color)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(220, 20, 60); // Crimson red
  const titleText = 'SALES RETURN INVOICE';
  const titleWidth = doc.getTextWidth(titleText);
  const titleY = 20 + (headerBoxHeight / 2) - 8;
  doc.text(titleText, (pageWidth - titleWidth) / 2, titleY);
  doc.setTextColor(0, 0, 0);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const subtitleY = titleY + 12;
  doc.text('(Credit Note)', pageWidth / 2, subtitleY, { align: 'center' });

  // Return Invoice Number and Date (right side)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  let infoY = 30;
  
  // Return Invoice Number - Label and value on separate lines
  doc.text(`Return Invoice No:`, pageWidth - marginRight - 5, infoY, { align: 'right' });
  infoY += 12;
  doc.setFontSize(8);
  const returnInvLines = doc.splitTextToSize(returnInvoiceNumber, 180);
  returnInvLines.forEach((line: string, idx: number) => {
    doc.text(line, pageWidth - marginRight - 5, infoY + (idx * 10), { align: 'right' });
  });
  infoY += returnInvLines.length * 10;
  
  // Return Date
  doc.setFontSize(9);
  doc.text(`Return Date: ${formattedDate}`, pageWidth - marginRight - 5, infoY, { align: 'right' });
  infoY += 15;
  
  if (originalOrder) {
    // Order Invoice Number - Label and value on separate lines
    doc.setFontSize(9);
    doc.text(`Order Invoice Number:`, pageWidth - marginRight - 5, infoY, { align: 'right' });
    infoY += 12;
    doc.setFontSize(8);
    const origInvLines = doc.splitTextToSize(originalInvoiceNumber, 180);
    origInvLines.forEach((line: string, idx: number) => {
      doc.text(line, pageWidth - marginRight - 5, infoY + (idx * 10), { align: 'right' });
    });
    infoY += origInvLines.length * 10;
    
    // Order Invoice Date
    doc.setFontSize(9);
    const originalDate = new Date(originalOrder.created_at);
    const originalFormattedDate = originalDate.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    doc.text(`Order Invoice Date: ${originalFormattedDate}`, pageWidth - marginRight - 5, infoY, { align: 'right' });
  }

  cursorY = marginTop + headerBoxHeight + 20;

  // Seller Information Box
  const sellerBoxY = cursorY;
  const sellerBoxHeight = 75;
  const sellerBoxWidth = 180;

  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.rect(marginLeft, sellerBoxY, sellerBoxWidth, sellerBoxHeight);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('RETURNED BY', marginLeft + 5, sellerBoxY + 8);
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.2);
  doc.line(marginLeft + 2, sellerBoxY + 12, marginLeft + sellerBoxWidth - 2, sellerBoxY + 12);

  let sellerTextY = sellerBoxY + 20;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
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

  // Buyer Information Box (right side)
  const buyerBoxY = cursorY;
  const buyerBoxHeight = 75;
  const buyerBoxWidth = 180;
  const buyerBoxX = pageWidth - marginRight - buyerBoxWidth;

  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.rect(buyerBoxX, buyerBoxY, buyerBoxWidth, buyerBoxHeight);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('RETURNED TO', buyerBoxX + 5, buyerBoxY + 8);
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.2);
  doc.line(buyerBoxX + 2, buyerBoxY + 12, buyerBoxX + buyerBoxWidth - 2, buyerBoxY + 12);

  let buyerTextY = buyerBoxY + 20;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  
  const buyerName = returnOrder.user?.name || billingAddress.name || shippingAddress.name || 'Customer';
  doc.text(buyerName, buyerBoxX + 5, buyerTextY);
  buyerTextY += 10;

  const buyerAddress = shippingAddress.address || billingAddress.address || '';
  if (buyerAddress) {
    const buyerAddressLines = doc.splitTextToSize(buyerAddress, buyerBoxWidth - 10);
    buyerAddressLines.forEach((line: string) => {
      doc.text(line, buyerBoxX + 5, buyerTextY);
      buyerTextY += 9;
    });
  }

  if (returnOrder.user?.phone) {
    doc.text(`Phone: ${returnOrder.user.phone}`, buyerBoxX + 5, buyerTextY);
    buyerTextY += 9;
  }
  if (returnOrder.user?.email) {
    doc.text(`Email: ${returnOrder.user.email}`, buyerBoxX + 5, buyerTextY);
  }

  cursorY = sellerBoxY + sellerBoxHeight + 20;

  // Return Reason
  if (returnOrder.return_reason) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Return Reason:', marginLeft, cursorY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const reasonLines = doc.splitTextToSize(returnOrder.return_reason, pageWidth - marginLeft - marginRight);
    reasonLines.forEach((line: string) => {
      doc.text(line, marginLeft + 80, cursorY);
      cursorY += 12;
    });
    cursorY += 10;
  }

  // Item Particulars Section - Match regular invoice layout
  if (items && items.length > 0) {
    const itemsSectionY = cursorY;
    
    // Add some space before the section
    cursorY += 5;
    
    // Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('ITEM PARTICULARS', marginLeft + 5, cursorY + 12);
    
    cursorY += 25;
    
    // Table Headers - Match the invoice format
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
    doc.line(marginLeft + 260, headerY, marginLeft + 260, headerY + headerHeight);
    doc.line(marginLeft + 285, headerY, marginLeft + 285, headerY + headerHeight);
    doc.line(marginLeft + 328, headerY, marginLeft + 328, headerY + headerHeight);
    doc.line(marginLeft + 400, headerY, marginLeft + 400, headerY + headerHeight);
    doc.line(marginLeft + 460, headerY, marginLeft + 460, headerY + headerHeight);
    
    // Center text vertically in header
    const headerTextY = headerY + (headerHeight / 2) + 3; // Center vertically with slight adjustment
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    
    // Column positions (match regular invoice)
    doc.text('Sl. No', marginLeft + 5, headerTextY);
    doc.text('Description', marginLeft + 28, headerTextY);
    doc.text('Unit Price', marginLeft + 161, headerTextY);
    doc.text('Discount', marginLeft + 209, headerTextY);
    doc.text('Qty', marginLeft + 247, headerTextY);
    doc.text('Unit', marginLeft + 262, headerTextY);
    doc.text('Net Amount', marginLeft + 287, headerTextY);
    doc.text('Tax Rate', marginLeft + 330, headerTextY);
    doc.text('Total Tax', marginLeft + 402, headerTextY);
    doc.text('Total Amount', marginLeft + 462, headerTextY);
    
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
      const unitOfMeasurement = item.unit_of_measurement || 'PCS';
      const discount = Number(item.discount) || 0;
      
      // Calculate taxes based on unit price (same logic as regular invoice)
      const calculateTaxForItem = (unitPrice: number, isInterState: boolean) => {
        let cgstRate = 0;
        let sgstRate = 0;
        let igstRate = 0;
        
        if (unitPrice <= 2500) {
          if (isInterState) {
            igstRate = 5;
          } else {
            cgstRate = 2.5;
            sgstRate = 2.5;
          }
        } else {
          if (isInterState) {
            igstRate = 18;
          } else {
            cgstRate = 9;
            sgstRate = 9;
          }
        }
        
        return { cgstRate, sgstRate, igstRate };
      };
      
      const { cgstRate, sgstRate, igstRate } = calculateTaxForItem(unitPrice, isInterState);
      
      // Calculate amounts
      const netAmount = item.net_amount || (unitPrice * quantity - discount);
      const cgstAmount = item.cgst_amount || (netAmount * cgstRate / 100);
      const sgstAmount = item.sgst_amount || (netAmount * sgstRate / 100);
      const igstAmount = item.igst_amount || (netAmount * igstRate / 100);
      const taxAmount = item.tax_amount || (cgstAmount + sgstAmount + igstAmount);
      const totalAmount = netAmount + taxAmount;
      
      // Accumulate totals
      totalNetAmount += netAmount;
      totalTaxAmount += taxAmount;
      totalCGST += cgstAmount;
      totalSGST += sgstAmount;
      totalIGST += igstAmount;
      
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
      doc.line(marginLeft + 260, rowStartY, marginLeft + 260, rowStartY + itemHeight);
      // Unit separator
      doc.line(marginLeft + 285, rowStartY, marginLeft + 285, rowStartY + itemHeight);
      // Net Amount separator
      doc.line(marginLeft + 328, rowStartY, marginLeft + 328, rowStartY + itemHeight);
      // Tax Rate separator
      doc.line(marginLeft + 400, rowStartY, marginLeft + 400, rowStartY + itemHeight);
      // Total Tax separator
      doc.line(marginLeft + 460, rowStartY, marginLeft + 460, rowStartY + itemHeight);
      
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
      
      // Unit of Measurement (centered vertically)
      doc.text(unitOfMeasurement, marginLeft + 262, rowTopY + 7);
      
      // Net Amount (centered vertically)
      doc.text(formatINR(netAmount), marginLeft + 287, rowTopY + 7);
      
      // Tax Rate (centered vertically) - Show breakdown with amounts for CGST+SGST
      // Constrain text width to prevent overflow into Total Tax column
      doc.setFontSize(7);
      let taxRateY = rowTopY + 7;
      const taxRateMaxWidth = 65; // Maximum width for tax rate column
      
      if (isInterState) {
        // Interstate: Show IGST
        if (igstRate > 0 && igstAmount > 0) {
          const igstText = `IGST ${formatNumber(igstRate)}% ${formatINR(igstAmount)}`;
          const igstLines = doc.splitTextToSize(igstText, taxRateMaxWidth);
          igstLines.forEach((line: string, idx: number) => {
            doc.text(line, marginLeft + 330, taxRateY);
            if (idx < igstLines.length - 1) taxRateY += 9;
          });
        } else {
          doc.text('0%', marginLeft + 330, taxRateY);
        }
      } else {
        // Intrastate: Always show CGST and SGST (even if 0 for some items in mixed orders)
        // Show CGST and SGST percentages with amounts separately on separate lines
        if (cgstRate > 0 && cgstAmount > 0) {
          const cgstText = `CGST ${formatNumber(cgstRate)}% ${formatINR(cgstAmount)}`;
          const cgstLines = doc.splitTextToSize(cgstText, taxRateMaxWidth);
          cgstLines.forEach((line: string, idx: number) => {
            doc.text(line, marginLeft + 330, taxRateY);
            if (idx < cgstLines.length - 1) taxRateY += 9;
          });
          taxRateY += 9;
        }
        if (sgstRate > 0 && sgstAmount > 0) {
          const sgstText = `SGST ${formatNumber(sgstRate)}% ${formatINR(sgstAmount)}`;
          const sgstLines = doc.splitTextToSize(sgstText, taxRateMaxWidth);
          sgstLines.forEach((line: string, idx: number) => {
            doc.text(line, marginLeft + 330, taxRateY);
            if (idx < sgstLines.length - 1) taxRateY += 9;
          });
        }
        // If both CGST and SGST are 0 or missing, show 0%
        if ((!cgstRate || cgstRate === 0) && (!sgstRate || sgstRate === 0) && 
            (!cgstAmount || cgstAmount === 0) && (!sgstAmount || sgstAmount === 0)) {
          doc.text('0%', marginLeft + 330, taxRateY);
        }
      }
      doc.setFontSize(9);
      
      // Total Tax (centered vertically)
      doc.text(formatINR(taxAmount), marginLeft + 402, rowTopY + 7);
      
      // Total Amount (centered vertically, bold, red for refund)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(220, 20, 60); // Red color for refund amount
      doc.text(formatINR(-totalAmount), marginLeft + 462, rowTopY + 7);
      doc.setTextColor(0, 0, 0);
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
    doc.text('No items found in this return.', marginLeft, cursorY);
    cursorY += 20;
  }

  // Totals Section
  const totalsStartY = cursorY + 10;
  const totalsWidth = 220; // Increased width to accommodate longer labels
  const totalsX = pageWidth - marginRight - totalsWidth;
  const labelX = totalsX + 5;
  const valueX = totalsX + totalsWidth - 5; // Right edge of totals box

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);

  let totalY = totalsStartY;
  doc.text('Sub Total:', labelX, totalY);
  doc.text(formatINR(-totalNetAmount), valueX, totalY, { align: 'right' });
  totalY += 15;

  if (totalCGST > 0) {
    doc.text('CGST:', labelX, totalY);
    doc.text(formatINR(-totalCGST), valueX, totalY, { align: 'right' });
    totalY += 15;
  }
  if (totalSGST > 0) {
    doc.text('SGST:', labelX, totalY);
    doc.text(formatINR(-totalSGST), valueX, totalY, { align: 'right' });
    totalY += 15;
  }
  if (totalIGST > 0) {
    doc.text('IGST:', labelX, totalY);
    doc.text(formatINR(-totalIGST), valueX, totalY, { align: 'right' });
    totalY += 15;
  }

  doc.setLineWidth(0.5);
  doc.line(totalsX, totalY, totalsX + totalsWidth, totalY);
  totalY += 12; // Increased spacing after line

  // Calculate total refund amount
  const totalRefundAmount = totalNetAmount + totalTaxAmount;
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(220, 20, 60); // Red for refund
  // Put label and value on separate lines to prevent overlap
  doc.text('Total Refund Amount:', labelX, totalY);
  totalY += 15;
  doc.setFontSize(12);
  doc.text(formatINR(-totalRefundAmount), valueX, totalY, { align: 'right' });
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');

  // Amount in Words
  totalY += 20;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Refund Amount in Words:', marginLeft, totalY);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(9);
  const amountWords = formatAmountInWords(totalRefundAmount);
  const wordsLines = doc.splitTextToSize(amountWords, pageWidth - marginLeft - marginRight);
  wordsLines.forEach((line: string, idx: number) => {
    doc.text(line, marginLeft + 150, totalY + (idx * 12));
  });

  // Refund Method
  totalY += wordsLines.length * 12 + 15;
  if (returnOrder.refund_method) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Refund Method: ${returnOrder.refund_method}`, marginLeft, totalY);
    totalY += 15;
  }

  // Footer Notes
  totalY += 20;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  const footerNotes = [
    'This is a credit note for the returned goods',
    'The refund amount will be processed as per the refund method specified',
    'Please retain this document for your records',
  ];
  footerNotes.forEach((note, index) => {
    doc.text(note, marginLeft, totalY);
    totalY += 10;
  });

  // Page Number
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Page 1 of 1', pageWidth - marginRight, pageHeight - 20, { align: 'right' });

  doc.save(`return_invoice_${returnOrder.return_number}.pdf`);
}

// Type for Influencer Payment Voucher
type InfluencerPaymentVoucher = {
  billNumber: string;
  date: string;
  influencerName: string;
  purpose?: string;
  detailedPurpose?: string;
  amount: number;
  referredByName?: string;
  cashReceiverName?: string;
  cashReceiverPhone?: string;
};

// Generate Influencer Payment Voucher PDF
export async function generateInfluencerPaymentVoucher(voucher: InfluencerPaymentVoucher) {
  const doc = new jsPDF('portrait', 'pt', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginLeft = 40;
  const marginRight = 40;
  const marginTop = 40;
  let cursorY = marginTop;

  // Helper function to format amount (no currency symbol)
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(amount || 0));
  };

  // Company Information
  const companyInfo = {
    name: 'ONLY2U FASHION PRIVATE LIMITED',
    address: 'Flot No:1, 9-1-87, Ground Floor, Meghna Manor Apartments, Old Lancer Road, Secunderabad-500025.',
    gstin: '36AAECO9300L1Z9',
  };

  // White background (no tint)
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  // Company Name (Large, Blue, Serif-like font)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.setTextColor(0, 51, 153); // Blue color
  const companyNameWidth = doc.getTextWidth(companyInfo.name);
  doc.text(companyInfo.name, (pageWidth - companyNameWidth) / 2, cursorY);
  cursorY += 25;

  // Main Address (Smaller, Blue, Sans-serif)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(0, 51, 153);
  const addressLines = doc.splitTextToSize(companyInfo.address, pageWidth - marginLeft - marginRight);
  addressLines.forEach((line: string) => {
    const lineWidth = doc.getTextWidth(line);
    doc.text(line, (pageWidth - lineWidth) / 2, cursorY);
    cursorY += 14;
  });
  cursorY += 10;

  // GST Number
  doc.setFontSize(10);
  doc.setTextColor(0, 51, 153);
  const gstText = `GST NO : ${companyInfo.gstin}`;
  const gstWidth = doc.getTextWidth(gstText);
  doc.text(gstText, (pageWidth - gstWidth) / 2, cursorY);
  cursorY += 40;

  // Transaction Details Section
  doc.setTextColor(0, 0, 0); // Black for form fields
  doc.setDrawColor(0, 51, 153); // Blue lines
  doc.setLineWidth(0.5);

  // Bill No. and Date (on same line)
  cursorY += 20;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Bill No.', marginLeft, cursorY);
  
  
  // Bill Number value with line extending from it
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  const billNoX = marginLeft + 75;
  const billNoLineEndX = billNoX + 120;
  doc.text(voucher.billNumber, billNoX, cursorY);
  doc.line(billNoX + doc.getTextWidth(voucher.billNumber) + 5, cursorY - 4, billNoLineEndX, cursorY - 4);
  
  // Date on the right
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  const dateLabelX = pageWidth - marginRight - 200;
  doc.text('Date.', dateLabelX, cursorY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const dateValueX = dateLabelX + 45;
  doc.text(voucher.date, dateValueX, cursorY);
  doc.line(dateValueX + doc.getTextWidth(voucher.date) + 5, cursorY - 4, pageWidth - marginRight - 20, cursorY - 4);
  
  cursorY += 35;

  // CASH PAID TO
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('CASH PAID TO', marginLeft, cursorY);
  
  // Cash Paid To value with line
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const cashPaidToX = marginLeft + 100;
  const cashPaidToLineEndX = pageWidth - marginRight - 20;
  doc.text(voucher.influencerName, cashPaidToX, cursorY);
  doc.line(cashPaidToX + doc.getTextWidth(voucher.influencerName) + 5, cursorY - 4, cashPaidToLineEndX, cursorY - 4);
  
  cursorY += 35;

  // THE PURPOSE OF
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('THE PURPOSE OF', marginLeft, cursorY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const purposeStartX = marginLeft + 110;
  const purposeLineEndX = pageWidth - marginRight - 20;
  
  if (voucher.detailedPurpose) {
    const purposeLines = doc.splitTextToSize(voucher.detailedPurpose, purposeLineEndX - purposeStartX - 10);
    purposeLines.forEach((line: string, idx: number) => {
      doc.text(line, purposeStartX, cursorY + (idx * 15));
    });
    // Draw line extending from the last line
    const lastLineY = cursorY + (purposeLines.length - 1) * 15;
    doc.line(purposeStartX + doc.getTextWidth(purposeLines[purposeLines.length - 1]) + 5, lastLineY - 4, purposeLineEndX, lastLineY - 4);
    cursorY += purposeLines.length * 15;
  } else {
    doc.line(purposeStartX, cursorY - 4, purposeLineEndX, cursorY - 4);
    cursorY += 15;
  }
  
  cursorY += 25;

  // RUPEES IN WORDS
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('RUPEES IN WORDS', marginLeft, cursorY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const wordsStartX = marginLeft + 130;
  const wordsLineEndX = pageWidth - marginRight - 20;
  const amountWords = formatAmountInWords(voucher.amount);
  const wordsLines = doc.splitTextToSize(amountWords, wordsLineEndX - wordsStartX - 10);
  wordsLines.forEach((line: string, idx: number) => {
    doc.text(line, wordsStartX, cursorY + (idx * 15));
  });
  // Draw line extending from the last line
  const lastWordsLineY = cursorY + (wordsLines.length - 1) * 15;
  doc.line(wordsStartX + doc.getTextWidth(wordsLines[wordsLines.length - 1]) + 5, lastWordsLineY - 4, wordsLineEndX, lastWordsLineY - 4);
  cursorY += wordsLines.length * 15 + 40;

  // Amount Box (Bottom Right) - positioned above signature lines
  const amountBoxWidth = 140;
  const amountBoxHeight = 50;
  const amountBoxX = pageWidth - marginRight - amountBoxWidth;
  const amountBoxY = pageHeight - marginRight - amountBoxHeight - 80;

  doc.setDrawColor(0, 51, 153);
  doc.setLineWidth(1);
  doc.rect(amountBoxX, amountBoxY, amountBoxWidth, amountBoxHeight);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(0, 0, 0);
  const amountText = formatAmount(voucher.amount);
  const amountTextWidth = doc.getTextWidth(amountText);
  doc.text(amountText, amountBoxX + (amountBoxWidth - amountTextWidth) / 2, amountBoxY + 32);

  // Signature Lines (Bottom)
  const signatureY = pageHeight - marginRight - 50;
  const signatureLineLength = 130;
  const signatureSpacing = (pageWidth - marginLeft - marginRight - (signatureLineLength * 3)) / 2;

  // Cash Payee Sign (Left)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.setDrawColor(0, 51, 153);
  doc.setLineWidth(0.5);
  doc.line(marginLeft, signatureY - 15, marginLeft + signatureLineLength, signatureY - 15);
  doc.text('Cash Payee Sign', marginLeft, signatureY);

  // Refered Name / Sign (Center)
  const centerX = marginLeft + signatureLineLength + signatureSpacing;
  doc.line(centerX, signatureY - 15, centerX + signatureLineLength, signatureY - 15);
  doc.text('Refered Name / Sign', centerX, signatureY);
  if (voucher.referredByName) {
    doc.setFontSize(8);
    doc.text(voucher.referredByName, centerX, signatureY - 18);
    doc.setFontSize(9);
  }

  // Cash Receiver Sign. and Phone Number (Right)
  const rightX = centerX + signatureLineLength + signatureSpacing;
  doc.line(rightX, signatureY - 15, rightX + signatureLineLength, signatureY - 15);
  doc.text('Cash Receiver Sign. and Phone Number', rightX, signatureY);
  if (voucher.cashReceiverName) {
    doc.setFontSize(8);
    doc.text(voucher.cashReceiverName, rightX, signatureY - 18);
    if (voucher.cashReceiverPhone) {
      doc.text(voucher.cashReceiverPhone, rightX, signatureY - 28);
    }
    doc.setFontSize(9);
  }

  // Save PDF
  doc.save(`influencer_payment_voucher_${voucher.billNumber}.pdf`);
}

// Type for Vendor Commission Invoice
type VendorCommissionInvoice = {
  invoiceNumber: string;
  date: string;
  vendorName: string;
  vendorAddress?: string;
  vendorGSTIN?: string;
  vendorPAN?: string;
  commissionRate: number;
  totalSalesAmount: number;
  commissionAmount: number;
  period?: string; // e.g., "January 2025"
  purpose?: string;
  detailedPurpose?: string;
  referredByName?: string;
  cashReceiverName?: string;
  cashReceiverPhone?: string;
};

// Generate Vendor Commission Invoice PDF (Tax Invoice Format)
export async function generateVendorCommissionInvoice(invoice: VendorCommissionInvoice) {
  // Parse vendor address to determine state and tax calculation
  const vendorAddressParsed = parseAddress(invoice.vendorAddress || '');
  
  // Determine supply type (InterState or IntraState)
  // Seller state code is '36' (Telangana) from GSTIN 36AAECO9300L1Z9
  const sellerStateCode = '36';
  const buyerStateCode = vendorAddressParsed.stateCode || '';
  
  // If buyer state code is not available, try to extract from state name
  let finalBuyerStateCode = buyerStateCode;
  if (!finalBuyerStateCode && vendorAddressParsed.state) {
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
    const stateUpper = vendorAddressParsed.state.toUpperCase();
    finalBuyerStateCode = stateNameToCode[stateUpper] || '';
  }
  
  // Determine if interstate: different states = interstate, same state = intrastate
  const isInterState = finalBuyerStateCode !== '' && sellerStateCode !== finalBuyerStateCode;
  
  // Calculate tax for commission amount
  const calculateTaxForItem = (unitPrice: number, isInterState: boolean) => {
    const PRICE_THRESHOLD = 2500;
    
    if (unitPrice <= PRICE_THRESHOLD) {
      if (isInterState) {
        return { igstRate: 5, cgstRate: 0, sgstRate: 0 };
      } else {
        return { igstRate: 0, cgstRate: 2.5, sgstRate: 2.5 };
      }
    } else {
      if (isInterState) {
        return { igstRate: 18, cgstRate: 0, sgstRate: 0 };
      } else {
        return { igstRate: 0, cgstRate: 9, sgstRate: 9 };
      }
    }
  };

  // Calculate tax for commission
  const taxRates = calculateTaxForItem(invoice.commissionAmount, isInterState);
  const netAmount = invoice.commissionAmount;
  const cgstAmount = (netAmount * taxRates.cgstRate) / 100;
  const sgstAmount = (netAmount * taxRates.sgstRate) / 100;
  const igstAmount = (netAmount * taxRates.igstRate) / 100;
  const totalTaxAmount = cgstAmount + sgstAmount + igstAmount;
  const invoiceTotal = netAmount + totalTaxAmount;

  // Create a mock order structure to reuse the tax invoice generation logic
  const mockOrder: Order = {
    id: invoice.invoiceNumber,
    user_id: 'vendor',
    order_number: invoice.invoiceNumber,
    status: 'completed',
    total_amount: invoiceTotal,
    shipping_address: invoice.vendorAddress || '',
    billing_address: invoice.vendorAddress || '',
    payment_method: 'Commission',
    payment_status: 'pending',
    notes: invoice.detailedPurpose || `Commission @ ${invoice.commissionRate}% on sales of ${invoice.totalSalesAmount}`,
    created_at: invoice.date,
    order_items: [{
      id: '1',
      order_id: invoice.invoiceNumber,
      product_id: 'COMMISSION',
      product_name: `Commission @ ${invoice.commissionRate}% on Sales`,
      product_sku: 'COMM-' + invoice.invoiceNumber,
      quantity: 1,
      unit_price: netAmount,
      total_price: netAmount,
      hsn_code: '998314', // HSN code for commission/fee for services
      unit_of_measurement: 'NOS',
      cgst_rate: taxRates.cgstRate,
      sgst_rate: taxRates.sgstRate,
      igst_rate: taxRates.igstRate,
      cgst_amount: cgstAmount,
      sgst_amount: sgstAmount,
      igst_amount: igstAmount,
      net_amount: netAmount,
      tax_amount: totalTaxAmount,
      item_total: invoiceTotal,
    }],
    user: {
      name: invoice.vendorName,
      email: '',
      phone: '',
    },
  };

  // Call generateOrderPdf with Only2U as seller and custom options for commission invoice
  await generateOrderPdf(mockOrder, {
    name: 'ONLY2U FASHION PRIVATE LIMITED',
    address: 'Flot No:1, 9-1-87, Ground Floor, Meghna Manor Apartments, Old Lancer Road, Secunderabad-500025.',
    pan: 'AAECO9300L',
    gstin: '36AAECO9300L1Z9',
  }, {
    useBilledBy: true, // Use "BILLED BY" instead of "SOLD BY"
    useBilledTo: true, // Use "BILLED TO" instead of billing/shipping address
    hideShippingAddress: true, // Hide shipping address section
    hideOrderDetails: true, // Hide order details section
    hideUnitPrice: true, // Hide unit price column, only show price
    hideQty: true, // Hide quantity column
    hideUnit: true, // Hide unit of measurement column
    hideTransactionDetails: true, // Hide transaction details section
  });
}
