"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "../../../../lib/supabase";

type Invoice = {
  id: string;
  invoice_no: string;
  invoice_date: string;
  invoice_type: string;
  supply_type: string;
  transaction_type: string;
  place_of_supply: string;
  place_of_delivery?: string | null;
  payment_mode?: string | null;
  payment_transaction_id?: string | null;
  payment_date_time?: string | null;
  seller: any;
  buyer: any;
  consignee?: any | null;
  summary: any;
  transport?: any | null;
  bank?: any | null;
  signature?: any | null;
  optional?: any | null;
  status: string;
  invoice_data: any;
};

type InvoiceItem = {
  id: string;
  description: string;
  hsn_code: string;
  quantity: number;
  unit?: string | null;
  rate: number;
  discount: number;
  taxable_value: number;
  cgst_rate: number;
  cgst_amount: number;
  sgst_rate: number;
  sgst_amount: number;
  igst_rate: number;
  igst_amount: number;
  total: number;
  item_order: number;
};

function InvoiceViewContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const invoiceId = searchParams?.get("id");
  
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (invoiceId) {
      fetchInvoice();
    }
  }, [invoiceId]);

  const fetchInvoice = async () => {
    if (!invoiceId) return;

    setLoading(true);
    try {
      // Fetch invoice
      const { data: invoiceData, error: invoiceError } = await supabase
        .from("invoices")
        .select("*")
        .eq("id", invoiceId)
        .single();

      if (invoiceError) throw invoiceError;

      setInvoice(invoiceData as Invoice);

      // Fetch items
      const { data: itemsData, error: itemsError } = await supabase
        .from("invoice_items")
        .select("*")
        .eq("invoice_id", invoiceId)
        .order("item_order", { ascending: true });

      if (itemsError) throw itemsError;

      setItems((itemsData as InvoiceItem[]) || []);
    } catch (err: any) {
      console.error("Error fetching invoice:", err);
      setError(err.message || "Failed to load invoice");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleBack = () => {
    router.push("/admin/InvoiceManagement");
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#F53F7A]"></div>
          <p className="mt-4 text-gray-600">Loading invoice...</p>
        </div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">{error || "Invoice not found"}</p>
          <button
            onClick={handleBack}
            className="mt-4 text-sm text-red-600 hover:text-red-700 underline"
          >
            ← Back to Invoice Management
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Action Buttons */}
      <div className="mb-6 flex items-center justify-between print:hidden">
        <button
          onClick={handleBack}
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-800"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Invoices
        </button>
        <div className="flex gap-2">
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 bg-[#F53F7A] text-white px-4 py-2 rounded-lg hover:bg-[#F53F7A]/90 transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print Invoice
          </button>
        </div>
      </div>

      {/* Invoice Document */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-8 max-w-4xl mx-auto print:shadow-none print:border-none">
        {/* Header */}
        <div className="border-b-2 border-gray-300 pb-6 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">TAX INVOICE</h1>
              <div className="flex gap-4 text-sm text-gray-600">
                <span>
                  <strong>Invoice No:</strong> {invoice.invoice_no}
                </span>
                <span>
                  <strong>Date:</strong> {new Date(invoice.invoice_date).toLocaleDateString('en-IN')}
                </span>
              </div>
            </div>
            <div className="text-right">
              <div className="inline-flex px-3 py-1 rounded-full text-sm font-semibold bg-blue-100 text-blue-700 mb-2">
                {invoice.invoice_type}
              </div>
              <div className="text-sm text-gray-600">
                <div>
                  <strong>Supply Type:</strong> {invoice.supply_type}
                </div>
                <div>
                  <strong>Transaction:</strong> {invoice.transaction_type}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Seller and Buyer Information */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          {/* Seller */}
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-bold text-gray-900 mb-3 text-sm uppercase tracking-wide">
              {invoice.transaction_type === 'Purchase' ? 'From' : 'From (Seller)'}
            </h3>
            <div className="text-sm space-y-1">
              <p className="font-semibold text-gray-900">{invoice.seller?.name}</p>
              <p className="text-gray-600">{invoice.seller?.address}</p>
              <p className="text-gray-600">
                {invoice.seller?.state} - {invoice.seller?.stateCode}
              </p>
              {invoice.seller?.gstin && (
                <p className="text-gray-600">
                  <strong>GSTIN:</strong> <span className="font-mono">{invoice.seller.gstin}</span>
                </p>
              )}
              {invoice.seller?.pan && (
                <p className="text-gray-600">
                  <strong>PAN:</strong> <span className="font-mono">{invoice.seller.pan}</span>
                </p>
              )}
              {invoice.seller?.phone && (
                <p className="text-gray-600">
                  <strong>Phone:</strong> {invoice.seller.phone}
                </p>
              )}
              {invoice.seller?.email && (
                <p className="text-gray-600">
                  <strong>Email:</strong> {invoice.seller.email}
                </p>
              )}
            </div>
          </div>

          {/* Buyer */}
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-bold text-gray-900 mb-3 text-sm uppercase tracking-wide">
              {invoice.transaction_type === 'Purchase' ? 'To (Buyer)' : 'Bill To (Buyer)'}
            </h3>
            <div className="text-sm space-y-1">
              <p className="font-semibold text-gray-900">{invoice.buyer?.name}</p>
              <p className="text-gray-600">{invoice.buyer?.address}</p>
              <p className="text-gray-600">
                {invoice.buyer?.state} - {invoice.buyer?.stateCode}
              </p>
              {invoice.buyer?.gstin && (
                <p className="text-gray-600">
                  <strong>GSTIN:</strong> <span className="font-mono">{invoice.buyer.gstin}</span>
                </p>
              )}
              {invoice.buyer?.pan && (
                <p className="text-gray-600">
                  <strong>PAN:</strong> <span className="font-mono">{invoice.buyer.pan}</span>
                </p>
              )}
              {invoice.buyer?.phone && (
                <p className="text-gray-600">
                  <strong>Phone:</strong> {invoice.buyer.phone}
                </p>
              )}
              {invoice.buyer?.email && (
                <p className="text-gray-600">
                  <strong>Email:</strong> {invoice.buyer.email}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Consignee (if different from buyer) */}
        {invoice.consignee && (
          <div className="mb-6 border border-gray-200 rounded-lg p-4">
            <h3 className="font-bold text-gray-900 mb-3 text-sm uppercase tracking-wide">
              Ship To (Consignee)
            </h3>
            <div className="text-sm space-y-1">
              <p className="font-semibold text-gray-900">{invoice.consignee?.name}</p>
              <p className="text-gray-600">{invoice.consignee?.address}</p>
              {invoice.consignee?.gstin && (
                <p className="text-gray-600">
                  <strong>GSTIN:</strong> <span className="font-mono">{invoice.consignee.gstin}</span>
                </p>
              )}
            </div>
          </div>
        )}

        {/* Items Table */}
        <div className="mb-6 overflow-x-auto">
          <table className="min-w-full border border-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="border border-gray-200 px-4 py-2 text-left text-xs font-semibold text-gray-700">
                  S.No
                </th>
                <th className="border border-gray-200 px-4 py-2 text-left text-xs font-semibold text-gray-700">
                  Description
                </th>
                <th className="border border-gray-200 px-4 py-2 text-center text-xs font-semibold text-gray-700">
                  HSN Code
                </th>
                <th className="border border-gray-200 px-4 py-2 text-center text-xs font-semibold text-gray-700">
                  Qty
                </th>
                <th className="border border-gray-200 px-4 py-2 text-center text-xs font-semibold text-gray-700">
                  Unit
                </th>
                <th className="border border-gray-200 px-4 py-2 text-right text-xs font-semibold text-gray-700">
                  Rate
                </th>
                <th className="border border-gray-200 px-4 py-2 text-right text-xs font-semibold text-gray-700">
                  Discount
                </th>
                <th className="border border-gray-200 px-4 py-2 text-right text-xs font-semibold text-gray-700">
                  Taxable Value
                </th>
                {invoice.supply_type === 'IntraState' ? (
                  <>
                    <th className="border border-gray-200 px-4 py-2 text-center text-xs font-semibold text-gray-700">
                      CGST
                    </th>
                    <th className="border border-gray-200 px-4 py-2 text-center text-xs font-semibold text-gray-700">
                      SGST
                    </th>
                  </>
                ) : (
                  <th className="border border-gray-200 px-4 py-2 text-center text-xs font-semibold text-gray-700">
                    IGST
                  </th>
                )}
                <th className="border border-gray-200 px-4 py-2 text-right text-xs font-semibold text-gray-700">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={item.id}>
                  <td className="border border-gray-200 px-4 py-2 text-sm text-gray-900">
                    {index + 1}
                  </td>
                  <td className="border border-gray-200 px-4 py-2 text-sm text-gray-900">
                    {item.description}
                  </td>
                  <td className="border border-gray-200 px-4 py-2 text-sm text-gray-900 text-center font-mono">
                    {item.hsn_code}
                  </td>
                  <td className="border border-gray-200 px-4 py-2 text-sm text-gray-900 text-center">
                    {item.quantity}
                  </td>
                  <td className="border border-gray-200 px-4 py-2 text-sm text-gray-900 text-center">
                    {item.unit || '—'}
                  </td>
                  <td className="border border-gray-200 px-4 py-2 text-sm text-gray-900 text-right">
                    ₹{item.rate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="border border-gray-200 px-4 py-2 text-sm text-gray-900 text-right">
                    {item.discount > 0 ? `₹${item.discount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                  </td>
                  <td className="border border-gray-200 px-4 py-2 text-sm text-gray-900 text-right">
                    ₹{item.taxable_value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  {invoice.supply_type === 'IntraState' ? (
                    <>
                      <td className="border border-gray-200 px-4 py-2 text-sm text-gray-900 text-center">
                        {item.cgst_rate > 0 ? (
                          <div>
                            <div className="text-xs">{item.cgst_rate}%</div>
                            <div className="font-medium">₹{item.cgst_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                          </div>
                        ) : '—'}
                      </td>
                      <td className="border border-gray-200 px-4 py-2 text-sm text-gray-900 text-center">
                        {item.sgst_rate > 0 ? (
                          <div>
                            <div className="text-xs">{item.sgst_rate}%</div>
                            <div className="font-medium">₹{item.sgst_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                          </div>
                        ) : '—'}
                      </td>
                    </>
                  ) : (
                    <td className="border border-gray-200 px-4 py-2 text-sm text-gray-900 text-center">
                      {item.igst_rate > 0 ? (
                        <div>
                          <div className="text-xs">{item.igst_rate}%</div>
                          <div className="font-medium">₹{item.igst_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                        </div>
                      ) : '—'}
                    </td>
                  )}
                  <td className="border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-900 text-right">
                    ₹{item.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Summary Section */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          {/* Left: Additional Information */}
          <div className="space-y-4">
            {invoice.place_of_delivery && (
              <div className="text-sm">
                <strong>Place of Delivery:</strong> {invoice.place_of_delivery}
              </div>
            )}
            {invoice.place_of_supply && (
              <div className="text-sm">
                <strong>Place of Supply:</strong> {invoice.place_of_supply}
              </div>
            )}
            {invoice.payment_mode && (
              <div className="text-sm">
                <strong>Payment Mode:</strong> {invoice.payment_mode}
                {invoice.payment_transaction_id && (
                  <span className="ml-2 font-mono text-xs">({invoice.payment_transaction_id})</span>
                )}
              </div>
            )}
            {invoice.transport && (
              <div className="border border-gray-200 rounded-lg p-3 text-sm">
                <strong className="block mb-2">Transport Details:</strong>
                {invoice.transport.transporterName && (
                  <div>Transporter: {invoice.transport.transporterName}</div>
                )}
                {invoice.transport.vehicleNo && (
                  <div>Vehicle No: {invoice.transport.vehicleNo}</div>
                )}
                {invoice.transport.lrNo && (
                  <div>LR No: {invoice.transport.lrNo}</div>
                )}
                {invoice.transport.ewayBillNo && (
                  <div>E-Way Bill: {invoice.transport.ewayBillNo}</div>
                )}
              </div>
            )}
            {invoice.bank && (
              <div className="border border-gray-200 rounded-lg p-3 text-sm">
                <strong className="block mb-2">Bank Details:</strong>
                {invoice.bank.bankName && <div>Bank: {invoice.bank.bankName}</div>}
                {invoice.bank.accountNo && (
                  <div>Account: <span className="font-mono">{invoice.bank.accountNo}</span></div>
                )}
                {invoice.bank.ifsc && (
                  <div>IFSC: <span className="font-mono">{invoice.bank.ifsc}</span></div>
                )}
              </div>
            )}
          </div>

          {/* Right: Totals */}
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Taxable Value:</span>
                <span className="font-medium">
                  ₹{parseFloat(invoice.summary?.totalTaxableValue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              
              {invoice.supply_type === 'IntraState' ? (
                <>
                  {parseFloat(invoice.summary?.totalCGST || 0) > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">CGST:</span>
                      <span className="font-medium">
                        ₹{parseFloat(invoice.summary?.totalCGST || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                  {parseFloat(invoice.summary?.totalSGST || 0) > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">SGST:</span>
                      <span className="font-medium">
                        ₹{parseFloat(invoice.summary?.totalSGST || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                </>
              ) : (
                parseFloat(invoice.summary?.totalIGST || 0) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">IGST:</span>
                    <span className="font-medium">
                      ₹{parseFloat(invoice.summary?.totalIGST || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )
              )}

              {parseFloat(invoice.summary?.freightCharges || 0) > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Freight Charges:</span>
                  <span className="font-medium">
                    ₹{parseFloat(invoice.summary?.freightCharges || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}

              {parseFloat(invoice.summary?.packingCharges || 0) > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Packing Charges:</span>
                  <span className="font-medium">
                    ₹{parseFloat(invoice.summary?.packingCharges || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}

              {parseFloat(invoice.summary?.shippingCharges || 0) > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Shipping Charges:</span>
                  <span className="font-medium">
                    ₹{parseFloat(invoice.summary?.shippingCharges || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}

              {parseFloat(invoice.summary?.otherCharges || 0) > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Other Charges:</span>
                  <span className="font-medium">
                    ₹{parseFloat(invoice.summary?.otherCharges || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}

              {parseFloat(invoice.summary?.roundOff || 0) !== 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Round Off:</span>
                  <span className="font-medium">
                    ₹{parseFloat(invoice.summary?.roundOff || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}

              <div className="border-t-2 border-gray-300 pt-2 mt-2">
                <div className="flex justify-between text-lg font-bold">
                  <span>Grand Total:</span>
                  <span className="text-[#F53F7A]">
                    ₹{parseFloat(invoice.summary?.grandTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {invoice.summary?.amountInWords && (
                <div className="mt-3 pt-3 border-t border-gray-200 text-sm">
                  <strong>Amount in Words:</strong>
                  <div className="text-gray-700 italic mt-1">
                    {invoice.summary.amountInWords}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Terms and Conditions / Declaration */}
        {(invoice.optional?.termsAndConditions || invoice.optional?.declaration) && (
          <div className="mt-6 space-y-4 text-sm">
            {invoice.optional?.termsAndConditions && (
              <div>
                <strong className="block mb-2">Terms & Conditions:</strong>
                <p className="text-gray-700 whitespace-pre-line">{invoice.optional.termsAndConditions}</p>
              </div>
            )}
            {invoice.optional?.declaration && (
              <div>
                <strong className="block mb-2">Declaration:</strong>
                <p className="text-gray-700 whitespace-pre-line">{invoice.optional.declaration}</p>
              </div>
            )}
          </div>
        )}

        {/* Signature */}
        {invoice.signature && (
          <div className="mt-8 flex justify-end">
            <div className="text-center">
              {invoice.signature.signatureImage && (
                <div className="mb-2">
                  <img
                    src={invoice.signature.signatureImage}
                    alt="Signature"
                    className="h-16 w-auto"
                  />
                </div>
              )}
              {invoice.signature.authorisedSignatoryName && (
                <div className="font-semibold text-gray-900">
                  {invoice.signature.authorisedSignatoryName}
                </div>
              )}
              {invoice.signature.designation && (
                <div className="text-sm text-gray-600">{invoice.signature.designation}</div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-gray-200 text-center text-xs text-gray-500">
          <p>This is a computer-generated invoice and is valid without signature.</p>
          {invoice.status === 'draft' && (
            <p className="mt-2 text-amber-600 font-semibold">DRAFT - NOT FOR PAYMENT</p>
          )}
        </div>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body {
            background: white;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:shadow-none {
            box-shadow: none !important;
          }
          .print\\:border-none {
            border: none !important;
          }
        }
      `}</style>
    </div>
  );
}

export default function InvoiceViewPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6">
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#F53F7A]"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      }
    >
      <InvoiceViewContent />
    </Suspense>
  );
}

