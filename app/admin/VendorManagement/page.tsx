"use client";
import React, { useState, useEffect, useRef } from "react";
import { supabase } from "../../../lib/supabase";
import { uploadFile } from "../../../lib/uploadUtils";

interface Vendor {
  id: string;
  name: string;
  email: string;
  is_active: boolean;
  location?: string;
  phone?: string;
  profilePhoto?: string;
}

const VendorManagement = () => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [modalVisible, setModalVisible] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    is_active: true,
    location: "",
    phone: "",
    profilePhoto: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchVendors();
  }, []);

  const fetchVendors = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("vendors")
      .select("id, user_id, business_name, location, is_verified, profile_image_url")
      .order("created_at", { ascending: false });
    if (error) {
      console.error("Error fetching vendors:", error);
    }
    // Map vendors table schema to UI Vendor interface for compatibility
    const mapped = (data || []).map((v: any) => ({
      id: v.id,
      name: v.business_name,
      email: "",
      is_active: !!v.is_verified,
      location: v.location || "",
      phone: "",
      profilePhoto: v.profile_image_url || "",
    })) as Vendor[];
    setVendors(mapped);
    setLoading(false);
  };

  const handleAddVendor = () => {
    setEditingVendor(null);
    setFormData({
      name: "",
      email: "",
      password: "",
      is_active: true,
      location: "",
      phone: "",
      profilePhoto: "",
    });
    setModalVisible(true);
  };

  const handleEditVendor = (vendor: Vendor) => {
    setEditingVendor(vendor);
    setFormData({
      name: vendor.name,
      email: vendor.email,
      password: "",
      is_active: vendor.is_active,
      location: vendor.location || "",
      phone: vendor.phone || "",
      profilePhoto: vendor.profilePhoto || "",
    });
    setModalVisible(true);
  };

  const handleDeleteVendor = async (vendor: Vendor) => {
    if (typeof window !== 'undefined' && !window.confirm(`Delete vendor "${vendor.name}"? This action cannot be undone.`)) return;
    
    try {
      setSubmitting(true);
      const { error } = await supabase.from("vendors").delete().eq("id", vendor.id);
      
      if (error) {
        console.error("Error deleting vendor:", error);
        alert(`Error deleting vendor: ${error.message || 'Unknown error'}`);
        return;
      }
      
      setVendors(prev => prev.filter(v => v.id !== vendor.id));
      alert("Vendor deleted successfully");
    } catch (error: any) {
      console.error("Error:", error);
      alert(`An error occurred while deleting vendor: ${error.message || 'Unknown error'}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.name.trim()) {
      alert("Please enter vendor name");
      return;
    }
    if (!formData.email.trim()) {
      alert("Please enter vendor email");
      return;
    }
    if (!editingVendor && !formData.password.trim()) {
      alert("Please enter vendor password");
      return;
    }
    
    setSubmitting(true);
    if (editingVendor) {
      // Update vendor in the vendors table
      const { error } = await supabase.from("vendors").update({
        name: formData.name,
        email: formData.email,
        is_active: formData.is_active,
        location: formData.location,
        phone: formData.phone,
        profilePhoto: formData.profilePhoto,
      }).eq("id", editingVendor.id);
      setSubmitting(false);
      if (!error) {
        alert("Vendor updated successfully!");
        setModalVisible(false);
        fetchVendors();
      } else {
        console.error("Error updating vendor:", error);
        alert(`Error updating vendor: ${error.message || 'Unknown error'}`);
      }
    } else {
      // Add new vendor - use API route to create authenticated user
      try {
        const response = await fetch('/api/auth/create-user', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: formData.email,
            password: formData.password,
            phone: formData.phone,
            name: formData.name,
            role: "vendor",
            is_active: formData.is_active,
            location: formData.location,
            profilePhoto: formData.profilePhoto,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          console.error("API error:", result.error);
          alert(`Error creating vendor: ${result.error || 'Unknown error'}`);
          setSubmitting(false);
          return;
        }

        alert("Vendor created successfully!");
        setSubmitting(false);
        setModalVisible(false);
        fetchVendors();
      } catch (error: any) {
        console.error("Error creating vendor:", error);
        alert(`Error creating vendor: ${error.message || 'Network error occurred'}`);
        setSubmitting(false);
      }
    }
  };

  const filteredVendors = vendors.filter((vendor) => {
    const matchesSearch =
      vendor.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vendor.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vendor.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vendor.phone?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "All" ||
      (statusFilter === "Active" && vendor.is_active) ||
      (statusFilter === "Inactive" && !vendor.is_active);
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Vendor Management</h1>
        <button
          onClick={handleAddVendor}
          className="bg-[#F53F7A] text-white px-5 py-2 rounded-lg font-medium hover:bg-[#F53F7A]/90 transition"
        >
          + Add New Vendor
        </button>
      </div>
      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <input
            type="text"
            className="w-full md:w-64 px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#F53F7A]"
            placeholder="Search vendors..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <div className="flex flex-wrap gap-3">
            <select
              className="py-2 px-4 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#F53F7A]"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="All">All Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
            <button
              className="py-2 px-4 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
              onClick={() => {
                setSearchTerm("");
                setStatusFilter("All");
              }}
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>
      {/* Vendor Table */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Profile</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr><td colSpan={7} className="text-center py-8 text-gray-400">Loading...</td></tr>
              ) : filteredVendors.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-8 text-gray-400">No vendors found.</td></tr>
              ) : (
                filteredVendors.map((vendor) => (
                  <tr key={vendor.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      {vendor.profilePhoto ? (
                        <img 
                          src={vendor.profilePhoto} 
                          alt={vendor.name}
                          className="h-10 w-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                          <span className="text-gray-500 text-sm font-medium">
                            {vendor.name?.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{vendor.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{vendor.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{vendor.location || "-"}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{vendor.phone || "-"}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${vendor.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                        {vendor.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        className="text-blue-600 hover:underline mr-3"
                        onClick={() => handleEditVendor(vendor)}
                        disabled={submitting}
                      >Edit</button>
                      <button
                        className="text-red-600 hover:underline"
                        onClick={() => handleDeleteVendor(vendor)}
                        disabled={submitting}
                      >Delete</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      {/* Add/Edit Vendor Modal */}
      {modalVisible && (
        <div className="fixed inset-0 backdrop-blur-sm bg-white/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 relative">
            <button
              onClick={() => setModalVisible(false)}
              className="absolute top-3 right-3 text-gray-500 hover:text-red-500 text-xl"
            >
              &times;
            </button>
            <h2 className="text-2xl font-semibold text-[#F53F7A] mb-6 text-center">
              {editingVendor ? 'Edit Vendor' : 'Add New Vendor'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Profile Photo Upload Section */}
              <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
                <div className="mb-4">
                  {formData.profilePhoto ? (
                    <div className="relative">
                      <img 
                        src={formData.profilePhoto} 
                        alt="Profile Preview" 
                        className="h-24 w-24 rounded-full object-cover border-4 border-white shadow-lg" 
                      />
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, profilePhoto: "" })}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 transition-colors"
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <div className="h-24 w-24 rounded-full bg-gray-200 flex items-center justify-center border-4 border-white shadow-lg">
                      <svg className="h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="text-center">
                  <label htmlFor="vendor-profile-photo-upload" className="cursor-pointer bg-[#F53F7A] text-white px-6 py-2 rounded-lg hover:bg-[#F53F7A]/90 transition-colors font-medium">
                    {uploadingPhoto ? "Uploading..." : formData.profilePhoto ? "Change Photo" : "Upload Profile Photo"}
                  </label>
                  <input
                    type="file"
                    id="vendor-profile-photo-upload"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setUploadingPhoto(true);
                        try {
                          const result = await uploadFile(file, 'avatars', 'profiles');
                          if (result.error) {
                            alert(`Error uploading photo: ${result.error}`);
                            return;
                          }
                          setFormData({ ...formData, profilePhoto: result.url });
                        } catch (error) {
                          console.error("Error uploading photo:", error);
                          alert("Error uploading photo");
                        } finally {
                          setUploadingPhoto(false);
                        }
                      }
                    }}
                    className="hidden"
                  />
                  <p className="text-sm text-gray-500 mt-2">
                    JPG, PNG or WebP. Max size 10MB.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-gray-800 mb-1">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:ring-2 focus:ring-[#F53F7A] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-800 mb-1">Email (Optional)</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:ring-2 focus:ring-[#F53F7A] focus:outline-none"
                  />
                </div>
                {!editingVendor && (
                  <div>
                    <label className="block text-sm font-medium text-gray-800 mb-1">Password (Optional)</label>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={e => setFormData({ ...formData, password: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:ring-2 focus:ring-[#F53F7A] focus:outline-none"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-800 mb-1">Location (Optional)</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={e => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:ring-2 focus:ring-[#F53F7A] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-800 mb-1">Phone (Optional)</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:ring-2 focus:ring-[#F53F7A] focus:outline-none"
                  />
                </div>

              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                  className="h-5 w-5 text-[#F53F7A] border-gray-300 rounded"
                />
                <span className="text-sm text-gray-600">
                  {formData.is_active ? "Vendor is active" : "Vendor is inactive"}
                </span>
              </div>
              <div className="pt-4">
                <button
                  type="submit"
                  className="w-full bg-[#F53F7A] hover:bg-[#F53F7A]/90 text-white font-medium py-2.5 rounded-md"
                  disabled={submitting}
                >
                  {submitting ? 'Saving...' : (editingVendor ? 'Update Vendor' : 'Add Vendor')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorManagement; 