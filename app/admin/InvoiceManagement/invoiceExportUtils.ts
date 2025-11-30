"use client";

import { exportToExcel } from "../../../lib/exportUtils";

type Invoice = {
  id: string;
  invoice_no: string;
  invoice_date: string;
  invoice_type: string;
  supply_type: string;
  transaction_type: string;
  place_of_supply: string;
  status: string;
  seller: any;
  buyer: any;
  summary: any;
  created_at: string;
};

type HSNSummary = {
  hsn_code: string;
  supply_type: string;
  total_quantity: number;
  total_taxable_value: number;
  total_cgst: number;
  total_sgst: number;
  total_igst: number;
  avg_cgst_rate: number;
  avg_sgst_rate: number;
  avg_igst_rate: number;
  invoice_count: number;
};

export const exportInvoicesForGST = async (invoices: Invoice[]) => {
  if (!invoices || invoices.length === 0) {
    throw new Error("No invoices available to export.");
  }

  const issuedInvoices = invoices.filter((inv) => inv.status === "issued");
  const totalRevenue = issuedInvoices.reduce(
    (sum, inv) => sum + parseFloat(inv.summary?.grandTotal || 0),
    0
  );
  const totalTax = issuedInvoices.reduce(
    (sum, inv) =>
      sum +
      parseFloat(inv.summary?.totalCGST || 0) +
      parseFloat(inv.summary?.totalSGST || 0) +
      parseFloat(inv.summary?.totalIGST || 0),
    0
  );

  const summary = [
    ["GST Invoice Export Summary", ""],
    ["Export Date", new Date().toLocaleString()],
    ["Total Invoices", invoices.length],
    ["Issued Invoices", issuedInvoices.length],
    ["Total Revenue", `₹${totalRevenue.toLocaleString()}`],
    ["Total Tax Collected", `₹${totalTax.toLocaleString()}`],
    ["", ""],
  ];

  const rows = issuedInvoices.map((invoice, index) => ({
    "S.No": index + 1,
    "Invoice No": invoice.invoice_no,
    "Invoice Date": new Date(invoice.invoice_date).toLocaleDateString(),
    "Invoice Type": invoice.invoice_type,
    "Supply Type": invoice.supply_type,
    "Transaction Type": invoice.transaction_type,
    "Place of Supply": invoice.place_of_supply,
    "Seller Name": invoice.seller?.name || "",
    "Seller GSTIN": invoice.seller?.gstin || "",
    "Buyer Name": invoice.buyer?.name || "",
    "Buyer GSTIN": invoice.buyer?.gstin || "",
    "Buyer State Code": invoice.buyer?.stateCode || "",
    "Total Taxable Value": parseFloat(invoice.summary?.totalTaxableValue || 0),
    "CGST Amount": parseFloat(invoice.summary?.totalCGST || 0),
    "SGST Amount": parseFloat(invoice.summary?.totalSGST || 0),
    "IGST Amount": parseFloat(invoice.summary?.totalIGST || 0),
    "Grand Total": parseFloat(invoice.summary?.grandTotal || 0),
    "Status": invoice.status,
  }));

  await exportToExcel({
    filename: `gst-invoices-${new Date().toISOString().split("T")[0]}`,
    summary,
    sheets: [
      {
        name: "GST Invoices",
        data: rows,
      },
    ],
  });
};

export const exportHSNSummary = async (hsnData: HSNSummary[]) => {
  if (!hsnData || hsnData.length === 0) {
    throw new Error("No HSN summary data available to export.");
  }

  const totalTaxable = hsnData.reduce((sum, item) => sum + (item.total_taxable_value || 0), 0);
  const totalCGST = hsnData.reduce((sum, item) => sum + (item.total_cgst || 0), 0);
  const totalSGST = hsnData.reduce((sum, item) => sum + (item.total_sgst || 0), 0);
  const totalIGST = hsnData.reduce((sum, item) => sum + (item.total_igst || 0), 0);

  const summary = [
    ["HSN Summary for GST Filing", ""],
    ["Export Date", new Date().toLocaleString()],
    ["Total HSN Codes", hsnData.length],
    ["Total Taxable Value", `₹${totalTaxable.toLocaleString()}`],
    ["Total CGST", `₹${totalCGST.toLocaleString()}`],
    ["Total SGST", `₹${totalSGST.toLocaleString()}`],
    ["Total IGST", `₹${totalIGST.toLocaleString()}`],
    ["", ""],
  ];

  const rows = hsnData.map((item, index) => ({
    "S.No": index + 1,
    "HSN Code": item.hsn_code,
    "Supply Type": item.supply_type,
    "Total Quantity": item.total_quantity || 0,
    "Total Taxable Value": item.total_taxable_value || 0,
    "Total CGST": item.total_cgst || 0,
    "Total SGST": item.total_sgst || 0,
    "Total IGST": item.total_igst || 0,
    "Avg CGST Rate": item.avg_cgst_rate ? `${item.avg_cgst_rate.toFixed(2)}%` : "0%",
    "Avg SGST Rate": item.avg_sgst_rate ? `${item.avg_sgst_rate.toFixed(2)}%` : "0%",
    "Avg IGST Rate": item.avg_igst_rate ? `${item.avg_igst_rate.toFixed(2)}%` : "0%",
    "Invoice Count": item.invoice_count || 0,
  }));

  await exportToExcel({
    filename: `hsn-summary-${new Date().toISOString().split("T")[0]}`,
    summary,
    sheets: [
      {
        name: "HSN Summary",
        data: rows,
      },
    ],
  });
};

