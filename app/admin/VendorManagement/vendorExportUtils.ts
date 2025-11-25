"use client";

import { exportToExcel } from "../../../lib/exportUtils";

type VendorRecord = {
  id: string;
  business_name: string | null;
  location: string | null;
  is_verified: boolean | null;
  profile_image_url: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  total_products?: number;
};

type ExportParams = {
  vendors: VendorRecord[];
  filteredCount: number;
  totalCount: number;
  title?: string;
};

export const exportVendors = async ({
  vendors,
  filteredCount,
  totalCount,
  title = "vendor-management",
}: ExportParams) => {
  if (!vendors || vendors.length === 0) {
    throw new Error("No vendors available to export.");
  }

  const verifiedCount = vendors.filter((vendor) => vendor.is_verified).length;
  const summary = [
    ["Vendor Overview", ""],
    ["Total Vendors", totalCount],
    ["Vendors In View (after filters)", filteredCount],
    ["Verified Vendors", verifiedCount],
    [
      "Unverified Vendors",
      vendors.length - verifiedCount,
    ],
    [
      "Average Products per Vendor",
      vendors.length > 0
        ? Number(
            (
              vendors.reduce(
                (sum, vendor) => sum + (vendor.total_products ?? 0),
                0
              ) / vendors.length
            ).toFixed(2)
          )
        : 0,
    ],
  ];

  const rows = vendors.map((vendor, index) => ({
    "S.No": index + 1,
    "Vendor ID": vendor.id,
    "Business Name": vendor.business_name || "-",
    "Location": vendor.location || "-",
    "Verified": vendor.is_verified ? "Yes" : "No",
    "Total Products": vendor.total_products ?? 0,
    "Contact Email": vendor.contact_email || "-",
    "Contact Phone": vendor.contact_phone || "-",
    "Profile Image": vendor.profile_image_url || "-",
    "Created At": vendor.created_at || "-",
    "Updated At": vendor.updated_at || "-",
  }));

  await exportToExcel({
    filename: title,
    summary,
    sheets: [
      {
        name: "Vendors",
        data: rows,
      },
    ],
  });
};


