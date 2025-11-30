"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "../../../../lib/supabase";

type Invoice = {
  id: string;
  invoice_no: string;
  invoice_date: string;
  buyer: any;
  summary: any;
  status: string;
};

export default function CustomerAnalysisReport() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), 0, 1).toISOString().split("T")[0],
    end: new Date().toISOString().split("T")[0],
  });

  useEffect(() => {
    fetchInvoices();
  }, [dateRange]);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .eq("status", "issued")
        .eq("transaction_type", "Sale")
        .gte("invoice_date", dateRange.start)
        .lte("invoice_date", dateRange.end)
        .order("invoice_date", { ascending: false });

      if (error) throw error;
      setInvoices((data as Invoice[]) || []);
    } catch (err: any) {
      console.error("Error fetching invoices:", err);
    } finally {
      setLoading(false);
    }
  };

  const customerData = useMemo(() => {
    if (!invoices.length) return [];

    const grouped: Record<string, any> = {};

    invoices.forEach((invoice) => {
      const customerName = invoice.buyer?.name || "Unknown";
      const customerGSTIN = invoice.buyer?.gstin || "N/A";

      if (!grouped[customerName]) {
        grouped[customerName] = {
          name: customerName,
          gstin: customerGSTIN,
          count: 0,
          revenue: 0,
          taxableValue: 0,
          avgOrderValue: 0,
          lastOrderDate: invoice.invoice_date,
        };
      }

      grouped[customerName].count += 1;
      grouped[customerName].revenue += parseFloat(invoice.summary?.grandTotal || 0);
      grouped[customerName].taxableValue += parseFloat(invoice.summary?.totalTaxableValue || 0);
      if (invoice.invoice_date > grouped[customerName].lastOrderDate) {
        grouped[customerName].lastOrderDate = invoice.invoice_date;
      }
    });

    // Calculate average order value
    Object.values(grouped).forEach((customer: any) => {
      customer.avgOrderValue = customer.revenue / customer.count;
    });

    return Object.values(grouped).sort((a: any, b: any) => b.revenue - a.revenue);
  }, [invoices]);

  const handleExport = () => {
    const csv = [
      ["Customer Name", "GSTIN", "Invoice Count", "Total Revenue", "Taxable Value", "Avg Order Value", "Last Order Date"],
      ...customerData.map((item: any) => [
        item.name,
        item.gstin,
        item.count,
        item.revenue.toFixed(2),
        item.taxableValue.toFixed(2),
        item.avgOrderValue.toFixed(2),
        item.lastOrderDate,
      ]),
    ];

    const csvContent = csv.map((row) => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `customer-analysis-${dateRange.start}-to-${dateRange.end}.csv`;
    a.click();
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Customer Analysis Report</h2>
          <p className="text-gray-600">Customer-wise revenue and performance analysis</p>
        </div>
        <button
          onClick={handleExport}
          className="inline-flex items-center gap-2 bg-[#F53F7A] text-white px-4 py-2 rounded-lg hover:bg-[#F53F7A]/90 transition"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
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

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="text-sm text-blue-600 font-medium mb-1">Total Customers</div>
          <div className="text-2xl font-bold text-blue-900">{customerData.length}</div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="text-sm text-green-600 font-medium mb-1">Total Revenue</div>
          <div className="text-2xl font-bold text-green-900">
            ₹{customerData.reduce((sum: number, c: any) => sum + c.revenue, 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="text-sm text-purple-600 font-medium mb-1">Total Invoices</div>
          <div className="text-2xl font-bold text-purple-900">
            {customerData.reduce((sum: number, c: any) => sum + c.count, 0)}
          </div>
        </div>
      </div>

      {/* Report Table */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#F53F7A]"></div>
          <p className="mt-4 text-gray-600">Loading report...</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  GSTIN
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Invoice Count
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Revenue
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Taxable Value
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Avg Order Value
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Order Date
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {customerData.map((customer: any, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{customer.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">{customer.gstin}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{customer.count}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 text-right">
                    ₹{customer.revenue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                    ₹{customer.taxableValue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                    ₹{customer.avgOrderValue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(customer.lastOrderDate).toLocaleDateString("en-IN")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

