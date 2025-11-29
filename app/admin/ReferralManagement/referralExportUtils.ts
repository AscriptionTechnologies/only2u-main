"use client";

import { exportToExcel } from "../../../lib/exportUtils";

type ReferralCodeAnalytics = {
  id: string;
  code: string;
  description?: string | null;
  max_uses?: number | null;
  usage_count: number;
  is_active: boolean;
  created_at: string;
  expires_at?: string | null;
  created_by?: string | null;
  metadata?: any;
  total_signups: number;
  unique_users: number;
  first_use_date?: string | null;
  last_use_date?: string | null;
  status: string;
};

type ReferralCodeUsage = {
  id: string;
  referral_code_id: string;
  referral_code: string;
  user_id?: string | null;
  user_email?: string | null;
  user_phone?: string | null;
  user_name?: string | null;
  used_at: string;
  ip_address?: string | null;
  user_agent?: string | null;
  metadata?: any;
};

export const exportReferralCodes = async (codes: ReferralCodeAnalytics[]) => {
  if (!codes || codes.length === 0) {
    throw new Error("No referral codes available to export.");
  }

  const activeCodes = codes.filter((code) => code.status === "Active").length;
  const inactiveCodes = codes.filter((code) => code.status === "Inactive").length;
  const expiredCodes = codes.filter((code) => code.status === "Expired").length;
  const totalSignups = codes.reduce((sum, code) => sum + (code.total_signups ?? 0), 0);
  const totalUniqueUsers = codes.reduce((sum, code) => sum + (code.unique_users ?? 0), 0);

  const summary = [
    ["Referral Code Analytics Overview", ""],
    ["Total Codes", codes.length],
    ["Active Codes", activeCodes],
    ["Inactive Codes", inactiveCodes],
    ["Expired Codes", expiredCodes],
    ["Total Signups", totalSignups],
    ["Total Unique Users", totalUniqueUsers],
    [
      "Average Signups per Code",
      codes.length > 0 ? Number((totalSignups / codes.length).toFixed(2)) : 0,
    ],
    ["Export Date", new Date().toLocaleString()],
  ];

  const rows = codes.map((code, index) => ({
    "S.No": index + 1,
    "Referral Code": code.code,
    "Description": code.description || "-",
    "Status": code.status,
    "Total Signups": code.total_signups,
    "Unique Users": code.unique_users,
    "Usage Count": code.usage_count,
    "Max Uses": code.max_uses ?? "Unlimited",
    "Remaining Uses": code.max_uses ? code.max_uses - code.usage_count : "Unlimited",
    "First Used": code.first_use_date
      ? new Date(code.first_use_date).toLocaleString()
      : "Never",
    "Last Used": code.last_use_date
      ? new Date(code.last_use_date).toLocaleString()
      : "Never",
    "Created At": new Date(code.created_at).toLocaleString(),
    "Expires At": code.expires_at
      ? new Date(code.expires_at).toLocaleString()
      : "Never",
    "Created By": code.created_by || "-",
    "Is Active": code.is_active ? "Yes" : "No",
  }));

  await exportToExcel({
    filename: `referral-codes-${new Date().toISOString().split("T")[0]}`,
    summary,
    sheets: [
      {
        name: "Referral Codes",
        data: rows,
      },
    ],
  });
};

export const exportReferralUsage = async (
  usageRecords: ReferralCodeUsage[],
  referralCode: string
) => {
  if (!usageRecords || usageRecords.length === 0) {
    throw new Error("No usage records available to export.");
  }

  const uniqueUsers = new Set(
    usageRecords
      .map((u) => u.user_email || u.user_phone || u.user_id)
      .filter((v) => v)
  ).size;

  const summary = [
    ["Referral Code Usage Details", ""],
    ["Referral Code", referralCode],
    ["Total Uses", usageRecords.length],
    ["Unique Users", uniqueUsers],
    ["First Use", new Date(usageRecords[usageRecords.length - 1]?.used_at).toLocaleString()],
    ["Last Use", new Date(usageRecords[0]?.used_at).toLocaleString()],
    ["Export Date", new Date().toLocaleString()],
  ];

  const rows = usageRecords.map((usage, index) => ({
    "S.No": index + 1,
    "User Name": usage.user_name || "-",
    "User Email": usage.user_email || "-",
    "User Phone": usage.user_phone || "-",
    "User ID": usage.user_id || "-",
    "Used At": new Date(usage.used_at).toLocaleString(),
    "IP Address": usage.ip_address || "-",
    "User Agent": usage.user_agent || "-",
  }));

  await exportToExcel({
    filename: `referral-usage-${referralCode}-${new Date().toISOString().split("T")[0]}`,
    summary,
    sheets: [
      {
        name: "Usage Details",
        data: rows,
      },
    ],
  });
};

