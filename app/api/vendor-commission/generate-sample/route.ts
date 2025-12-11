import { NextResponse } from 'next/server';
import { generateVendorCommissionInvoice } from '../../../../lib/pdfUtils';

export async function GET() {
  try {
    // Generate sample vendor commission invoice for Shubhamastu
    const sampleInvoice = {
      invoiceNumber: `VCI-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`,
      date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      vendorName: 'Shubhamastu Shopping Mall Private Limited',
      vendorAddress: '17/397, VRC centre, Nellore, Andhra Pradesh, IN',
      vendorGSTIN: '37ABFCS0076F1ZE',
      vendorPAN: 'ABFCSO076F',
      commissionRate: 10,
      totalSalesAmount: 100000.00, // Sample total sales amount
      commissionAmount: 10000.00, // 10% of 100000
      period: 'January 2025',
      purpose: 'Vendor Commission Payment',
      detailedPurpose: 'Commission payment of 10% on total sales of ₹1,00,000.00 for the period January 2025',
      referredByName: '',
      cashReceiverName: 'Shubhamastu Shopping Mall Private Limited',
      cashReceiverPhone: '',
    };

    // Generate and return the PDF
    await generateVendorCommissionInvoice(sampleInvoice);

    return NextResponse.json({ 
      success: true, 
      message: 'Sample vendor commission invoice generated successfully',
      invoice: sampleInvoice
    });
  } catch (error: any) {
    console.error('Error generating sample vendor commission invoice:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate sample invoice' },
      { status: 500 }
    );
  }
}

