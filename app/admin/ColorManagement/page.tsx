"use client";
import React, { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { Pencil, Trash2 } from "lucide-react";

interface Color {
  id: string;
  name: string;
  hex_code: string;
  created_at?: string;
  updated_at?: string;
}

const ColorManagementPage = () => {
  const [colors, setColors] = useState<Color[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", hex_code: "" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchColors();
  }, []);

  const fetchColors = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("colors").select("*").order("created_at", { ascending: false });
    if (!error) setColors(data || []);
    setLoading(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleAddOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.name.trim() || !/^#[0-9A-Fa-f]{6}$/.test(form.hex_code)) {
      setError("Please enter a valid color name and hex code (e.g., #FF0000)");
      return;
    }
    setSubmitting(true);
    if (editingId) {
      // Update
      const { error } = await supabase.from("colors").update({
        name: form.name,
        hex_code: form.hex_code,
      }).eq("id", editingId);
      if (!error) {
        setEditingId(null);
        setForm({ name: "", hex_code: "" });
        fetchColors();
      } else {
        setError("Failed to update color");
      }
    } else {
      // Add
      const { error } = await supabase.from("colors").insert({
        name: form.name,
        hex_code: form.hex_code,
      });
      if (!error) {
        setForm({ name: "", hex_code: "" });
        fetchColors();
      } else {
        setError("Failed to add color");
      }
    }
    setSubmitting(false);
  };

  const handleEdit = (color: Color) => {
    setEditingId(color.id);
    setForm({ name: color.name, hex_code: color.hex_code });
  };

  const handleDelete = async (id: string) => {
    if (typeof window !== 'undefined' && !window.confirm("Delete this color?")) return;
    setSubmitting(true);
    const { error } = await supabase.from("colors").delete().eq("id", id);
    if (!error) fetchColors();
    setSubmitting(false);
  };

  return (
    <div className="p-6 max-w-xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Color Management</h1>
      </div>
      {/* Add Color Form */}
      <form onSubmit={handleAddOrUpdate} className="bg-white rounded-lg shadow p-5 mb-6 flex flex-col gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Color Name *</label>
          <input
            name="name"
            type="text"
            placeholder="Enter color name (e.g., Red, Blue)"
            value={form.name}
            onChange={handleInputChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#F53F7A] focus:outline-none"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Hex Color Code *</label>
          <input
            name="hex_code"
            type="text"
            placeholder="#000000"
            value={form.hex_code}
            onChange={handleInputChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#F53F7A] focus:outline-none"
            required
            maxLength={7}
          />
        </div>
        {/* Color Preview */}
        {form.hex_code && /^#[0-9A-Fa-f]{6}$/.test(form.hex_code) && (
          <div className="flex items-center gap-3 mt-2">
            <div className="h-10 w-10 rounded-full border-2 border-gray-200" style={{ background: form.hex_code }} />
            <span className="font-medium text-gray-700">{form.name || "Color Preview"}</span>
            <span className="text-gray-500">{form.hex_code}</span>
          </div>
        )}
        {error && <div className="text-red-500 text-sm mt-1">{error}</div>}
        <div className="flex gap-3 mt-2">
          <button
            type="submit"
            className="bg-[#F53F7A] text-white px-6 py-2 rounded-lg font-medium hover:bg-[#F53F7A]/90 transition"
            disabled={submitting}
          >
            {editingId ? "Update Color" : "Add Color"}
          </button>
          {editingId && (
            <button
              type="button"
              className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg font-medium hover:bg-gray-300 transition"
              onClick={() => { setEditingId(null); setForm({ name: "", hex_code: "" }); setError(""); }}
              disabled={submitting}
            >
              Cancel
            </button>
          )}
        </div>
      </form>
      {/* Color List */}
      <div className="flex flex-col gap-4">
        {loading ? (
          <div className="text-center text-gray-400 py-8">Loading...</div>
        ) : colors.length === 0 ? (
          <div className="text-center text-gray-400 py-8">No colors found.</div>
        ) : (
          colors.map((color) => (
            <div key={color.id} className="flex items-center justify-between bg-white rounded-xl shadow p-4">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-full border-2 border-gray-200" style={{ background: color.hex_code }} />
                <div>
                  <div className="font-semibold text-gray-900">{color.name}</div>
                  <div className="text-gray-500 text-sm">{color.hex_code}</div>
                  {color.created_at && (
                    <div className="text-xs text-gray-400">Created: {new Date(color.created_at).toLocaleDateString()}</div>
                  )}
                  {color.updated_at && (
                    <div className="text-xs text-gray-400">Updated: {new Date(color.updated_at).toLocaleDateString()}</div>
                  )}
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  className="text-blue-600 hover:text-blue-800"
                  onClick={() => handleEdit(color)}
                  title="Edit"
                  disabled={submitting}
                >
                  <Pencil className="h-5 w-5" />
                </button>
                <button
                  className="text-red-600 hover:text-red-800"
                  onClick={() => handleDelete(color.id)}
                  title="Delete"
                  disabled={submitting}
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ColorManagementPage; 