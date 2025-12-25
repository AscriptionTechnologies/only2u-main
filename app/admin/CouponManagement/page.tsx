"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabase";

type DiscountType = "percentage" | "fixed";

type Coupon = {
  id: string;
  code: string;
  description?: string | null;
  discount_type: DiscountType;
  discount_value: number;
  max_uses?: number | null;
  uses_count: number;
  per_user_limit?: number | null;
  min_order_value?: number | null;
  start_date?: string | null;
  end_date?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type CouponFormState = {
  code: string;
  description: string;
  discount_type: DiscountType;
  discount_value: string;
  max_uses: string;
  per_user_limit: string;
  min_order_value: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
};

const initialFormState: CouponFormState = {
  code: "",
  description: "",
  discount_type: "percentage",
  discount_value: "",
  max_uses: "",
  per_user_limit: "",
  min_order_value: "",
  start_date: "",
  end_date: "",
  is_active: true,
};

const discountLabels: Record<DiscountType, string> = {
  percentage: "Percentage",
  fixed: "Flat Amount",
};

const generateCode = () => {
  const charset = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  for (let i = 0; i < 8; i++) {
    result += charset[Math.floor(Math.random() * charset.length)];
  }
  return result;
};

const getStatusBadge = (coupon: Coupon) => {
  const now = new Date();
  const start = coupon.start_date ? new Date(coupon.start_date) : null;
  const end = coupon.end_date ? new Date(coupon.end_date) : null;

  if (coupon.is_active) {
    if (end && end < now) {
      return { label: "Expired", color: "bg-gray-200 text-gray-600" };
    }
    if (start && start > now) {
      return { label: "Scheduled", color: "bg-amber-100 text-amber-700" };
    }
    return { label: "Active", color: "bg-green-100 text-green-700" };
  }
  return { label: "Inactive", color: "bg-red-100 text-red-600" };
};

export default function CouponManagementPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formState, setFormState] = useState<CouponFormState>(initialFormState);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive" | "expired">("all");

  useEffect(() => {
    fetchCoupons();
  }, []);

  const fetchCoupons = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("coupons")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching coupons:", error);
      setError("Failed to load coupons. Please try again.");
    } else {
      setCoupons((data as Coupon[]) || []);
      setError(null);
    }
    setLoading(false);
  };

  const startEdit = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setFormState({
      code: coupon.code,
      description: coupon.description || "",
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value.toString(),
      max_uses: coupon.max_uses?.toString() || "",
      per_user_limit: coupon.per_user_limit?.toString() || "",
      min_order_value: coupon.min_order_value?.toString() || "",
      start_date: coupon.start_date ? coupon.start_date.slice(0, 16) : "",
      end_date: coupon.end_date ? coupon.end_date.slice(0, 16) : "",
      is_active: coupon.is_active,
    });
    setError(null);
  };

  const resetForm = () => {
    if (submitting) return;
    setEditingCoupon(null);
    setFormState(initialFormState);
    setError(null);
  };

  const handleFormChange = (field: keyof CouponFormState, value: string | boolean) => {
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

    const sanitizedCode = formState.code.trim()
      ? formState.code.trim().toUpperCase()
      : generateCode();

    const payload = {
      code: sanitizedCode,
      description: formState.description.trim() || null,
      discount_type: formState.discount_type,
      discount_value: Number(formState.discount_value),
      max_uses: sanitizeNumberField(formState.max_uses),
      per_user_limit: sanitizeNumberField(formState.per_user_limit),
      min_order_value: sanitizeNumberField(formState.min_order_value),
      start_date: formState.start_date ? new Date(formState.start_date).toISOString() : null,
      end_date: formState.end_date ? new Date(formState.end_date).toISOString() : null,
      is_active: formState.is_active,
      updated_at: new Date().toISOString(),
    };

    if (!payload.code) {
      setError("Coupon code is required.");
      setSubmitting(false);
      return;
    }
    if (!formState.discount_value || Number(formState.discount_value) <= 0) {
      setError("Discount value must be greater than zero.");
      setSubmitting(false);
      return;
    }
    if (payload.discount_type === "percentage" && (payload.discount_value <= 0 || payload.discount_value > 100)) {
      setError("Percentage discount must be between 1 and 100.");
      setSubmitting(false);
      return;
    }
    if (payload.start_date && payload.end_date && new Date(payload.start_date) > new Date(payload.end_date)) {
      setError("End date must be after the start date.");
      setSubmitting(false);
      return;
    }

    try {
      if (editingCoupon) {
        const { error: updateError } = await supabase
          .from("coupons")
          .update(payload)
          .eq("id", editingCoupon.id);

        if (updateError) {
          console.error("Error updating coupon:", updateError);
          setError(updateError.message || "Failed to update coupon.");
        } else {
          resetForm();
          fetchCoupons();
        }
      } else {
        const { error: insertError } = await supabase.from("coupons").insert({
          ...payload,
          created_at: new Date().toISOString(),
          uses_count: 0,
        });

        if (insertError) {
          console.error("Error creating coupon:", insertError);
          setError(insertError.message || "Failed to create coupon.");
        } else {
          resetForm();
          fetchCoupons();
        }
      }
    } catch (submitError) {
      console.error("Unexpected coupon submit error:", submitError);
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (coupon: Coupon) => {
    if (
      typeof window !== "undefined" &&
      !window.confirm(`Delete coupon "${coupon.code}"? This action cannot be undone.`)
    )
      return;

    const { error } = await supabase.from("coupons").delete().eq("id", coupon.id);
    if (error) {
      console.error("Error deleting coupon:", error);
      if (typeof window !== "undefined") {
        window.alert("Failed to delete coupon. Please try again.");
      }
    } else {
      fetchCoupons();
    }
  };

  const toggleActiveStatus = async (coupon: Coupon) => {
    const { error } = await supabase
      .from("coupons")
      .update({
        is_active: !coupon.is_active,
        updated_at: new Date().toISOString(),
      })
      .eq("id", coupon.id);

    if (error) {
      console.error("Error toggling coupon status:", error);
      if (typeof window !== "undefined") {
        window.alert("Unable to update coupon status right now.");
      }
    } else {
      fetchCoupons();
    }
  };

  const filteredCoupons = useMemo(() => {
    const now = new Date();

    return coupons.filter((coupon) => {
      const searchMatch =
        coupon.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (coupon.description || "").toLowerCase().includes(searchTerm.toLowerCase());

      if (!searchMatch) return false;

      if (statusFilter === "active") {
        return coupon.is_active && (!coupon.end_date || new Date(coupon.end_date) >= now);
      }
      if (statusFilter === "inactive") {
        return !coupon.is_active;
      }
      if (statusFilter === "expired") {
        return coupon.end_date ? new Date(coupon.end_date) < now : false;
      }
      return true;
    });
  }, [coupons, searchTerm, statusFilter]);

  const summaryCards = useMemo(() => {
    const usedCouponsCount = coupons.filter((coupon) => (coupon.uses_count ?? 0) > 0).length;
    const pendingCouponsCount = coupons.filter((coupon) => (coupon.uses_count ?? 0) === 0).length;
    const totalUses = coupons.reduce((sum, coupon) => sum + (coupon.uses_count ?? 0), 0);
    const totalActive = coupons.filter((coupon) => coupon.is_active).length;

    return [
      {
        title: "Issued Coupons",
        value: usedCouponsCount,
        accent: "bg-blue-100 text-blue-700",
      },
      {
        title: "Pending (Unused)",
        value: pendingCouponsCount,
        accent: "bg-amber-100 text-amber-700",
      },
      {
        title: "Active Status",
        value: totalActive,
        accent: "bg-green-100 text-green-700",
      },
    ];
  }, [coupons]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Coupon Management</h1>
          <p className="text-sm text-gray-500">
            Create and manage promotional codes to reward your customers.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={resetForm}
            className="inline-flex items-center gap-2 border border-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition"
            disabled={submitting}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7h6m0 0V1m0 6l-8 8m8 8v-6m0 0h6m-6 0l8-8" />
            </svg>
            New Coupon
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

      {/* Inline Form */}
      <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            {editingCoupon ? `Editing ${editingCoupon.code}` : "Create a New Coupon"}
          </h2>
          {editingCoupon && (
            <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-600">
              Editing existing coupon
            </span>
          )}
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid gap-3 xl:grid-cols-6 md:grid-cols-3 sm:grid-cols-2">
            <div className="xl:col-span-1">
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">
                Coupon Code
              </label>
              <input
                type="text"
                value={formState.code}
                onChange={(e) => handleFormChange("code", e.target.value.toUpperCase())}
                placeholder={editingCoupon ? editingCoupon.code : "Auto-generate"}
                maxLength={20}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F53F7A]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">
                Discount Type
              </label>
              <select
                value={formState.discount_type}
                onChange={(e) => handleFormChange("discount_type", e.target.value as DiscountType)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F53F7A]"
              >
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Flat amount (₹)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">
                Discount Value
              </label>
              <input
                type="number"
                min="1"
                step="0.01"
                value={formState.discount_value}
                onChange={(e) => handleFormChange("discount_value", e.target.value)}
                placeholder={formState.discount_type === "percentage" ? "10 for 10%" : "200"}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F53F7A]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">
                Minimum Order (₹)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formState.min_order_value}
                onChange={(e) => handleFormChange("min_order_value", e.target.value)}
                placeholder="Optional"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F53F7A]"
              />
            </div>
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
                Per User Limit
              </label>
              <input
                type="number"
                min="0"
                value={formState.per_user_limit}
                onChange={(e) => handleFormChange("per_user_limit", e.target.value)}
                placeholder="Unlimited"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F53F7A]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">
                Start Date
              </label>
              <input
                type="datetime-local"
                value={formState.start_date}
                onChange={(e) => handleFormChange("start_date", e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F53F7A]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">
                End Date
              </label>
              <input
                type="datetime-local"
                value={formState.end_date}
                onChange={(e) => handleFormChange("end_date", e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F53F7A]"
              />
            </div>
            <div className="flex items-center gap-3 px-3 py-2 border border-gray-200 rounded-lg bg-gray-50">
              <input
                id="coupon-active"
                type="checkbox"
                checked={formState.is_active}
                onChange={(e) => handleFormChange("is_active", e.target.checked)}
                className="h-4 w-4 text-[#F53F7A] border-gray-300 rounded focus:ring-[#F53F7A]"
              />
              <label htmlFor="coupon-active" className="text-xs font-medium text-gray-700">
                Active
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">
              Description
            </label>
            <textarea
              value={formState.description}
              onChange={(e) => handleFormChange("description", e.target.value)}
              placeholder="Optional internal note or customer-facing copy."
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
            {editingCoupon && (
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
                ? "Saving..."
                : editingCoupon
                  ? "Update Coupon"
                  : `Create Coupon${formState.code.trim()
                    ? ` (${formState.code.trim().toUpperCase()})`
                    : ""
                  }`}
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

      {/* Coupon Table */}
      <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Usage
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Validity
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
                    Loading coupons…
                  </td>
                </tr>
              ) : filteredCoupons.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-gray-400">
                    No coupons match your current filters.
                  </td>
                </tr>
              ) : (
                filteredCoupons.map((coupon) => {
                  const badge = getStatusBadge(coupon);
                  return (
                    <tr key={coupon.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-gray-900 tracking-widest">
                            {coupon.code}
                          </span>
                          {coupon.description && (
                            <span className="text-xs text-gray-500 mt-1 line-clamp-2">
                              {coupon.description}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 font-medium">
                          {discountLabels[coupon.discount_type]}{" "}
                          {coupon.discount_type === "percentage"
                            ? `${coupon.discount_value}%`
                            : `₹${coupon.discount_value}`}
                        </div>
                        <div className="text-xs text-gray-500">
                          Min order:{" "}
                          {coupon.min_order_value != null ? `₹${coupon.min_order_value}` : "None"}
                        </div>
                        {coupon.per_user_limit != null && (
                          <div className="text-xs text-gray-500">
                            Per user limit: {coupon.per_user_limit}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 font-medium">
                          {coupon.uses_count} used
                        </div>
                        <div className="text-xs text-gray-500">
                          {coupon.max_uses ? `${coupon.max_uses - coupon.uses_count} remaining` : "Unlimited"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {coupon.start_date ? (
                          <div>
                            <span>From: {new Date(coupon.start_date).toLocaleDateString()}</span>
                          </div>
                        ) : (
                          <div>Starts: Immediately</div>
                        )}
                        {coupon.end_date ? (
                          <div>To: {new Date(coupon.end_date).toLocaleDateString()}</div>
                        ) : (
                          <div>Ends: Open-ended</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${badge.color}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                        <button
                          onClick={() => toggleActiveStatus(coupon)}
                          className={`text-sm ${coupon.is_active ? "text-amber-600 hover:text-amber-700" : "text-green-600 hover:text-green-700"
                            }`}
                        >
                          {coupon.is_active ? "Deactivate" : "Activate"}
                        </button>
                        <button
                          onClick={() => startEdit(coupon)}
                          className="text-[#F53F7A] hover:text-[#F53F7A]/80"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(coupon)}
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
    </div>
  );
}


