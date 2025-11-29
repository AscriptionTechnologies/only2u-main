"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { exportReferralCodes, exportReferralUsage } from "./referralExportUtils";

type ReferralCode = {
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

type ReferralAnalytics = {
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

type FormState = {
  description: string;
  max_uses: string;
  expires_at: string;
  is_active: boolean;
  bulk_count: string;
};

const initialFormState: FormState = {
  description: "",
  max_uses: "",
  expires_at: "",
  is_active: true,
  bulk_count: "1",
};

const generateCode = (length: number = 8) => {
  const charset = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += charset[Math.floor(Math.random() * charset.length)];
  }
  return result;
};

const getStatusBadge = (referral: ReferralAnalytics) => {
  if (referral.status === "Expired") {
    return { label: "Expired", color: "bg-gray-200 text-gray-600" };
  }
  if (referral.status === "Inactive") {
    return { label: "Inactive", color: "bg-red-100 text-red-600" };
  }
  if (referral.status === "Limit Reached") {
    return { label: "Limit Reached", color: "bg-amber-100 text-amber-700" };
  }
  return { label: "Active", color: "bg-green-100 text-green-700" };
};

export default function ReferralManagementPage() {
  const [referralCodes, setReferralCodes] = useState<ReferralAnalytics[]>([]);
  const [selectedCode, setSelectedCode] = useState<ReferralAnalytics | null>(null);
  const [usageDetails, setUsageDetails] = useState<ReferralCodeUsage[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formState, setFormState] = useState<FormState>(initialFormState);
  const [editingCode, setEditingCode] = useState<ReferralCode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive" | "expired">("all");
  const [showUsageModal, setShowUsageModal] = useState(false);
  const [showCsvUpload, setShowCsvUpload] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvUploading, setCsvUploading] = useState(false);

  useEffect(() => {
    fetchReferralCodes();
  }, []);

  const fetchReferralCodes = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("referral_code_analytics")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching referral codes:", error);
      setError("Failed to load referral codes. Please try again.");
    } else {
      setReferralCodes((data as ReferralAnalytics[]) || []);
      setError(null);
    }
    setLoading(false);
  };

  const fetchUsageDetails = async (codeId: string) => {
    const { data, error } = await supabase
      .from("referral_code_usage")
      .select("*")
      .eq("referral_code_id", codeId)
      .order("used_at", { ascending: false });

    if (error) {
      console.error("Error fetching usage details:", error);
    } else {
      setUsageDetails((data as ReferralCodeUsage[]) || []);
    }
  };

  const handleViewUsage = async (code: ReferralAnalytics) => {
    setSelectedCode(code);
    await fetchUsageDetails(code.id);
    setShowUsageModal(true);
  };

  const startEdit = (code: ReferralAnalytics) => {
    setEditingCode(code as ReferralCode);
    setFormState({
      description: code.description || "",
      max_uses: code.max_uses?.toString() || "",
      expires_at: code.expires_at ? code.expires_at.slice(0, 16) : "",
      is_active: code.is_active,
      bulk_count: "1",
    });
    setError(null);
  };

  const resetForm = () => {
    if (submitting) return;
    setEditingCode(null);
    setFormState(initialFormState);
    setError(null);
  };

  const handleFormChange = (field: keyof FormState, value: string | boolean) => {
    setFormState((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const sanitizeNumberField = (value: string) => {
    if (value === "") return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const bulkCount = parseInt(formState.bulk_count) || 1;

    if (bulkCount < 1 || bulkCount > 1000) {
      setError("Bulk count must be between 1 and 1000.");
      setSubmitting(false);
      return;
    }

    try {
      if (editingCode) {
        // Update existing code
        const payload = {
          description: formState.description.trim() || null,
          max_uses: sanitizeNumberField(formState.max_uses),
          expires_at: formState.expires_at ? new Date(formState.expires_at).toISOString() : null,
          is_active: formState.is_active,
        };

        const { error: updateError } = await supabase
          .from("referral_codes")
          .update(payload)
          .eq("id", editingCode.id);

        if (updateError) {
          console.error("Error updating referral code:", updateError);
          setError(updateError.message || "Failed to update referral code.");
        } else {
          resetForm();
          fetchReferralCodes();
        }
      } else {
        // Generate new codes in bulk
        const newCodes = [];
        const existingCodes = new Set(referralCodes.map((rc) => rc.code));

        for (let i = 0; i < bulkCount; i++) {
          let code = generateCode();
          // Ensure uniqueness
          while (existingCodes.has(code)) {
            code = generateCode();
          }
          existingCodes.add(code);

          newCodes.push({
            code,
            description: formState.description.trim() || null,
            max_uses: sanitizeNumberField(formState.max_uses),
            expires_at: formState.expires_at ? new Date(formState.expires_at).toISOString() : null,
            is_active: formState.is_active,
            usage_count: 0,
            created_at: new Date().toISOString(),
          });
        }

        const { error: insertError } = await supabase.from("referral_codes").insert(newCodes);

        if (insertError) {
          console.error("Error creating referral codes:", insertError);
          setError(insertError.message || "Failed to create referral codes.");
        } else {
          resetForm();
          fetchReferralCodes();
          if (typeof window !== "undefined") {
            window.alert(`Successfully generated ${bulkCount} referral code${bulkCount > 1 ? "s" : ""}!`);
          }
        }
      }
    } catch (submitError) {
      console.error("Unexpected referral code submit error:", submitError);
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (code: ReferralAnalytics) => {
    if (
      typeof window !== "undefined" &&
      !window.confirm(`Delete referral code "${code.code}"? This action cannot be undone.`)
    )
      return;

    const { error } = await supabase.from("referral_codes").delete().eq("id", code.id);
    if (error) {
      console.error("Error deleting referral code:", error);
      if (typeof window !== "undefined") {
        window.alert("Failed to delete referral code. Please try again.");
      }
    } else {
      fetchReferralCodes();
    }
  };

  const toggleActiveStatus = async (code: ReferralAnalytics) => {
    const { error } = await supabase
      .from("referral_codes")
      .update({ is_active: !code.is_active })
      .eq("id", code.id);

    if (error) {
      console.error("Error toggling referral code status:", error);
      if (typeof window !== "undefined") {
        window.alert("Unable to update referral code status right now.");
      }
    } else {
      fetchReferralCodes();
    }
  };

  const filteredCodes = useMemo(() => {
    return referralCodes.filter((code) => {
      const searchMatch =
        code.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (code.description || "").toLowerCase().includes(searchTerm.toLowerCase());

      if (!searchMatch) return false;

      if (statusFilter === "active") {
        return code.status === "Active";
      }
      if (statusFilter === "inactive") {
        return code.status === "Inactive";
      }
      if (statusFilter === "expired") {
        return code.status === "Expired";
      }
      return true;
    });
  }, [referralCodes, searchTerm, statusFilter]);

  const summaryCards = useMemo(() => {
    const totalActive = referralCodes.filter((code) => code.status === "Active").length;
    const totalInactive = referralCodes.filter((code) => code.status === "Inactive").length;
    const totalExpired = referralCodes.filter((code) => code.status === "Expired").length;
    const totalSignups = referralCodes.reduce((sum, code) => sum + (code.total_signups ?? 0), 0);

    return [
      {
        title: "Active Codes",
        value: totalActive,
        accent: "text-green-700",
        bg: "bg-green-100",
      },
      {
        title: "Total Codes",
        value: referralCodes.length,
        accent: "text-blue-700",
        bg: "bg-blue-100",
      },
      {
        title: "Total Signups",
        value: totalSignups,
        accent: "text-[#F53F7A]",
        bg: "bg-[#F53F7A]/10",
      },
      {
        title: "Expired/Inactive",
        value: totalExpired + totalInactive,
        accent: "text-gray-600",
        bg: "bg-gray-100",
      },
    ];
  }, [referralCodes]);

  const handleExportCodes = () => {
    exportReferralCodes(filteredCodes);
  };

  const handleExportUsage = () => {
    if (selectedCode) {
      exportReferralUsage(usageDetails, selectedCode.code);
    }
  };

  const parseCSV = (text: string): Array<{ code: string; description?: string; max_uses?: number; expires_at?: string }> => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length === 0) return [];

    // Check if first line is header
    const hasHeader = lines[0].toLowerCase().includes('code') || lines[0].toLowerCase().includes('referral');
    const dataLines = hasHeader ? lines.slice(1) : lines;

    const codes: Array<{ code: string; description?: string; max_uses?: number; expires_at?: string }> = [];

    for (const line of dataLines) {
      const columns = line.split(',').map(col => col.trim().replace(/^"|"$/g, ''));
      
      if (columns.length === 0 || !columns[0]) continue;

      const code = columns[0].toUpperCase().trim();
      if (!code) continue;

      const parsed: { code: string; description?: string; max_uses?: number; expires_at?: string } = { code };

      // Optional: description (column 2)
      if (columns[1]) {
        parsed.description = columns[1];
      }

      // Optional: max_uses (column 3)
      if (columns[2]) {
        const maxUses = parseInt(columns[2]);
        if (!isNaN(maxUses) && maxUses > 0) {
          parsed.max_uses = maxUses;
        }
      }

      // Optional: expires_at (column 4) - format: YYYY-MM-DD or YYYY-MM-DD HH:MM
      if (columns[3]) {
        const dateStr = columns[3].trim();
        if (dateStr) {
          // Try to parse the date
          const date = new Date(dateStr);
          if (!isNaN(date.getTime())) {
            parsed.expires_at = date.toISOString();
          }
        }
      }

      codes.push(parsed);
    }

    return codes;
  };

  const handleCsvUpload = async () => {
    if (!csvFile) {
      setError("Please select a CSV file.");
      return;
    }

    setCsvUploading(true);
    setError(null);

    try {
      const text = await csvFile.text();
      const parsedCodes = parseCSV(text);

      if (parsedCodes.length === 0) {
        setError("No valid codes found in CSV file. Please check the format.");
        setCsvUploading(false);
        return;
      }

      // Validate codes
      const existingCodes = new Set(referralCodes.map((rc) => rc.code));
      const duplicateCodes: string[] = [];
      const validCodes: typeof parsedCodes = [];

      for (const parsed of parsedCodes) {
        if (existingCodes.has(parsed.code)) {
          duplicateCodes.push(parsed.code);
        } else {
          validCodes.push(parsed);
        }
      }

      if (validCodes.length === 0) {
        setError(`All codes in CSV already exist. Duplicates: ${duplicateCodes.join(', ')}`);
        setCsvUploading(false);
        return;
      }

      // Prepare codes for insertion
      const newCodes = validCodes.map((parsed) => ({
        code: parsed.code,
        description: parsed.description || formState.description.trim() || null,
        max_uses: parsed.max_uses || sanitizeNumberField(formState.max_uses),
        expires_at: parsed.expires_at || (formState.expires_at ? new Date(formState.expires_at).toISOString() : null),
        is_active: formState.is_active,
        usage_count: 0,
        created_at: new Date().toISOString(),
      }));

      // Insert codes
      const { error: insertError } = await supabase.from("referral_codes").insert(newCodes);

      if (insertError) {
        console.error("Error uploading codes:", insertError);
        setError(insertError.message || "Failed to upload codes from CSV.");
      } else {
        const successMsg = `Successfully uploaded ${validCodes.length} code${validCodes.length > 1 ? "s" : ""}!${
          duplicateCodes.length > 0 ? ` (${duplicateCodes.length} duplicate${duplicateCodes.length > 1 ? "s" : ""} skipped)` : ""
        }`;
        
        if (typeof window !== "undefined") {
          window.alert(successMsg);
        }
        
        setCsvFile(null);
        setShowCsvUpload(false);
        fetchReferralCodes();
      }
    } catch (error) {
      console.error("Error processing CSV:", error);
      setError("Failed to process CSV file. Please check the format and try again.");
    } finally {
      setCsvUploading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Referral Code Management</h1>
          <p className="text-sm text-gray-500">
            Generate and track referral codes for user acquisition campaigns.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCodes}
            className="inline-flex items-center gap-2 border border-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export Codes
          </button>
          <button
            onClick={() => setShowCsvUpload(!showCsvUpload)}
            className="inline-flex items-center gap-2 border border-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            Upload CSV
          </button>
          <button
            onClick={resetForm}
            className="inline-flex items-center gap-2 bg-[#F53F7A] text-white px-4 py-2 rounded-lg hover:bg-[#F53F7A]/90 transition"
            disabled={submitting}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            Generate Codes
          </button>
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
            <span className={`text-2xl font-bold ${card.accent}`}>{card.value}</span>
          </div>
        ))}
      </div>

      {/* CSV Upload Section */}
      {showCsvUpload && (
        <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Upload Referral Codes from CSV</h2>
              <p className="text-sm text-gray-500 mt-1">
                Upload custom referral codes from a CSV file
              </p>
            </div>
            <button
              onClick={() => {
                setShowCsvUpload(false);
                setCsvFile(null);
                setError(null);
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                CSV File Format
              </label>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm">
                <p className="text-gray-700 mb-2">CSV should have the following columns (first row is optional header):</p>
                <div className="font-mono text-xs bg-white p-2 rounded border">
                  code,description,max_uses,expires_at
                </div>
                <p className="text-gray-600 mt-2 text-xs">
                  <strong>code</strong> (required) - The referral code<br />
                  <strong>description</strong> (optional) - Campaign or description<br />
                  <strong>max_uses</strong> (optional) - Maximum number of uses<br />
                  <strong>expires_at</strong> (optional) - Expiration date (YYYY-MM-DD or YYYY-MM-DD HH:MM)
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Select CSV File
              </label>
              <input
                type="file"
                accept=".csv"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setCsvFile(file);
                    setError(null);
                  }
                }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F53F7A]"
              />
              {csvFile && (
                <p className="text-sm text-gray-600 mt-2">
                  Selected: <span className="font-medium">{csvFile.name}</span> ({(csvFile.size / 1024).toFixed(2)} KB)
                </p>
              )}
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> Codes from CSV will use the settings below (description, max uses, expiration, active status) if not specified in the CSV file.
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-2">
                {error}
              </div>
            )}

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowCsvUpload(false);
                  setCsvFile(null);
                  setError(null);
                }}
                className="px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition"
                disabled={csvUploading}
              >
                Cancel
              </button>
              <button
                onClick={handleCsvUpload}
                className="px-4 py-2 rounded-lg bg-[#F53F7A] text-white hover:bg-[#F53F7A]/90 transition disabled:opacity-60"
                disabled={csvUploading || !csvFile}
              >
                {csvUploading ? "Uploading..." : "Upload Codes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Form */}
      <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            {editingCode ? `Editing ${editingCode.code}` : "Generate New Referral Codes"}
          </h2>
          {editingCode && (
            <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-600">
              Editing existing code
            </span>
          )}
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid gap-3 xl:grid-cols-5 md:grid-cols-3 sm:grid-cols-2">
            {!editingCode && (
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">
                  Bulk Count
                </label>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={formState.bulk_count}
                  onChange={(e) => handleFormChange("bulk_count", e.target.value)}
                  placeholder="1"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F53F7A]"
                />
                <p className="text-xs text-gray-500 mt-1">Generate 1-1000 codes at once</p>
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">
                Max Uses
              </label>
              <input
                type="number"
                min="0"
                value={formState.max_uses}
                onChange={(e) => handleFormChange("max_uses", e.target.value)}
                placeholder="Unlimited"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F53F7A]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">
                Expires At
              </label>
              <input
                type="datetime-local"
                value={formState.expires_at}
                onChange={(e) => handleFormChange("expires_at", e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F53F7A]"
              />
            </div>
            <div className="flex items-end gap-3 px-3 py-2 border border-gray-200 rounded-lg bg-gray-50">
              <input
                id="code-active"
                type="checkbox"
                checked={formState.is_active}
                onChange={(e) => handleFormChange("is_active", e.target.checked)}
                className="h-4 w-4 text-[#F53F7A] border-gray-300 rounded focus:ring-[#F53F7A]"
              />
              <label htmlFor="code-active" className="text-xs font-medium text-gray-700">
                Active
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">
              Description / Campaign Name
            </label>
            <textarea
              value={formState.description}
              onChange={(e) => handleFormChange("description", e.target.value)}
              placeholder="e.g., Summer Campaign 2025, Influencer Promo, etc."
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F53F7A]"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-2">
              {error}
            </div>
          )}

          <div className="flex flex-wrap gap-3 justify-end">
            {editingCode && (
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition"
                disabled={submitting}
              >
                Cancel Edit
              </button>
            )}
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-[#F53F7A] text-white hover:bg-[#F53F7A]/90 transition disabled:opacity-60"
              disabled={submitting}
            >
              {submitting
                ? "Processing..."
                : editingCode
                ? "Update Code"
                : `Generate ${formState.bulk_count} Code${parseInt(formState.bulk_count) > 1 ? "s" : ""}`}
            </button>
          </div>
        </form>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <input
          type="text"
          placeholder="Search by code or description..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full md:w-64 border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#F53F7A]"
        />
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className="border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#F53F7A]"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="expired">Expired</option>
          </select>
          <button
            onClick={() => {
              setSearchTerm("");
              setStatusFilter("all");
            }}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm hover:bg-gray-50 transition"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Referral Codes Table */}
      <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Usage Stats
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Expires
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
                  <td colSpan={6} className="px-6 py-10 text-center text-gray-400">
                    Loading referral codes…
                  </td>
                </tr>
              ) : filteredCodes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-gray-400">
                    No referral codes match your current filters.
                  </td>
                </tr>
              ) : (
                filteredCodes.map((code) => {
                  const badge = getStatusBadge(code);
                  return (
                    <tr key={code.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-gray-900 tracking-widest font-mono">
                            {code.code}
                          </span>
                          {code.description && (
                            <span className="text-xs text-gray-500 mt-1 line-clamp-2">
                              {code.description}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 font-medium">
                          {code.total_signups} signups
                        </div>
                        <div className="text-xs text-gray-500">
                          {code.unique_users} unique users
                        </div>
                        <div className="text-xs text-gray-500">
                          {code.max_uses
                            ? `${code.max_uses - code.usage_count} remaining`
                            : "Unlimited"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(code.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {code.expires_at
                          ? new Date(code.expires_at).toLocaleDateString()
                          : "Never"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${badge.color}`}
                        >
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                        <button
                          onClick={() => handleViewUsage(code)}
                          className="text-blue-600 hover:text-blue-700"
                        >
                          View Usage
                        </button>
                        <button
                          onClick={() => toggleActiveStatus(code)}
                          className={`text-sm ${
                            code.is_active
                              ? "text-amber-600 hover:text-amber-700"
                              : "text-green-600 hover:text-green-700"
                          }`}
                        >
                          {code.is_active ? "Deactivate" : "Activate"}
                        </button>
                        <button
                          onClick={() => startEdit(code)}
                          className="text-[#F53F7A] hover:text-[#F53F7A]/80"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(code)}
                          className="text-red-600 hover:text-red-700"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Usage Details Modal */}
      {showUsageModal && selectedCode && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  Usage Details: {selectedCode.code}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  {usageDetails.length} total usage{usageDetails.length !== 1 ? "s" : ""}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleExportUsage}
                  className="inline-flex items-center gap-2 border border-gray-200 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-50 transition text-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  Export
                </button>
                <button
                  onClick={() => setShowUsageModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-6">
              {usageDetails.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  No usage recorded for this referral code yet.
                </div>
              ) : (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                        User Details
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                        Used At
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                        IP Address
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {usageDetails.map((usage) => (
                      <tr key={usage.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm">
                          <div className="flex flex-col">
                            {usage.user_name && (
                              <span className="font-medium text-gray-900">{usage.user_name}</span>
                            )}
                            {usage.user_email && (
                              <span className="text-gray-500">{usage.user_email}</span>
                            )}
                            {usage.user_phone && (
                              <span className="text-gray-500">{usage.user_phone}</span>
                            )}
                            {!usage.user_name && !usage.user_email && !usage.user_phone && (
                              <span className="text-gray-400 italic">No user details</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {new Date(usage.used_at).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 font-mono">
                          {usage.ip_address || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

