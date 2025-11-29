"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabase";

type InfluencerProfile = {
  id: string;
  user_id?: string | null;
  name: string;
  username: string;
  bio?: string | null;
  profile_photo?: string | null;
  instagram_handle?: string | null;
  youtube_handle?: string | null;
  tiktok_handle?: string | null;
  twitter_handle?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  website_url?: string | null;
  total_followers: number;
  total_posts: number;
  total_products_promoted: number;
  influencer_code?: string | null;
  commission_rate: number;
  total_earnings: number;
  is_verified: boolean;
  is_active: boolean;
  joined_at: string;
  allow_messages: boolean;
  show_contact_info: boolean;
  created_at: string;
  updated_at: string;
};

type FormState = {
  name: string;
  username: string;
  bio: string;
  instagram_handle: string;
  youtube_handle: string;
  tiktok_handle: string;
  twitter_handle: string;
  contact_email: string;
  contact_phone: string;
  website_url: string;
  total_followers: string;
  influencer_code: string;
  commission_rate: string;
  is_verified: boolean;
  is_active: boolean;
};

const initialFormState: FormState = {
  name: "",
  username: "",
  bio: "",
  instagram_handle: "",
  youtube_handle: "",
  tiktok_handle: "",
  twitter_handle: "",
  contact_email: "",
  contact_phone: "",
  website_url: "",
  total_followers: "0",
  influencer_code: "",
  commission_rate: "10.00",
  is_verified: false,
  is_active: true,
};

export default function InfluencerProfilesPage() {
  const [profiles, setProfiles] = useState<InfluencerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formState, setFormState] = useState<FormState>(initialFormState);
  const [editingProfile, setEditingProfile] = useState<InfluencerProfile | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("influencer_profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching profiles:", error);
      setError("Failed to load influencer profiles. Please try again.");
    } else {
      setProfiles((data as InfluencerProfile[]) || []);
      setError(null);
    }
    setLoading(false);
  };

  const startEdit = (profile: InfluencerProfile) => {
    setEditingProfile(profile);
    setFormState({
      name: profile.name,
      username: profile.username,
      bio: profile.bio || "",
      instagram_handle: profile.instagram_handle || "",
      youtube_handle: profile.youtube_handle || "",
      tiktok_handle: profile.tiktok_handle || "",
      twitter_handle: profile.twitter_handle || "",
      contact_email: profile.contact_email || "",
      contact_phone: profile.contact_phone || "",
      website_url: profile.website_url || "",
      total_followers: profile.total_followers.toString(),
      influencer_code: profile.influencer_code || "",
      commission_rate: profile.commission_rate.toString(),
      is_verified: profile.is_verified,
      is_active: profile.is_active,
    });
    setShowForm(true);
    setError(null);
  };

  const resetForm = () => {
    if (submitting) return;
    setEditingProfile(null);
    setFormState(initialFormState);
    setShowForm(false);
    setError(null);
  };

  const handleFormChange = (field: keyof FormState, value: string | boolean) => {
    setFormState((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    if (!formState.name.trim() || !formState.username.trim()) {
      setError("Name and username are required.");
      setSubmitting(false);
      return;
    }

    const payload = {
      name: formState.name.trim(),
      username: formState.username.trim().toLowerCase(),
      bio: formState.bio.trim() || null,
      instagram_handle: formState.instagram_handle.trim() || null,
      youtube_handle: formState.youtube_handle.trim() || null,
      tiktok_handle: formState.tiktok_handle.trim() || null,
      twitter_handle: formState.twitter_handle.trim() || null,
      contact_email: formState.contact_email.trim() || null,
      contact_phone: formState.contact_phone.trim() || null,
      website_url: formState.website_url.trim() || null,
      total_followers: parseInt(formState.total_followers) || 0,
      influencer_code: formState.influencer_code.trim() || null,
      commission_rate: parseFloat(formState.commission_rate) || 10.0,
      is_verified: formState.is_verified,
      is_active: formState.is_active,
    };

    try {
      if (editingProfile) {
        const { error: updateError } = await supabase
          .from("influencer_profiles")
          .update(payload)
          .eq("id", editingProfile.id);

        if (updateError) {
          console.error("Error updating profile:", updateError);
          setError(updateError.message || "Failed to update profile.");
        } else {
          resetForm();
          fetchProfiles();
        }
      } else {
        const { error: insertError } = await supabase
          .from("influencer_profiles")
          .insert(payload);

        if (insertError) {
          console.error("Error creating profile:", insertError);
          setError(insertError.message || "Failed to create profile.");
        } else {
          resetForm();
          fetchProfiles();
        }
      }
    } catch (submitError) {
      console.error("Unexpected error:", submitError);
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (profile: InfluencerProfile) => {
    if (
      typeof window !== "undefined" &&
      !window.confirm(`Delete influencer "${profile.name}"? This action cannot be undone.`)
    )
      return;

    const { error } = await supabase
      .from("influencer_profiles")
      .delete()
      .eq("id", profile.id);

    if (error) {
      console.error("Error deleting profile:", error);
      if (typeof window !== "undefined") {
        window.alert("Failed to delete profile. Please try again.");
      }
    } else {
      fetchProfiles();
    }
  };

  const toggleActiveStatus = async (profile: InfluencerProfile) => {
    const { error } = await supabase
      .from("influencer_profiles")
      .update({ is_active: !profile.is_active })
      .eq("id", profile.id);

    if (error) {
      console.error("Error toggling status:", error);
      if (typeof window !== "undefined") {
        window.alert("Unable to update status right now.");
      }
    } else {
      fetchProfiles();
    }
  };

  const filteredProfiles = useMemo(() => {
    return profiles.filter((profile) => {
      const searchMatch =
        profile.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        profile.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (profile.instagram_handle || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (profile.influencer_code || "").toLowerCase().includes(searchTerm.toLowerCase());

      if (!searchMatch) return false;

      if (statusFilter === "active") return profile.is_active;
      if (statusFilter === "inactive") return !profile.is_active;
      return true;
    });
  }, [profiles, searchTerm, statusFilter]);

  const summaryCards = useMemo(() => {
    const totalActive = profiles.filter((p) => p.is_active).length;
    const totalVerified = profiles.filter((p) => p.is_verified).length;
    const totalFollowers = profiles.reduce((sum, p) => sum + p.total_followers, 0);
    const totalEarnings = profiles.reduce((sum, p) => sum + p.total_earnings, 0);

    return [
      {
        title: "Total Influencers",
        value: profiles.length,
        color: "text-blue-700",
        bg: "bg-blue-100",
      },
      {
        title: "Active Influencers",
        value: totalActive,
        color: "text-green-700",
        bg: "bg-green-100",
      },
      {
        title: "Verified Influencers",
        value: totalVerified,
        color: "text-[#F53F7A]",
        bg: "bg-[#F53F7A]/10",
      },
      {
        title: "Total Followers",
        value: totalFollowers.toLocaleString(),
        color: "text-purple-700",
        bg: "bg-purple-100",
      },
    ];
  }, [profiles]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Influencer Profiles</h1>
          <p className="text-sm text-gray-500">
            Manage influencer profiles and content creators
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-2 bg-[#F53F7A] text-white px-4 py-2 rounded-lg hover:bg-[#F53F7A]/90 transition"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          {showForm ? "Cancel" : "Add Influencer"}
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <div
            key={card.title}
            className="bg-white border border-gray-100 rounded-xl shadow-sm p-4 flex flex-col gap-2"
          >
            <span className="text-sm font-medium text-gray-500">{card.title}</span>
            <span className={`text-2xl font-bold ${card.color}`}>{card.value}</span>
          </div>
        ))}
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {editingProfile ? `Editing ${editingProfile.name}` : "Add New Influencer"}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={formState.name}
                  onChange={(e) => handleFormChange("name", e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F53F7A]"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Username *
                </label>
                <input
                  type="text"
                  value={formState.username}
                  onChange={(e) => handleFormChange("username", e.target.value.toLowerCase())}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F53F7A]"
                  placeholder="e.g., johndoe"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Bio
              </label>
              <textarea
                value={formState.bio}
                onChange={(e) => handleFormChange("bio", e.target.value)}
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F53F7A]"
                placeholder="Short bio about the influencer..."
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Instagram Handle
                </label>
                <input
                  type="text"
                  value={formState.instagram_handle}
                  onChange={(e) => handleFormChange("instagram_handle", e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F53F7A]"
                  placeholder="@username"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  YouTube Handle
                </label>
                <input
                  type="text"
                  value={formState.youtube_handle}
                  onChange={(e) => handleFormChange("youtube_handle", e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F53F7A]"
                  placeholder="@channel"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  TikTok Handle
                </label>
                <input
                  type="text"
                  value={formState.tiktok_handle}
                  onChange={(e) => handleFormChange("tiktok_handle", e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F53F7A]"
                  placeholder="@username"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Twitter Handle
                </label>
                <input
                  type="text"
                  value={formState.twitter_handle}
                  onChange={(e) => handleFormChange("twitter_handle", e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F53F7A]"
                  placeholder="@username"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Contact Email
                </label>
                <input
                  type="email"
                  value={formState.contact_email}
                  onChange={(e) => handleFormChange("contact_email", e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F53F7A]"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Contact Phone
                </label>
                <input
                  type="tel"
                  value={formState.contact_phone}
                  onChange={(e) => handleFormChange("contact_phone", e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F53F7A]"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Website URL
                </label>
                <input
                  type="url"
                  value={formState.website_url}
                  onChange={(e) => handleFormChange("website_url", e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F53F7A]"
                  placeholder="https://"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Total Followers
                </label>
                <input
                  type="number"
                  value={formState.total_followers}
                  onChange={(e) => handleFormChange("total_followers", e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F53F7A]"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Influencer Code
                </label>
                <input
                  type="text"
                  value={formState.influencer_code}
                  onChange={(e) => handleFormChange("influencer_code", e.target.value.toUpperCase())}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F53F7A]"
                  placeholder="JOHN1234"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Commission Rate (%)
                </label>
                <input
                  type="number"
                  value={formState.commission_rate}
                  onChange={(e) => handleFormChange("commission_rate", e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F53F7A]"
                  min="0"
                  max="100"
                  step="0.01"
                />
              </div>
            </div>

            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formState.is_verified}
                  onChange={(e) => handleFormChange("is_verified", e.target.checked)}
                  className="h-4 w-4 text-[#F53F7A] border-gray-300 rounded focus:ring-[#F53F7A]"
                />
                <span className="text-sm font-medium text-gray-700">Verified</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formState.is_active}
                  onChange={(e) => handleFormChange("is_active", e.target.checked)}
                  className="h-4 w-4 text-[#F53F7A] border-gray-300 rounded focus:ring-[#F53F7A]"
                />
                <span className="text-sm font-medium text-gray-700">Active</span>
              </label>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-2">
                {error}
              </div>
            )}

            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-[#F53F7A] text-white hover:bg-[#F53F7A]/90 transition disabled:opacity-60"
                disabled={submitting}
              >
                {submitting ? "Saving..." : editingProfile ? "Update Profile" : "Create Profile"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <input
          type="text"
          placeholder="Search by name, username, handle, or code..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full md:w-96 border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#F53F7A]"
        />
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className="border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#F53F7A]"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
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

      {/* Profiles Table */}
      <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Influencer
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Social Media
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Stats
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Commission
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
                    Loading profiles…
                  </td>
                </tr>
              ) : filteredProfiles.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-gray-400">
                    No influencer profiles found.
                  </td>
                </tr>
              ) : (
                filteredProfiles.map((profile) => (
                  <tr key={profile.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-gray-900">
                            {profile.name}
                          </span>
                          {profile.is_verified && (
                            <span className="text-blue-500" title="Verified">✓</span>
                          )}
                        </div>
                        <span className="text-xs text-gray-500">@{profile.username}</span>
                        {profile.influencer_code && (
                          <span className="text-xs font-mono text-[#F53F7A] mt-1">
                            {profile.influencer_code}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex flex-col gap-1">
                        {profile.instagram_handle && (
                          <span className="text-gray-600">IG: {profile.instagram_handle}</span>
                        )}
                        {profile.youtube_handle && (
                          <span className="text-gray-600">YT: {profile.youtube_handle}</span>
                        )}
                        {profile.tiktok_handle && (
                          <span className="text-gray-600">TT: {profile.tiktok_handle}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div className="flex flex-col">
                        <span>{profile.total_followers.toLocaleString()} followers</span>
                        <span className="text-gray-500">{profile.total_posts} posts</span>
                        <span className="text-gray-500">{profile.total_products_promoted} products</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex flex-col">
                        <span className="text-gray-900">{profile.commission_rate}%</span>
                        <span className="text-green-600">
                          ₹{profile.total_earnings.toLocaleString()}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          profile.is_active
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {profile.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-medium space-x-3">
                      <button
                        onClick={() => toggleActiveStatus(profile)}
                        className={`${
                          profile.is_active
                            ? "text-amber-600 hover:text-amber-700"
                            : "text-green-600 hover:text-green-700"
                        }`}
                      >
                        {profile.is_active ? "Deactivate" : "Activate"}
                      </button>
                      <button
                        onClick={() => startEdit(profile)}
                        className="text-[#F53F7A] hover:text-[#F53F7A]/80"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(profile)}
                        className="text-red-600 hover:text-red-700"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

