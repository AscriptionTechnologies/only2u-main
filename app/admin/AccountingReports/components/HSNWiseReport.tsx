"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "../../../../lib/supabase";

type InvoiceItem = {
  id: string;
  invoice_id: string;
  hsn_code: string;
  description: string;
  quantity: number;
  rate: number;
  taxable_value: number;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  total: number;
};

export default function HSNWiseReport() {
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), 0, 1).toISOString().split("T")[0],
    end: new Date().toISOString().split("T")[0],
  });

  useEffect(() => {
    fetchItems();
  }, [dateRange]);

  const fetchItems = async () => {
    setLoading(true);
    try {
      // Get invoices in date range
      const { data: invoices, error: invoiceError } = await supabase
        .from("invoices")
        .select("id")
        .eq("status", "issued")
        .eq("transaction_type", "Sale")
        .gte("invoice_date", dateRange.start)
        .lte("invoice_date", dateRange.end);

      if (invoiceError) throw invoiceError;

      const invoiceIds = (invoices || []).map((inv) => inv.id);

      if (invoiceIds.length === 0) {
        setItems([]);
        setLoading(false);
        return;
      }

      // Get items for these invoices
      const { data: itemsData, error: itemsError } = await supabase
        .from("invoice_items")
        .select("*")
        .in("invoice_id", invoiceIds);

      if (itemsError) throw itemsError;

      setItems((itemsData as InvoiceItem[]) || []);
    } catch (err: any) {
      console.error("Error fetching items:", err);
    } finally {
      setLoading(false);
    }
  };

  const hsnData = useMemo(() => {
    if (!items.length) return [];

    const grouped: Record<string, any> = {};

    items.forEach((item) => {
      const hsn = item.hsn_code;

      if (!grouped[hsn]) {
        grouped[hsn] = {
          hsnCode: hsn,
          description: item.description,
          quantity: 0,
          taxableValue: 0,
          cgst: 0,
          sgst: 0,
          igst: 0,
          total: 0,
          invoiceCount: new Set(),
        };
      }

      grouped[hsn].quantity += item.quantity;
      grouped[hsn].taxableValue += parseFloat(item.taxable_value.toString());
      grouped[hsn].cgst += parseFloat(item.cgst_amount.toString());
      grouped[hsn].sgst += parseFloat(item.sgst_amount.toString());
      grouped[hsn].igst += parseFloat(item.igst_amount.toString());
      grouped[hsn].total += parseFloat(item.total.toString());
      grouped[hsn].invoiceCount.add(item.invoice_id);
    });

    return Object.values(grouped)
      .map((item: any) => ({
        ...item,
        invoiceCount: item.invoiceCount.size,
      }))
      .sort((a: any, b: any) => b.total - a.total);
  }, [items]);

  const totals = useMemo(() => {
    return hsnData.reduce(
      (acc: any, item: any) => ({
        quantity: acc.quantity + item.quantity,
        taxableValue: acc.taxableValue + item.taxableValue,
        cgst: acc.cgst + item.cgst,
        sgst: acc.sgst + item.sgst,
        igst: acc.igst + item.igst,
        total: acc.total + item.total,
      }),
      { quantity: 0, taxableValue: 0, cgst: 0, sgst: 0, igst: 0, total: 0 }
    );
  }, [hsnData]);

  const handleExport = () => {
    const csv = [
      ["HSN Code", "Description", "Quantity", "Taxable Value", "CGST", "SGST", "IGST", "Total", "Invoice Count"],
      ...hsnData.map((item: any) => [
        item.hsnCode,
        item.description,
        item.quantity.toFixed(2),
        item.taxableValue.toFixed(2),
        item.cgst.toFixed(2),
        item.sgst.toFixed(2),
        item.igst.toFixed(2),
        item.total.toFixed(2),
        item.invoiceCount,
      ]),
      [
        "TOTAL",
        "",
        totals.quantity.toFixed(2),
        totals.taxableValue.toFixed(2),
        totals.cgst.toFixed(2),
        totals.sgst.toFixed(2),
        totals.igst.toFixed(2),
        totals.total.toFixed(2),
        "",
      ],
    ];

    const csvContent = csv.map((row) => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `hsn-wise-sales-${dateRange.start}-to-${dateRange.end}.csv`;
    a.click();
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">HSN-wise Sales Report</h2>
          <p className="text-gray-600">Sales analysis by HSN code</p>
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="text-sm text-blue-600 font-medium mb-1">Total HSN Codes</div>
          <div className="text-2xl font-bold text-blue-900">{hsnData.length}</div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="text-sm text-green-600 font-medium mb-1">Total Quantity</div>
          <div className="text-2xl font-bold text-green-900">{totals.quantity.toFixed(2)}</div>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="text-sm text-purple-600 font-medium mb-1">Taxable Value</div>
          <div className="text-2xl font-bold text-purple-900">
            ₹{totals.taxableValue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="text-sm text-orange-600 font-medium mb-1">Total Sales</div>
          <div className="text-2xl font-bold text-orange-900">
            ₹{totals.total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
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
                  HSN Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantity
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
                  Total
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Invoice Count
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {hsnData.map((item: any, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono font-medium text-gray-900">
                    {item.hsnCode}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{item.description}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                    {item.quantity.toFixed(2)}
                  </td>
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
                    ₹{item.total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                    {item.invoiceCount}
                  </td>
                </tr>
              ))}
              {hsnData.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center text-gray-500">
                    No data found for the selected period
                  </td>
                </tr>
              )}
            </tbody>
            {hsnData.length > 0 && (
              <tfoot className="bg-gray-50">
                <tr>
                  <td colSpan={2} className="px-6 py-4 text-sm font-bold text-gray-900 text-right">
                    TOTAL
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-gray-900 text-right">
                    {totals.quantity.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-gray-900 text-right">
                    ₹{totals.taxableValue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-gray-900 text-right">
                    ₹{totals.cgst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-gray-900 text-right">
                    ₹{totals.sgst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-gray-900 text-right">
                    ₹{totals.igst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-[#F53F7A] text-right">
                    ₹{totals.total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}
    </div>
  );
}

