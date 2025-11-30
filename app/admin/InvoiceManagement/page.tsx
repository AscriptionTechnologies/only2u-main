"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "../../../lib/supabase";
import { exportInvoicesForGST, exportHSNSummary } from "./invoiceExportUtils";
import type { InvoiceType, SupplyType, TransactionType } from "../../../lib/invoiceUtils";

type Invoice = {
  id: string;
  invoice_no: string;
  invoice_date: string;
  invoice_type: InvoiceType;
  supply_type: SupplyType;
  transaction_type: TransactionType;
  place_of_supply: string;
  status: string;
  seller: any;
  buyer: any;
  summary: any;
  created_at: string;
  order_id?: string | null;
};

export default function InvoiceManagementPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("invoices")
      .select("*")
      .order("invoice_date", { ascending: false });

    if (error) {
      console.error("Error fetching invoices:", error);
    } else {
      setInvoices((data as Invoice[]) || []);
    }
    setLoading(false);
  };

  const filteredInvoices = useMemo(() => {
    return invoices.filter((invoice) => {
      const searchMatch =
        invoice.invoice_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (invoice.seller?.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (invoice.buyer?.name || "").toLowerCase().includes(searchTerm.toLowerCase());

      if (!searchMatch) return false;

      if (typeFilter !== "all" && invoice.invoice_type !== typeFilter) return false;
      if (statusFilter !== "all" && invoice.status !== statusFilter) return false;

      if (dateRange.start && invoice.invoice_date < dateRange.start) return false;
      if (dateRange.end && invoice.invoice_date > dateRange.end) return false;

      return true;
    });
  }, [invoices, searchTerm, typeFilter, statusFilter, dateRange]);

  const summaryCards = useMemo(() => {
    const total = invoices.length;
    const issued = invoices.filter((i) => i.status === "issued").length;
    const totalRevenue = invoices
      .filter((i) => i.status === "issued")
      .reduce((sum, i) => sum + parseFloat(i.summary?.grandTotal || 0), 0);
    const totalTax = invoices
      .filter((i) => i.status === "issued")
      .reduce(
        (sum, i) =>
          sum +
          parseFloat(i.summary?.totalCGST || 0) +
          parseFloat(i.summary?.totalSGST || 0) +
          parseFloat(i.summary?.totalIGST || 0),
        0
      );

    return [
      {
        title: "Total Invoices",
        value: total,
        color: "text-blue-700",
        bg: "bg-blue-100",
      },
      {
        title: "Issued Invoices",
        value: issued,
        color: "text-green-700",
        bg: "bg-green-100",
      },
      {
        title: "Total Revenue",
        value: `₹${totalRevenue.toLocaleString()}`,
        color: "text-[#F53F7A]",
        bg: "bg-[#F53F7A]/10",
      },
      {
        title: "Total Tax Collected",
        value: `₹${totalTax.toLocaleString()}`,
        color: "text-purple-700",
        bg: "bg-purple-100",
      },
    ];
  }, [invoices]);

  const handleExportGST = () => {
    exportInvoicesForGST(filteredInvoices);
  };

  const handleExportHSN = async () => {
    const { data } = await supabase.from("invoice_hsn_summary").select("*");
    if (data) {
      exportHSNSummary(data);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Invoice Management</h1>
          <p className="text-sm text-gray-500">
            Manage invoices and generate reports for GST filing
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportHSN}
            className="inline-flex items-center gap-2 border border-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export HSN Summary
          </button>
          <button
            onClick={handleExportGST}
            className="inline-flex items-center gap-2 bg-[#F53F7A] text-white px-4 py-2 rounded-lg hover:bg-[#F53F7A]/90 transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export for GST Filing
          </button>
          <a
            href="/admin/InvoiceManagement/create"
            className="inline-flex items-center gap-2 bg-[#F53F7A] text-white px-4 py-2 rounded-lg hover:bg-[#F53F7A]/90 transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            Create Invoice
          </a>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <div
            key={card.title}
            className="bg-white border border-gray-100 rounded-xl shadow-sm p-4 flex flex-col gap-2"
          >
            <span className="text-sm font-medium text-gray-500">{card.title}</span>
            <span className={`text-2xl font-bold ${card.color}`}>{card.value}</span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-4 space-y-4">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <input
              type="text"
              placeholder="Search by invoice number, seller, or buyer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#F53F7A]"
            />
          </div>
          <div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#F53F7A]"
            >
              <option value="all">All Types</option>
              <option value="B2B">B2B</option>
              <option value="B2C">B2C</option>
              <option value="Vendor">Vendor</option>
              <option value="Influencer">Influencer</option>
            </select>
          </div>
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#F53F7A]"
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="issued">Issued</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div className="flex gap-2">
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              placeholder="Start Date"
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F53F7A]"
            />
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              placeholder="End Date"
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F53F7A]"
            />
          </div>
        </div>
        <div className="flex justify-end">
          <button
            onClick={() => {
              setSearchTerm("");
              setTypeFilter("all");
              setStatusFilter("all");
              setDateRange({ start: "", end: "" });
            }}
            className="text-sm text-gray-600 hover:text-gray-800"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Invoice No
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Buyer
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Supply Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Tax
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-6 py-10 text-center text-gray-400">
                    Loading invoices…
                  </td>
                </tr>
              ) : filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-10 text-center text-gray-400">
                    No invoices found.
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-semibold text-gray-900 font-mono">
                        {invoice.invoice_no}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(invoice.invoice_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-700">
                        {invoice.invoice_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-900">
                          {invoice.buyer?.name || "—"}
                        </span>
                        {invoice.buyer?.gstin && (
                          <span className="text-xs text-gray-500 font-mono">
                            {invoice.buyer.gstin}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          invoice.supply_type === "IntraState"
                            ? "bg-green-100 text-green-700"
                            : "bg-purple-100 text-purple-700"
                        }`}
                      >
                        {invoice.supply_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                      ₹{parseFloat(invoice.summary?.grandTotal || 0).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {invoice.supply_type === "IntraState" ? (
                        <>
                          CGST: ₹{parseFloat(invoice.summary?.totalCGST || 0).toLocaleString()}
                          <br />
                          SGST: ₹{parseFloat(invoice.summary?.totalSGST || 0).toLocaleString()}
                        </>
                      ) : (
                        <>IGST: ₹{parseFloat(invoice.summary?.totalIGST || 0).toLocaleString()}</>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          invoice.status === "issued"
                            ? "bg-green-100 text-green-700"
                            : invoice.status === "draft"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-red-100 text-red-600"
                        }`}
                      >
                        {invoice.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                      <Link
                        href={`/admin/InvoiceManagement/view?id=${invoice.id}`}
                        className="text-blue-600 hover:text-blue-700 underline"
                      >
                        View
                      </Link>
                      <Link
                        href={`/admin/InvoiceManagement/edit?id=${invoice.id}`}
                        className="text-[#F53F7A] hover:text-[#F53F7A]/80 underline ml-4"
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

