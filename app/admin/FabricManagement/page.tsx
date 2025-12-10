"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "../../../lib/supabase";
import { Plus, Edit2, Trash2, Search } from "lucide-react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

interface Fabric {
  id: string;
  name: string;
  description?: string;
  code?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const FabricManagementPage = () => {
  const [fabrics, setFabrics] = useState<Fabric[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingFabric, setEditingFabric] = useState<Fabric | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    code: "",
    is_active: true,
  });

  useEffect(() => {
    fetchFabrics();
  }, []);

  const fetchFabrics = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("fabrics")
        .select("*")
        .order("name", { ascending: true });

      if (error) throw error;
      setFabrics(data || []);
    } catch (error: any) {
      console.error("Error fetching fabrics:", error);
      toast.error("Failed to fetch fabrics");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (fabric?: Fabric) => {
    if (fabric) {
      setEditingFabric(fabric);
      setFormData({
        name: fabric.name,
        description: fabric.description || "",
        code: fabric.code || "",
        is_active: fabric.is_active,
      });
    } else {
      setEditingFabric(null);
      setFormData({
        name: "",
        description: "",
        code: "",
        is_active: true,
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingFabric(null);
    setFormData({
      name: "",
      description: "",
      code: "",
      is_active: true,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error("Please enter a fabric name");
      return;
    }

    try {
      if (editingFabric) {
        // Update existing fabric
        const { error } = await supabase
          .from("fabrics")
          .update({
            name: formData.name.trim(),
            description: formData.description.trim() || null,
            code: formData.code.trim() || null,
            is_active: formData.is_active,
          })
          .eq("id", editingFabric.id);

        if (error) throw error;
        toast.success("Fabric updated successfully");
      } else {
        // Create new fabric
        const { error } = await supabase
          .from("fabrics")
          .insert({
            name: formData.name.trim(),
            description: formData.description.trim() || null,
            code: formData.code.trim() || null,
            is_active: formData.is_active,
          });

        if (error) throw error;
        toast.success("Fabric created successfully");
      }

      handleCloseModal();
      fetchFabrics();
    } catch (error: any) {
      console.error("Error saving fabric:", error);
      if (error.code === "23505") {
        toast.error("A fabric with this name or code already exists");
      } else {
        toast.error("Failed to save fabric");
      }
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"? This will remove the fabric from all products using it.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from("fabrics")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Fabric deleted successfully");
      fetchFabrics();
    } catch (error: any) {
      console.error("Error deleting fabric:", error);
      toast.error("Failed to delete fabric. It may be in use by products.");
    }
  };

  const handleToggleActive = async (fabric: Fabric) => {
    try {
      const { error } = await supabase
        .from("fabrics")
        .update({ is_active: !fabric.is_active })
        .eq("id", fabric.id);

      if (error) throw error;
      toast.success(`Fabric ${!fabric.is_active ? "activated" : "deactivated"} successfully`);
      fetchFabrics();
    } catch (error: any) {
      console.error("Error toggling fabric status:", error);
      toast.error("Failed to update fabric status");
    }
  };

  const filteredFabrics = fabrics.filter(
    (fabric) =>
      fabric.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (fabric.code && fabric.code.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (fabric.description && fabric.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Fabric Management</h1>
              <p className="text-sm text-gray-500 mt-1">Manage fabric types for products</p>
            </div>
            <button
              onClick={() => handleOpenModal()}
              className="bg-[#F53F7A] text-white px-4 py-2 rounded-lg hover:bg-[#E02E6A] transition flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Fabric
            </button>
          </div>

          {/* Search Bar */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search fabrics by name, code, or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F53F7A] focus:border-transparent"
              />
            </div>
          </div>

          {/* Fabrics Table */}
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#F53F7A]"></div>
              <p className="mt-2 text-gray-500">Loading fabrics...</p>
            </div>
          ) : filteredFabrics.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No fabrics found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Name</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Code</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Description</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Created</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFabrics.map((fabric) => (
                    <tr key={fabric.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="font-medium text-gray-900">{fabric.name}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-sm text-gray-600">{fabric.code || "-"}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-sm text-gray-600 max-w-md truncate">
                          {fabric.description || "-"}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => handleToggleActive(fabric)}
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            fabric.is_active
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {fabric.is_active ? "Active" : "Inactive"}
                        </button>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-sm text-gray-500">
                          {new Date(fabric.created_at).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleOpenModal(fabric)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(fabric.id, fabric.name)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {editingFabric ? "Edit Fabric" : "Add New Fabric"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fabric Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#F53F7A] focus:border-transparent"
                  placeholder="e.g., Cotton, Silk, Polyester"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fabric Code <span className="text-gray-500">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#F53F7A] focus:border-transparent"
                  placeholder="e.g., FAB-COT-001"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description <span className="text-gray-500">(Optional)</span>
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#F53F7A] focus:border-transparent"
                  placeholder="Describe the fabric..."
                  rows={3}
                />
              </div>

              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-4 h-4 text-[#F53F7A] border-gray-300 rounded focus:ring-[#F53F7A]"
                  />
                  <span className="text-sm font-medium text-gray-700">Active</span>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#F53F7A] text-white rounded-lg hover:bg-[#E02E6A] transition"
                >
                  {editingFabric ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ToastContainer position="top-right" />
    </div>
  );
};

export default FabricManagementPage;

