"use client";

import React, { useState } from "react";
import { supabase } from "../../../lib/supabase";

interface Product {
  id: string;
  name: string;
  created_at: string;
}

const AddProductPage = () => {
  const [productName, setProductName] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!productName.trim()) {
      alert("Please enter a product name");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("products")
        .insert({
          name: productName.trim(),
          description: "",
          category_id: "", // Will be set later
          is_active: true,
          featured_type: null,
          like_count: 0,
          return_policy: "",
          vendor_name: "",
          alias_vendor: "",
        })
        .select("id")
        .single();

      if (error) {
        console.error("Error creating product:", error);
        alert("Error creating product");
        return;
      }

      setSuccess(true);
      setProductName("");
      
      // Reset success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error("Error:", error);
      alert("An error occurred while creating the product");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Add New Product</h1>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Product Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#F53F7A] focus:border-transparent"
                placeholder="Enter product name"
                required
              />
            </div>

            {success && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-green-800">Product created successfully!</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-[#F53F7A] text-white py-2 px-4 rounded-lg hover:bg-[#F53F7A]/90 transition-colors disabled:opacity-50"
              >
                {loading ? "Creating..." : "Create Product"}
              </button>
              <button
                type="button"
                onClick={() => setProductName("")}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Clear
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddProductPage;
