"use client";

import { useState } from "react";
import RevenueReport from "./components/RevenueReport";
import TaxSummaryReport from "./components/TaxSummaryReport";
import ProfitLossReport from "./components/ProfitLossReport";
import SalesTrendReport from "./components/SalesTrendReport";
import CustomerAnalysisReport from "./components/CustomerAnalysisReport";
import VendorAnalysisReport from "./components/VendorAnalysisReport";
import CustomerStatementReport from "./components/CustomerStatementReport";
import VendorStatementReport from "./components/VendorStatementReport";
import HSNWiseReport from "./components/HSNWiseReport";

type ReportType =
  | "revenue"
  | "tax-summary"
  | "profit-loss"
  | "sales-trend"
  | "customer-analysis"
  | "vendor-analysis"
  | "customer-statement"
  | "vendor-statement"
  | "hsn-wise";

export default function AccountingReportsPage() {
  const [activeReport, setActiveReport] = useState<ReportType>("revenue");

  const reports = [
    {
      id: "revenue" as ReportType,
      name: "Revenue Report",
      icon: "💰",
      description: "Revenue analysis by period, type, and customer",
    },
    {
      id: "tax-summary" as ReportType,
      name: "Tax Summary",
      icon: "📊",
      description: "GST liability and tax breakdown",
    },
    {
      id: "profit-loss" as ReportType,
      name: "Profit & Loss",
      icon: "📈",
      description: "Income and expense analysis",
    },
    {
      id: "sales-trend" as ReportType,
      name: "Sales Trend",
      icon: "📉",
      description: "Sales trends over time",
    },
    {
      id: "customer-analysis" as ReportType,
      name: "Customer Analysis",
      icon: "👥",
      description: "Customer-wise revenue and performance",
    },
    {
      id: "vendor-analysis" as ReportType,
      name: "Vendor Analysis",
      icon: "🏪",
      description: "Vendor-wise purchase and expense analysis",
    },
    {
      id: "customer-statement" as ReportType,
      name: "Customer Statement",
      icon: "📄",
      description: "Individual customer account statement",
    },
    {
      id: "vendor-statement" as ReportType,
      name: "Vendor Statement",
      icon: "📋",
      description: "Individual vendor account statement",
    },
    {
      id: "hsn-wise" as ReportType,
      name: "HSN-wise Sales",
      icon: "🏷️",
      description: "Sales analysis by HSN code",
    },
  ];

  const renderReport = () => {
    switch (activeReport) {
      case "revenue":
        return <RevenueReport />;
      case "tax-summary":
        return <TaxSummaryReport />;
      case "profit-loss":
        return <ProfitLossReport />;
      case "sales-trend":
        return <SalesTrendReport />;
      case "customer-analysis":
        return <CustomerAnalysisReport />;
      case "vendor-analysis":
        return <VendorAnalysisReport />;
      case "customer-statement":
        return <CustomerStatementReport />;
      case "vendor-statement":
        return <VendorStatementReport />;
      case "hsn-wise":
        return <HSNWiseReport />;
      default:
        return <RevenueReport />;
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Accounting Reports</h1>
        <p className="text-gray-600">
          Comprehensive analytical and individual reports for accounting and financial analysis
        </p>
      </div>

      {/* Report Tabs */}
      <div className="mb-6">
        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {reports.map((report) => (
            <button
              key={report.id}
              onClick={() => setActiveReport(report.id)}
              className={`p-4 rounded-lg border-2 transition-all text-left ${
                activeReport === report.id
                  ? "border-[#F53F7A] bg-[#F53F7A]/5"
                  : "border-gray-200 hover:border-gray-300 bg-white"
              }`}
            >
              <div className="text-2xl mb-2">{report.icon}</div>
              <div className="font-semibold text-sm text-gray-900 mb-1">{report.name}</div>
              <div className="text-xs text-gray-500 line-clamp-2">{report.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Active Report Content */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        {renderReport()}
      </div>
    </div>
  );
}

