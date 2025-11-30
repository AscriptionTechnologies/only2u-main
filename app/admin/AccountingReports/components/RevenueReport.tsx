"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "../../../../lib/supabase";

type Invoice = {
  id: string;
  invoice_no: string;
  invoice_date: string;
  invoice_type: string;
  transaction_type: string;
  buyer: any;
  seller: any;
  summary: any;
  status: string;
};

export default function RevenueReport() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0],
    end: new Date().toISOString().split("T")[0],
  });
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [groupBy, setGroupBy] = useState<"day" | "week" | "month" | "customer" | "type">("month");

  useEffect(() => {
    fetchInvoices();
  }, [dateRange]);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("invoices")
        .select("*")
        .eq("status", "issued")
        .eq("transaction_type", "Sale")
        .gte("invoice_date", dateRange.start)
        .lte("invoice_date", dateRange.end)
        .order("invoice_date", { ascending: false });

      if (typeFilter !== "all") {
        query = query.eq("invoice_type", typeFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setInvoices((data as Invoice[]) || []);
    } catch (err: any) {
      console.error("Error fetching invoices:", err);
    } finally {
      setLoading(false);
    }
  };

  const reportData = useMemo(() => {
    if (!invoices.length) return [];

    const data: any[] = [];
    const grouped: Record<string, any> = {};

    invoices.forEach((invoice) => {
      const date = new Date(invoice.invoice_date);
      let key = "";

      if (groupBy === "day") {
        key = date.toISOString().split("T")[0];
      } else if (groupBy === "week") {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = `Week ${weekStart.toISOString().split("T")[0]}`;
      } else if (groupBy === "month") {
        const month = date.getMonth() + 1;
        key = `${date.getFullYear()}-${month < 10 ? '0' : ''}${month}`;
      } else if (groupBy === "customer") {
        key = invoice.buyer?.name || "Unknown";
      } else if (groupBy === "type") {
        key = invoice.invoice_type;
      }

      if (!grouped[key]) {
        grouped[key] = {
          key,
          count: 0,
          revenue: 0,
          taxableValue: 0,
          cgst: 0,
          sgst: 0,
          igst: 0,
        };
      }

      const summary = invoice.summary || {};
      grouped[key].count += 1;
      grouped[key].revenue += parseFloat(summary.grandTotal || 0);
      grouped[key].taxableValue += parseFloat(summary.totalTaxableValue || 0);
      grouped[key].cgst += parseFloat(summary.totalCGST || 0);
      grouped[key].sgst += parseFloat(summary.totalSGST || 0);
      grouped[key].igst += parseFloat(summary.totalIGST || 0);
    });

    return Object.values(grouped).sort((a, b) => {
      if (groupBy === "month" || groupBy === "day") {
        return a.key.localeCompare(b.key);
      }
      return b.revenue - a.revenue;
    });
  }, [invoices, groupBy]);

  const totals = useMemo(() => {
    return reportData.reduce(
      (acc, item) => ({
        count: acc.count + item.count,
        revenue: acc.revenue + item.revenue,
        taxableValue: acc.taxableValue + item.taxableValue,
        cgst: acc.cgst + item.cgst,
        sgst: acc.sgst + item.sgst,
        igst: acc.igst + item.igst,
      }),
      { count: 0, revenue: 0, taxableValue: 0, cgst: 0, sgst: 0, igst: 0 }
    );
  }, [reportData]);

  const handleExport = () => {
    const csv = [
      ["Period/Customer/Type", "Invoice Count", "Taxable Value", "CGST", "SGST", "IGST", "Total Revenue"],
      ...reportData.map((item) => [
        item.key,
        item.count,
        item.taxableValue.toFixed(2),
        item.cgst.toFixed(2),
        item.sgst.toFixed(2),
        item.igst.toFixed(2),
        item.revenue.toFixed(2),
      ]),
      [
        "TOTAL",
        totals.count,
        totals.taxableValue.toFixed(2),
        totals.cgst.toFixed(2),
        totals.sgst.toFixed(2),
        totals.igst.toFixed(2),
        totals.revenue.toFixed(2),
      ],
    ];

    const csvContent = csv.map((row) => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `revenue-report-${dateRange.start}-to-${dateRange.end}.csv`;
    a.click();
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Revenue Report</h2>
          <p className="text-gray-600">Revenue analysis by period, customer, or invoice type</p>
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
      <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
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
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Type</label>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
          >
            <option value="all">All Types</option>
            <option value="B2B">B2B</option>
            <option value="B2C">B2C</option>
            <option value="Influencer">Influencer</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Group By</label>
          <select
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value as any)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
          >
            <option value="day">Day</option>
            <option value="week">Week</option>
            <option value="month">Month</option>
            <option value="customer">Customer</option>
            <option value="type">Invoice Type</option>
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="text-sm text-blue-600 font-medium mb-1">Total Invoices</div>
          <div className="text-2xl font-bold text-blue-900">{totals.count}</div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="text-sm text-green-600 font-medium mb-1">Total Revenue</div>
          <div className="text-2xl font-bold text-green-900">
            ₹{totals.revenue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="text-sm text-purple-600 font-medium mb-1">Taxable Value</div>
          <div className="text-2xl font-bold text-purple-900">
            ₹{totals.taxableValue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="text-sm text-orange-600 font-medium mb-1">Total Tax</div>
          <div className="text-2xl font-bold text-orange-900">
            ₹{(totals.cgst + totals.sgst + totals.igst).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
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
                  {groupBy === "day" || groupBy === "week" || groupBy === "month"
                    ? "Period"
                    : groupBy === "customer"
                    ? "Customer"
                    : "Invoice Type"}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Invoice Count
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Taxable Value
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  CGST
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  SGST
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  IGST
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Revenue
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {reportData.map((item, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.key}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{item.count}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                    ₹{item.taxableValue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                    ₹{item.cgst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                    ₹{item.sgst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                    ₹{item.igst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 text-right">
                    ₹{item.revenue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
              <tr className="bg-gray-50 font-semibold">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">TOTAL</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{totals.count}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                  ₹{totals.taxableValue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                  ₹{totals.cgst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                  ₹{totals.sgst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                  ₹{totals.igst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-[#F53F7A] text-right">
                  ₹{totals.revenue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

