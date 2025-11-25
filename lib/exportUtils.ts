"use client";

type SummaryRow = (string | number | null | undefined)[];

type ArrayOrObjectRow = Record<string, any> | any[];

type ExportSheet =
  | {
      name: string;
      data: ArrayOrObjectRow[];
      type?: "json";
      headerOrder?: string[];
    }
  | {
      name: string;
      data: any[][];
      type: "aoa";
    };

export type ExportWorkbookConfig = {
  filename: string;
  summary?: SummaryRow[];
  sheets: ExportSheet[];
  autoFitColumns?: boolean;
  timestamp?: boolean;
};

const sanitizeFilename = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 60) || "export";

const toSafeSheetName = (name: string) => {
  const sanitized = name.replace(/[:\\/?*\[\]]/g, " ").trim();
  return sanitized.length > 31 ? sanitized.substring(0, 31) : sanitized || "Sheet";
};

const autofitWorksheet = (worksheet: any, XLSX: any) => {
  if (!worksheet || !worksheet["!ref"]) return;

  const range = XLSX.utils.decode_range(worksheet["!ref"]);
  const colWidths: { wch: number }[] = [];

  for (let C = range.s.c; C <= range.e.c; C++) {
    let maxWidth = 12;
    for (let R = range.s.r; R <= range.e.r; R++) {
      const cell = worksheet[XLSX.utils.encode_cell({ r: R, c: C })];
      if (!cell || cell.v == null) continue;
      const value =
        typeof cell.v === "number" ? cell.v.toString() : String(cell.v ?? "");
      maxWidth = Math.max(maxWidth, value.length + 2);
    }
    colWidths.push({ wch: Math.min(maxWidth, 52) });
  }

  worksheet["!cols"] = colWidths;
};

export const exportToExcel = async ({
  filename,
  summary,
  sheets,
  autoFitColumns = true,
  timestamp = true,
}: ExportWorkbookConfig) => {
  if (!sheets || sheets.length === 0) {
    throw new Error("At least one sheet is required for export.");
  }

  const XLSX = await import("xlsx");

  const workbook = XLSX.utils.book_new();

  if (summary && summary.length > 0) {
    const summarySheet = XLSX.utils.aoa_to_sheet(summary);
    if (autoFitColumns) {
      autofitWorksheet(summarySheet, XLSX);
    }
    XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");
  }

  sheets.forEach((sheet) => {
    let worksheet;

    if (sheet.type === "aoa") {
      worksheet = XLSX.utils.aoa_to_sheet(sheet.data);
    } else {
      const rows = sheet.data as Record<string, any>[];

      if (sheet.headerOrder && sheet.headerOrder.length > 0) {
        worksheet = XLSX.utils.json_to_sheet(rows, { header: sheet.headerOrder });
      } else {
        worksheet = XLSX.utils.json_to_sheet(rows);
      }
    }

    if (autoFitColumns) {
      autofitWorksheet(worksheet, XLSX);
    }

    XLSX.utils.book_append_sheet(workbook, worksheet, toSafeSheetName(sheet.name));
  });

  const slug = sanitizeFilename(filename);
  const stamp = timestamp ? `-${new Date().toISOString().replace(/[:.]/g, "-")}` : "";
  const fullFilename = `${slug}${stamp}.xlsx`;

  XLSX.writeFile(workbook, fullFilename);
};


