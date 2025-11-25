"use client";

import { exportToExcel } from "../../../lib/exportUtils";

type UserRecord = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  role: string | null;
  is_active?: boolean | null;
  created_at?: string | null;
  last_sign_in_at?: string | null;
  vendor?: {
    business_name?: string | null;
    is_verified?: boolean | null;
  } | null;
  orders_count?: number | null;
  total_spent?: number | null;
};

type ExportParams = {
  users: UserRecord[];
  filteredCount: number;
  totalCount: number;
  title?: string;
};

const roleLabel = (role?: string | null) => {
  if (!role) return "Unknown";
  switch (role) {
    case "admin":
      return "Admin";
    case "vendor":
      return "Vendor";
    case "customer":
      return "Customer";
    default:
      return role.charAt(0).toUpperCase() + role.slice(1);
  }
};

export const exportUsers = async ({
  users,
  filteredCount,
  totalCount,
  title = "user-management",
}: ExportParams) => {
  if (!users || users.length === 0) {
    throw new Error("No users available to export.");
  }

  const summary = [
    ["User Overview", ""],
    ["Total Users", totalCount],
    ["Users In View (after filters)", filteredCount],
    [
      "Roles Breakdown",
      Object.entries(
        users.reduce<Record<string, number>>((acc, user) => {
          const key = roleLabel(user.role).toLowerCase();
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        }, {})
      )
        .map(([role, count]) => `${role}: ${count}`)
        .join(" | "),
    ],
    [
      "Active Users",
      users.filter((user) => user.is_active !== false).length,
    ],
    [
      "Verified Vendors",
      users.filter((user) => user.vendor?.is_verified).length,
    ],
    [
      "Average Orders per User",
      users.length > 0
        ? Number(
            (
              users.reduce((sum, user) => sum + (user.orders_count ?? 0), 0) /
              users.length
            ).toFixed(2)
          )
        : 0,
    ],
    [
      "Average Spend per User (₹)",
      users.length > 0
        ? Number(
            (
              users.reduce((sum, user) => sum + (user.total_spent ?? 0), 0) /
              users.length
            ).toFixed(2)
          )
        : 0,
    ],
  ];

  const rows = users.map((user, index) => ({
    "S.No": index + 1,
    "User ID": user.id,
    "Name": user.name || "-",
    "Email": user.email || "-",
    "Phone": user.phone || "-",
    "Role": roleLabel(user.role),
    "Status": user.is_active === false ? "Inactive" : "Active",
    "Vendor Business": user.vendor?.business_name || "-",
    "Vendor Verified": user.vendor?.is_verified ? "Yes" : "No",
    "Orders Count": user.orders_count ?? 0,
    "Total Spent (₹)": user.total_spent ?? 0,
    "Created At": user.created_at || "-",
    "Last Sign-In": user.last_sign_in_at || "-",
  }));

  await exportToExcel({
    filename: title,
    summary,
    sheets: [
      {
        name: "Users",
        data: rows,
      },
    ],
  });
};


