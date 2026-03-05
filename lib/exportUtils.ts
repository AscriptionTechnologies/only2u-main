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

export const exportToDelhiveryCSV = (orders: any[]) => {
  if (!orders || orders.length === 0) {
    throw new Error("No orders to export.");
  }

  // Delhivery CSV Headers
  const headers = [
    "*Sale Order Number",
    "*Pickup Location Name",
    "*Transport Mode",
    "*Payment Mode",
    "COD Amount",
    "*Customer Name",
    "*Customer Phone",
    "*Shipping Address Line1",
    "Shipping Address Line2",
    "*Shipping City",
    "*Shipping State",
    "*Shipping Pincode",
    "*Item Sku Code",
    "*Item Sku Name",
    "*Quantity Ordered",
    "Protect Category Id",
    "Packaging Type",
    "*Unit Item Price",
    "Length (cm)",
    "Breadth (cm)",
    "Height (cm)",
    "Weight (gm)",
    "Fragile Shipment",
    "Discount Type",
    "Discount Value",
    "Tax Class Code",
    "Customer Email",
    "Billing Address same as Shipping Address",
    "Billing Address Line1",
    "Billing Address Line2",
    "Billing City",
    "Billing State",
    "Billing Pincode",
    "e-Way Bill Number",
    "Seller Name",
    "Seller GST Number",
    "Seller Address Line1",
    "Seller Address Line2",
    "Seller City",
    "Seller State",
    "Seller Pincode",
    "Select NDD"
  ];

  const rows: any[] = [];

  // Helper to extract address parts (simplified)
  const parseAddress = (address: string) => {
    // This is a rough approximation as address structures vary
    // Assuming format: "Line 1, Line 2, City, State, Pincode" or similar
    const parts = (address || "").split(",").map(p => p.trim());

    let pincode = "";
    let state = "";
    let city = "";
    let line1 = address || "";

    // Try to find pincode (last 6 digits)
    const pincodeMatch = address.match(/\b\d{6}\b/);
    if (pincodeMatch) {
      pincode = pincodeMatch[0];
    }

    // Try to find state/city from parts if available (very basic heuristic)
    if (parts.length >= 3) {
      // Often simple heuristics are risky, leaving blank for manual correction might be safer
      // But we can try to guess state if we had a mapping. for now leave empty.
    }

    // Since we don't have structured data, we'll put the full address in Line 1
    // and rely on the user to verify/fix in the CSV if needed.

    return {
      line1: address ? address.replace(/,/g, " ").substring(0, 100) : "", // Delhivery might have char limits
      line2: "",
      city: city, // Leave empty for manual fill if not reliably extractable
      state: state,
      pincode: pincode
    };
  };

  orders.forEach(order => {
    // Check if COD
    const paymentMethodLower = (order.payment_method || "").toLowerCase();
    const isCOD = paymentMethodLower.includes("cod") || paymentMethodLower.includes("cash");
    const paymentMode = isCOD ? "COD" : "Prepaid";

    const codAmount = isCOD ? (order.total_amount || 0) : 0;

    const shipAddr = parseAddress(order.shipping_address || "");

    // Process each item
    if (order.order_items && order.order_items.length > 0) {
      (order.order_items).forEach((item: any) => {
        const row = [
          order.order_number,                  // Sale Order Number
          "Warehouse",                         // Pickup Location Name (Default)
          "Surface",                           // Transport Mode (Default)
          paymentMode,                         // Payment Mode
          codAmount,                           // COD Amount
          order.user?.name || "Customer",      // Customer Name
          order.user?.phone || "",             // Customer Phone
          shipAddr.line1,                      // Shipping Address Line1
          shipAddr.line2,                      // Shipping Address Line2
          shipAddr.city,                       // Shipping City
          shipAddr.state,                      // Shipping State
          shipAddr.pincode,                    // Shipping Pincode
          item.product_sku || "SKU-MISSING",   // Item Sku Code
          item.product_name || "Item",         // Item Sku Name
          item.quantity,                       // Quantity Ordered
          "",                                  // Protect Category Id (Default empty)
          "Box",                               // Packaging Type (Default)
          item.unit_price,                     // Unit Item Price
          10,                                  // Length (cm) (Default)
          10,                                  // Breadth (cm) (Default)
          10,                                  // Height (cm) (Default)
          500,                                 // Weight (gm) (Default)
          "FALSE",                             // Fragile Shipment (Default)
          "",                                  // Discount Type
          0,                                   // Discount Value
          item.hsn_code || "",                 // Tax Class Code
          order.user?.email || "",             // Customer Email
          "TRUE",                              // Billing Address same as Shipping Address
          "",                                  // Billing Address Line1
          "",                                  // Billing Address Line2
          "",                                  // Billing City
          "",                                  // Billing State
          "",                                  // Billing Pincode
          "",                                  // e-Way Bill Number
          "Only2U",                            // Seller Name
          "",                                  // Seller GST Number
          "",                                  // Seller Address Line1
          "",                                  // Seller Address Line2
          "",                                  // Seller City
          "",                                  // Seller State
          "",                                  // Seller Pincode
          "FALSE"                              // Select NDD
        ];
        rows.push(row);
      });
    } else {
      // If no items, still export the order line (though rare for approved orders)
      const row = [
        order.order_number,                  // Sale Order Number
        "Warehouse",                         // Pickup Location Name (Default)
        "Surface",                           // Transport Mode (Default)
        paymentMode,                         // Payment Mode
        codAmount,                           // COD Amount
        order.user?.name || "Customer",      // Customer Name
        order.user?.phone || "",             // Customer Phone
        shipAddr.line1,                      // Shipping Address Line1
        shipAddr.line2,                      // Shipping Address Line2
        shipAddr.city,                       // Shipping City
        shipAddr.state,                      // Shipping State
        shipAddr.pincode,                    // Shipping Pincode
        "SKU-MISSING",                       // Item Sku Code
        "Item",                              // Item Sku Name
        1,                                   // Quantity Ordered
        "",                                  // Protect Category Id (Default empty)
        "Box",                               // Packaging Type (Default)
        order.total_amount,                  // Unit Item Price (fallback)
        10,                                  // Length (cm) (Default)
        10,                                  // Breadth (cm) (Default)
        10,                                  // Height (cm) (Default)
        500,                                 // Weight (gm) (Default)
        "FALSE",                             // Fragile Shipment (Default)
        "",                                  // Discount Type
        0,                                   // Discount Value
        "",                                  // Tax Class Code
        order.user?.email || "",             // Customer Email
        "TRUE",                              // Billing Address same as Shipping Address
        "",                                  // Billing Address Line1
        "",                                  // Billing Address Line2
        "",                                  // Billing City
        "",                                  // Billing State
        "",                                  // Billing Pincode
        "",                                  // e-Way Bill Number
        "Only2U",                            // Seller Name
        "",                                  // Seller GST Number
        "",                                  // Seller Address Line1
        "",                                  // Seller Address Line2
        "",                                  // Seller City
        "",                                  // Seller State
        "",                                  // Seller Pincode
        "FALSE"                              // Select NDD
      ];
      rows.push(row);
    }
  });

  // Calculate required buffer size
  const csvString = [
    headers.join(","),
    ...rows.map(row => row.map((cell: any) => {
      // Escape quotes and wrap in quotes if contains comma
      const stringCell = String(cell === null || cell === undefined ? "" : cell);
      if (stringCell.includes(",") || stringCell.includes('"') || stringCell.includes("\n") || stringCell.includes("\r")) {
        return `"${stringCell.replace(/"/g, '""')}"`;
      }
      return stringCell;
    }).join(","))
  ].join("\n");

  // Create Blob and download
  const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });

  // Create download link element
  const link = document.createElement("a");

  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").substring(0, 19);
    link.setAttribute("download", `delhivery_bulk_upload_${timestamp}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
};




