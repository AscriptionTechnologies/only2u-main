"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "../../../../lib/supabase";

type Invoice = {
  id: string;
  invoice_no: string;
  invoice_date: string;
  summary: any;
  status: string;
};

export default function SalesTrendReport() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), 0, 1).toISOString().split("T")[0],
    end: new Date().toISOString().split("T")[0],
  });
  const [groupBy, setGroupBy] = useState<"day" | "week" | "month">("month");

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
        .order("invoice_date", { ascending: true });

      if (error) throw error;
      setInvoices((data as Invoice[]) || []);
    } catch (err: any) {
      console.error("Error fetching invoices:", err);
    } finally {
      setLoading(false);
    }
  };

  const trendData = useMemo(() => {
    if (!invoices.length) return [];

    const grouped: Record<string, { date: string; revenue: number; count: number }> = {};

    invoices.forEach((invoice) => {
      const date = new Date(invoice.invoice_date);
      let key = "";

      if (groupBy === "day") {
        key = date.toISOString().split("T")[0];
      } else if (groupBy === "week") {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toISOString().split("T")[0];
      } else if (groupBy === "month") {
        const month = date.getMonth() + 1;
        key = `${date.getFullYear()}-${month < 10 ? '0' : ''}${month}`;
      }

      if (!grouped[key]) {
        grouped[key] = { date: key, revenue: 0, count: 0 };
      }

      grouped[key].revenue += parseFloat(invoice.summary?.grandTotal || 0);
      grouped[key].count += 1;
    });

    return Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date));
  }, [invoices, groupBy]);

  const maxRevenue = Math.max(...trendData.map((d) => d.revenue), 1);

  const handleExport = () => {
    const csv = [
      ["Period", "Invoice Count", "Revenue"],
      ...trendData.map((item) => [item.date, item.count, item.revenue.toFixed(2)]),
    ];

    const csvContent = csv.map((row) => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sales-trend-${dateRange.start}-to-${dateRange.end}.csv`;
    a.click();
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Sales Trend Report</h2>
          <p className="text-gray-600">Sales trends over time</p>
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
      <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
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
          <label className="block text-sm font-medium text-gray-700 mb-1">Group By</label>
          <select
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value as any)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
          >
            <option value="day">Day</option>
            <option value="week">Week</option>
            <option value="month">Month</option>
          </select>
        </div>
      </div>

      {/* Chart Visualization */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#F53F7A]"></div>
          <p className="mt-4 text-gray-600">Loading report...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Bar Chart */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Revenue Trend</h3>
            <div className="space-y-4">
              {trendData.map((item, index) => (
                <div key={index} className="flex items-center gap-4">
                  <div className="w-32 text-sm text-gray-600">{item.date}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <div
                        className="bg-[#F53F7A] h-8 rounded flex items-center justify-end pr-2"
                        style={{ width: `${(item.revenue / maxRevenue) * 100}%` }}
                      >
                        <span className="text-white text-xs font-medium">
                          ₹{item.revenue.toLocaleString("en-IN", { minimumFractionDigits: 0 })}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="w-24 text-sm text-gray-600 text-right">{item.count} invoices</div>
                </div>
              ))}
            </div>
          </div>

          {/* Data Table */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Period
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Invoice Count
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Revenue
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {trendData.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.date}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{item.count}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 text-right">
                      ₹{item.revenue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

