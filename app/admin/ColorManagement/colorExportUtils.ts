"use client";

import { exportToExcel } from "../../../lib/exportUtils";

type ColorRecord = {
  id: string;
  name: string;
  hex_code: string;
  created_at?: string | null;
  updated_at?: string | null;
  usage_count?: number;
};

type ExportParams = {
  colors: ColorRecord[];
  totalCount: number;
};

export const exportColors = async ({ colors, totalCount }: ExportParams) => {
  if (!colors || colors.length === 0) {
    throw new Error("No colors available to export.");
  }

  const summary = [
    ["Color Overview", ""],
    ["Total Colors", totalCount],
    [
      "Colors Used In Variants",
      colors.filter((color) => (color.usage_count ?? 0) > 0).length,
    ],
    [
      "Average Usage per Color",
      Number(
        (
          colors.reduce((sum, color) => sum + (color.usage_count ?? 0), 0) /
          colors.length
        ).toFixed(2)
      ),
    ],
  ];

  const rows = colors.map((color, index) => ({
    "S.No": index + 1,
    "Color ID": color.id,
    "Color Name": color.name,
    "HEX Code": color.hex_code,
    "Usage Count": color.usage_count ?? 0,
    "Created At": color.created_at || "-",
    "Updated At": color.updated_at || "-",
  }));

  await exportToExcel({
    filename: "color-management",
    summary,
    sheets: [
      {
        name: "Colors",
        data: rows,
      },
    ],
  });
};


