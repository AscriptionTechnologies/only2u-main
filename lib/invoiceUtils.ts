/**
 * Invoice Utilities
 * Helper functions for invoice calculations and GST compliance
 */

export type InvoiceType = 'B2B' | 'B2C' | 'Vendor' | 'Influencer' | 'B2B-B2C' | 'B2C-C' | 'B2B-C';
export type SupplyType = 'InterState' | 'IntraState';
export type TransactionType = 'Sale' | 'Purchase' | 'Service';

export interface Party {
  name: string;
  address: string;
  state: string;
  stateCode: string;
  gstin?: string | null;
  pan?: string | null;
  phone?: string | null;
  email?: string | null;
}

export interface InvoiceItem {
  description: string;
  hsnCode: string;
  quantity: number;
  unit?: string;
  rate: number;
  discount: number;
  taxableValue: number;
  cgstRate: number;
  cgstAmount: number;
  sgstRate: number;
  sgstAmount: number;
  igstRate: number;
  igstAmount: number;
  total: number;
}

export interface InvoiceSummary {
  totalTaxableValue: number;
  totalCGST: number;
  totalSGST: number;
  totalIGST: number;
  freightCharges: number;
  packingCharges: number;
  shippingCharges: number;
  otherCharges: number;
  roundOff: number;
  grandTotal: number;
  amountInWords: string;
}

export interface InvoiceData {
  invoiceNo: string;
  invoiceDate: string;
  invoiceType: InvoiceType;
  supplyType: SupplyType;
  transactionType: TransactionType;
  placeOfSupply: string;
  placeOfDelivery?: string;
  payment?: {
    mode?: string;
    transactionId?: string;
    dateTime?: string;
  };
  seller: Party;
  buyer: Party;
  consignee?: Party | null;
  items: InvoiceItem[];
  summary: InvoiceSummary;
  transport?: any;
  bank?: any;
  signature?: any;
  optional?: any;
}

/**
 * Calculate taxable value for an item
 */
export function calculateTaxableValue(quantity: number, rate: number, discount: number): number {
  return Math.max(0, quantity * rate - discount);
}

/**
 * Calculate tax amounts based on supply type
 */
export function calculateTaxes(
  taxableValue: number,
  taxRate: number,
  supplyType: SupplyType
): { cgstRate: number; cgstAmount: number; sgstRate: number; sgstAmount: number; igstRate: number; igstAmount: number } {
  if (supplyType === 'IntraState') {
    // Split tax rate equally between CGST and SGST
    const cgstRate = taxRate / 2;
    const sgstRate = taxRate / 2;
    const cgstAmount = (taxableValue * cgstRate) / 100;
    const sgstAmount = (taxableValue * sgstRate) / 100;
    
    return {
      cgstRate,
      cgstAmount: Math.round(cgstAmount * 100) / 100,
      sgstRate,
      sgstAmount: Math.round(sgstAmount * 100) / 100,
      igstRate: 0,
      igstAmount: 0,
    };
  } else {
    // InterState - use IGST
    const igstAmount = (taxableValue * taxRate) / 100;
    
    return {
      cgstRate: 0,
      cgstAmount: 0,
      sgstRate: 0,
      sgstAmount: 0,
      igstRate: taxRate,
      igstAmount: Math.round(igstAmount * 100) / 100,
    };
  }
}

/**
 * Calculate item total including taxes
 */
export function calculateItemTotal(
  taxableValue: number,
  cgstAmount: number,
  sgstAmount: number,
  igstAmount: number
): number {
  return Math.round((taxableValue + cgstAmount + sgstAmount + igstAmount) * 100) / 100;
}

/**
 * Calculate invoice summary from items
 */
export function calculateInvoiceSummary(
  items: InvoiceItem[],
  freightCharges: number = 0,
  packingCharges: number = 0,
  shippingCharges: number = 0,
  otherCharges: number = 0
): InvoiceSummary {
  const totalTaxableValue = items.reduce((sum, item) => sum + item.taxableValue, 0);
  const totalCGST = items.reduce((sum, item) => sum + item.cgstAmount, 0);
  const totalSGST = items.reduce((sum, item) => sum + item.sgstAmount, 0);
  const totalIGST = items.reduce((sum, item) => sum + item.igstAmount, 0);
  
  const subtotal = totalTaxableValue + totalCGST + totalSGST + totalIGST;
  const charges = freightCharges + packingCharges + shippingCharges + otherCharges;
  const beforeRoundOff = subtotal + charges;
  
  // Round off to nearest rupee
  const grandTotal = Math.round(beforeRoundOff);
  const roundOff = grandTotal - beforeRoundOff;
  
  return {
    totalTaxableValue: Math.round(totalTaxableValue * 100) / 100,
    totalCGST: Math.round(totalCGST * 100) / 100,
    totalSGST: Math.round(totalSGST * 100) / 100,
    totalIGST: Math.round(totalIGST * 100) / 100,
    freightCharges,
    packingCharges,
    shippingCharges,
    otherCharges,
    roundOff: Math.round(roundOff * 100) / 100,
    grandTotal,
    amountInWords: numberToWords(grandTotal),
  };
}

/**
 * Convert number to words (Indian numbering system)
 */
export function numberToWords(num: number): string {
  const ones = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
  const teens = ['ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
  const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
  
  if (num === 0) return 'zero only';
  
  const rupees = Math.floor(num);
  const paise = Math.round((num - rupees) * 100);
  
  function convertHundreds(n: number): string {
    if (n === 0) return '';
    if (n < 10) return ones[n];
    if (n < 20) return teens[n - 10];
    if (n < 100) {
      const ten = Math.floor(n / 10);
      const one = n % 10;
      return tens[ten] + (one > 0 ? ' ' + ones[one] : '');
    }
    if (n < 1000) {
      const hundred = Math.floor(n / 100);
      const remainder = n % 100;
      return ones[hundred] + ' hundred' + (remainder > 0 ? ' ' + convertHundreds(remainder) : '');
    }
    return '';
  }
  
  function convertLarge(n: number): string {
    if (n < 1000) return convertHundreds(n);
    
    const crore = Math.floor(n / 10000000);
    const remainder = n % 10000000;
    const lakh = Math.floor(remainder / 100000);
    const remainder2 = remainder % 100000;
    const thousand = Math.floor(remainder2 / 1000);
    const remainder3 = remainder2 % 1000;
    
    let result = '';
    if (crore > 0) result += convertHundreds(crore) + ' crore ';
    if (lakh > 0) result += convertHundreds(lakh) + ' lakh ';
    if (thousand > 0) result += convertHundreds(thousand) + ' thousand ';
    if (remainder3 > 0) result += convertHundreds(remainder3);
    
    return result.trim();
  }
  
  let words = convertLarge(rupees);
  if (words) words += ' rupees';
  if (paise > 0) {
    if (words) words += ' and ';
    words += convertHundreds(paise) + ' paise';
  }
  words += ' only';
  
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/**
 * Determine supply type based on seller and buyer state codes
 */
export function determineSupplyType(sellerStateCode: string, buyerStateCode: string): SupplyType {
  return sellerStateCode === buyerStateCode ? 'IntraState' : 'InterState';
}

/**
 * Validate invoice data structure
 */
export function validateInvoiceData(data: Partial<InvoiceData>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!data.invoiceNo) errors.push('Invoice number is required');
  if (!data.invoiceDate) errors.push('Invoice date is required');
  if (!data.invoiceType) errors.push('Invoice type is required');
  if (!data.supplyType) errors.push('Supply type is required');
  if (!data.transactionType) errors.push('Transaction type is required');
  if (!data.placeOfSupply) errors.push('Place of supply is required');
  if (!data.seller) errors.push('Seller information is required');
  if (!data.buyer) errors.push('Buyer information is required');
  if (!data.items || data.items.length === 0) errors.push('At least one item is required');
  
  // Validate seller
  if (data.seller) {
    if (!data.seller.name) errors.push('Seller name is required');
    if (!data.seller.address) errors.push('Seller address is required');
    if (!data.seller.state) errors.push('Seller state is required');
    if (!data.seller.stateCode) errors.push('Seller state code is required');
    if (data.invoiceType === 'B2B' && !data.seller.gstin) {
      errors.push('Seller GSTIN is required for B2B invoices');
    }
  }
  
  // Validate buyer
  if (data.buyer) {
    if (!data.buyer.name) errors.push('Buyer name is required');
    if (!data.buyer.address) errors.push('Buyer address is required');
    if (!data.buyer.state) errors.push('Buyer state is required');
    if (!data.buyer.stateCode) errors.push('Buyer state code is required');
    if (data.invoiceType === 'B2B' && !data.buyer.gstin) {
      errors.push('Buyer GSTIN is required for B2B invoices');
    }
  }
  
  // Validate items
  if (data.items) {
    data.items.forEach((item, index) => {
      if (!item.description) errors.push(`Item ${index + 1}: Description is required`);
      if (!item.hsnCode) errors.push(`Item ${index + 1}: HSN code is required`);
      if (item.quantity <= 0) errors.push(`Item ${index + 1}: Quantity must be greater than 0`);
      if (item.rate < 0) errors.push(`Item ${index + 1}: Rate cannot be negative`);
      
      // Validate tax fields based on supply type
      if (data.supplyType === 'IntraState') {
        if (item.igstRate > 0 || item.igstAmount > 0) {
          errors.push(`Item ${index + 1}: IGST cannot be set for IntraState supply`);
        }
      } else if (data.supplyType === 'InterState') {
        if (item.cgstRate > 0 || item.cgstAmount > 0 || item.sgstRate > 0 || item.sgstAmount > 0) {
          errors.push(`Item ${index + 1}: CGST and SGST cannot be set for InterState supply`);
        }
      }
    });
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Generate invoice number
 */
export function generateInvoiceNumber(
  invoiceType: InvoiceType,
  transactionType: TransactionType
): string {
  const prefix = invoiceType === 'B2B' ? 'INV-B2B' :
                 invoiceType === 'B2C' ? 'INV-B2C' :
                 invoiceType === 'Vendor' ? 'INV-VEN' :
                 invoiceType === 'Influencer' ? 'INV-INF' : 'INV';
  
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  
  return `${prefix}-${dateStr}-${random}`;
}

