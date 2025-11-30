"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../../lib/supabase";
import Link from "next/link";

type Invoice = {
  id: string;
  invoice_no: string;
  invoice_date: string;
  seller: any;
  summary: any;
  status: string;
};

export default function VendorStatementReport() {
  const [vendors, setVendors] = useState<string[]>([]);
  const [selectedVendor, setSelectedVendor] = useState<string>("");
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), 0, 1).toISOString().split("T")[0],
    end: new Date().toISOString().split("T")[0],
  });

  useEffect(() => {
    fetchVendors();
  }, []);

  useEffect(() => {
    if (selectedVendor) {
      fetchVendorInvoices();
    }
  }, [selectedVendor, dateRange]);

  const fetchVendors = async () => {
    try {
      const { data, error } = await supabase
        .from("invoices")
        .select("seller")
        .eq("status", "issued")
        .eq("transaction_type", "Purchase");

      if (error) throw error;

      const uniqueVendors = Array.from(
        new Set((data || []).map((inv: any) => inv.seller?.name).filter(Boolean))
      ) as string[];

      setVendors(uniqueVendors.sort());
    } catch (err: any) {
      console.error("Error fetching vendors:", err);
    }
  };

  const fetchVendorInvoices = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .eq("status", "issued")
        .eq("transaction_type", "Purchase")
        .gte("invoice_date", dateRange.start)
        .lte("invoice_date", dateRange.end)
        .order("invoice_date", { ascending: false });

      if (error) throw error;

      const filtered = (data || []).filter(
        (inv: any) => inv.seller?.name === selectedVendor
      ) as Invoice[];

      setInvoices(filtered);
    } catch (err: any) {
      console.error("Error fetching invoices:", err);
    } finally {
      setLoading(false);
    }
  };

  const totalAmount = invoices.reduce((sum, inv) => sum + parseFloat(inv.summary?.grandTotal || 0), 0);
  const vendorInfo = invoices[0]?.seller || {};

  const handleExport = () => {
    const csv = [
      ["Vendor Statement", "", ""],
      ["Vendor Name", vendorInfo.name || selectedVendor, ""],
      ["GSTIN", vendorInfo.gstin || "N/A", ""],
      ["Address", vendorInfo.address || "", ""],
      ["Period", dateRange.start, dateRange.end],
      ["", "", ""],
      ["Invoice No", "Date", "Amount"],
      ...invoices.map((inv) => [
        inv.invoice_no,
        inv.invoice_date,
        parseFloat(inv.summary?.grandTotal || 0).toFixed(2),
      ]),
      ["TOTAL", "", totalAmount.toFixed(2)],
    ];

    const csvContent = csv.map((row) => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vendor-statement-${selectedVendor}-${dateRange.start}-to-${dateRange.end}.csv`;
    a.click();
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Vendor Statement</h2>
          <p className="text-gray-600">Individual vendor account statement</p>
        </div>
        {selectedVendor && (
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-2 bg-[#F53F7A] text-white px-4 py-2 rounded-lg hover:bg-[#F53F7A]/90 transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export CSV
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Select Vendor</label>
          <select
            value={selectedVendor}
            onChange={(e) => setSelectedVendor(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
          >
            <option value="">-- Select Vendor --</option>
            {vendors.map((vendor) => (
              <option key={vendor} value={vendor}>
                {vendor}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
          />
        </div>
      </div>

      {!selectedVendor ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-600">Please select a vendor to view their statement</p>
        </div>
      ) : loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#F53F7A]"></div>
          <p className="mt-4 text-gray-600">Loading statement...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Vendor Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-bold text-gray-900 mb-3">Vendor Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-gray-600">Name:</span> <span className="font-medium">{vendorInfo.name}</span>
              </div>
              {vendorInfo.gstin && (
                <div>
                  <span className="text-gray-600">GSTIN:</span>{" "}
                  <span className="font-mono">{vendorInfo.gstin}</span>
                </div>
              )}
              {vendorInfo.address && (
                <div className="col-span-2">
                  <span className="text-gray-600">Address:</span> <span>{vendorInfo.address}</span>
                </div>
              )}
            </div>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="text-sm text-red-600 font-medium mb-1">Total Invoices</div>
              <div className="text-2xl font-bold text-red-900">{invoices.length}</div>
            </div>
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="text-sm text-orange-600 font-medium mb-1">Total Expense</div>
              <div className="text-2xl font-bold text-orange-900">
                ₹{totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          {/* Invoice List */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Invoice No
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {invoice.invoice_no}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(invoice.invoice_date).toLocaleDateString("en-IN")}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 text-right">
                      ₹{parseFloat(invoice.summary?.grandTotal || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                      <Link
                        href={`/admin/InvoiceManagement/view?id=${invoice.id}`}
                        className="text-blue-600 hover:text-blue-700 underline"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
                {invoices.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                      No invoices found for this vendor in the selected period
                    </td>
                  </tr>
                )}
              </tbody>
              {invoices.length > 0 && (
                <tfoot className="bg-gray-50">
                  <tr>
                    <td colSpan={2} className="px-6 py-4 text-sm font-bold text-gray-900 text-right">
                      TOTAL:
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-[#F53F7A] text-right">
                      ₹{totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

