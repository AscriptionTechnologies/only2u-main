"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "../../../../lib/supabase";

type Invoice = {
  id: string;
  invoice_no: string;
  invoice_date: string;
  transaction_type: string;
  summary: any;
  status: string;
};

export default function ProfitLossReport() {
  const [salesInvoices, setSalesInvoices] = useState<Invoice[]>([]);
  const [purchaseInvoices, setPurchaseInvoices] = useState<Invoice[]>([]);
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
      // Fetch Sales
      const { data: salesData, error: salesError } = await supabase
        .from("invoices")
        .select("*")
        .eq("status", "issued")
        .eq("transaction_type", "Sale")
        .gte("invoice_date", dateRange.start)
        .lte("invoice_date", dateRange.end)
        .order("invoice_date", { ascending: false });

      if (salesError) throw salesError;

      // Fetch Purchases
      const { data: purchaseData, error: purchaseError } = await supabase
        .from("invoices")
        .select("*")
        .eq("status", "issued")
        .eq("transaction_type", "Purchase")
        .gte("invoice_date", dateRange.start)
        .lte("invoice_date", dateRange.end)
        .order("invoice_date", { ascending: false });

      if (purchaseError) throw purchaseError;

      setSalesInvoices((salesData as Invoice[]) || []);
      setPurchaseInvoices((purchaseData as Invoice[]) || []);
    } catch (err: any) {
      console.error("Error fetching invoices:", err);
    } finally {
      setLoading(false);
    }
  };

  const income = useMemo(() => {
    return salesInvoices.reduce((sum, inv) => {
      return sum + parseFloat(inv.summary?.grandTotal || 0);
    }, 0);
  }, [salesInvoices]);

  const expenses = useMemo(() => {
    return purchaseInvoices.reduce((sum, inv) => {
      return sum + parseFloat(inv.summary?.grandTotal || 0);
    }, 0);
  }, [purchaseInvoices]);

  const profit = income - expenses;
  const profitMargin = income > 0 ? (profit / income) * 100 : 0;

  const handleExport = () => {
    const csv = [
      ["Profit & Loss Statement", "", ""],
      ["Period", dateRange.start, dateRange.end],
      ["", "", ""],
      ["INCOME", "", ""],
      ["Sales Revenue", income.toFixed(2), ""],
      ["", "", ""],
      ["EXPENSES", "", ""],
      ["Purchase Expenses", expenses.toFixed(2), ""],
      ["", "", ""],
      ["NET PROFIT/LOSS", profit.toFixed(2), ""],
      ["Profit Margin (%)", profitMargin.toFixed(2) + "%", ""],
    ];

    const csvContent = csv.map((row) => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `profit-loss-${dateRange.start}-to-${dateRange.end}.csv`;
    a.click();
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Profit & Loss Report</h2>
          <p className="text-gray-600">Income and expense analysis</p>
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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="text-sm text-green-600 font-medium mb-1">Total Income</div>
          <div className="text-2xl font-bold text-green-900">
            ₹{income.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-sm text-red-600 font-medium mb-1">Total Expenses</div>
          <div className="text-2xl font-bold text-red-900">
            ₹{expenses.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
        </div>
        <div className={`border rounded-lg p-4 ${profit >= 0 ? "bg-blue-50 border-blue-200" : "bg-orange-50 border-orange-200"}`}>
          <div className={`text-sm font-medium mb-1 ${profit >= 0 ? "text-blue-600" : "text-orange-600"}`}>
            Net Profit/Loss
          </div>
          <div className={`text-2xl font-bold ${profit >= 0 ? "text-blue-900" : "text-orange-900"}`}>
            ₹{profit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="text-sm text-purple-600 font-medium mb-1">Profit Margin</div>
          <div className="text-2xl font-bold text-purple-900">{profitMargin.toFixed(2)}%</div>
        </div>
      </div>

      {/* P&L Statement */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#F53F7A]"></div>
          <p className="mt-4 text-gray-600">Loading report...</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Profit & Loss Statement</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center py-3 border-b border-gray-200">
              <span className="font-semibold text-gray-900">INCOME</span>
              <span className="text-gray-600">₹{income.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="pl-4">
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-700">Sales Revenue</span>
                <span className="text-gray-900 font-medium">
                  ₹{income.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-t border-gray-200">
              <span className="font-semibold text-gray-900">EXPENSES</span>
              <span className="text-gray-600">₹{expenses.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="pl-4">
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-700">Purchase Expenses</span>
                <span className="text-gray-900 font-medium">
                  ₹{expenses.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
            <div className="flex justify-between items-center py-4 border-t-2 border-gray-300 mt-4">
              <span className="text-lg font-bold text-gray-900">NET PROFIT/LOSS</span>
              <span className={`text-lg font-bold ${profit >= 0 ? "text-green-600" : "text-red-600"}`}>
                ₹{profit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

