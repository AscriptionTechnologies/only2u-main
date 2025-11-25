"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "../../../lib/supabase";
import { Search, Plus, Trash2, Edit, Save } from "lucide-react";

interface Vendor {
  id: string;
  name: string;
  email: string;
  phone?: string;
  location?: string;
  is_active: boolean;
}

interface Product {
  id: string;
  name: string;
  description: string;
  category_id: string;
  is_active: boolean;
}

interface DraftOrder {
  id: string;
  vendor_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  status: string;
  created_at: string;
  vendor?: Vendor;
  product?: Product;
}

const DraftOrderPage = () => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [draftOrders, setDraftOrders] = useState<DraftOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [vendorSearch, setVendorSearch] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState(0);
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch vendors
      const { data: vendorsData, error: vendorsError } = await supabase
        .from("users")
        .select("id, name, email, phone, location, is_active")
        .eq("role", "vendor")
        .eq("is_active", true);

      if (vendorsError) {
        console.error("Error fetching vendors:", vendorsError);
      } else {
        setVendors(vendorsData || []);
      }

      // Fetch products
      const { data: productsData, error: productsError } = await supabase
        .from("products")
        .select("id, name, description, category_id, is_active")
        .eq("is_active", true);

      if (productsError) {
        console.error("Error fetching products:", productsError);
      } else {
        setProducts(productsData || []);
      }

      // Fetch draft orders with vendor and product details
      const { data: draftData, error: draftError } = await supabase
        .from("draft_orders")
        .select(`
          *,
          vendor:users(id, name, email, phone, location),
          product:products(id, name, description)
        `)
        .order("created_at", { ascending: false });

      if (draftError) {
        console.error("Error fetching draft orders:", draftError);
      } else {
        setDraftOrders(draftData || []);
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredVendors = vendors.filter(vendor =>
    vendor.name.toLowerCase().includes(vendorSearch.toLowerCase()) ||
    vendor.email.toLowerCase().includes(vendorSearch.toLowerCase())
  );

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(productSearch.toLowerCase()) ||
    product.description.toLowerCase().includes(productSearch.toLowerCase())
  );

  const handleAddDraftOrder = async () => {
    if (!selectedVendor || !selectedProduct) {
      alert("Please select both vendor and product");
      return;
    }

    if (quantity <= 0 || unitPrice <= 0) {
      alert("Please enter valid quantity and unit price");
      return;
    }

    setSubmitting(true);
    try {
      const totalPrice = quantity * unitPrice;
      
      const { data, error } = await supabase
        .from("draft_orders")
        .insert({
          vendor_id: selectedVendor.id,
          product_id: selectedProduct.id,
          quantity,
          unit_price: unitPrice,
          total_price: totalPrice,
          status: "draft",
        })
        .select(`
          *,
          vendor:users(id, name, email, phone, location),
          product:products(id, name, description)
        `)
        .single();

      if (error) {
        console.error("Error creating draft order:", error);
        alert("Error creating draft order");
        return;
      }

      setDraftOrders(prev => [data, ...prev]);
      setShowAddModal(false);
      setSelectedVendor(null);
      setSelectedProduct(null);
      setQuantity(1);
      setUnitPrice(0);
      alert("Draft order created successfully!");
    } catch (error) {
      console.error("Error:", error);
      alert("An error occurred while creating the draft order");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteDraftOrder = async (id: string) => {
    if (!confirm("Are you sure you want to delete this draft order?")) return;

    try {
      const { error } = await supabase
        .from("draft_orders")
        .delete()
        .eq("id", id);

      if (error) {
        console.error("Error deleting draft order:", error);
        alert("Error deleting draft order");
        return;
      }

      setDraftOrders(prev => prev.filter(draft => draft.id !== id));
      alert("Draft order deleted successfully!");
    } catch (error) {
      console.error("Error:", error);
      alert("An error occurred while deleting the draft order");
    }
  };

  const handleConvertToPurchaseOrder = async (draftId: string) => {
    try {
      const draftOrder = draftOrders.find(d => d.id === draftId);
      if (!draftOrder) return;

      // Create purchase order from draft
      const { data, error } = await supabase
        .from("purchase_orders")
        .insert({
          vendor_id: draftOrder.vendor_id,
          product_id: draftOrder.product_id,
          quantity: draftOrder.quantity,
          unit_price: draftOrder.unit_price,
          total_price: draftOrder.total_price,
          status: "pending",
        })
        .select()
        .single();

      if (error) {
        console.error("Error converting to purchase order:", error);
        alert("Error converting to purchase order");
        return;
      }

      // Delete the draft order
      await supabase
        .from("draft_orders")
        .delete()
        .eq("id", draftId);

      setDraftOrders(prev => prev.filter(d => d.id !== draftId));
      alert("Draft order converted to purchase order successfully!");
    } catch (error) {
      console.error("Error:", error);
      alert("An error occurred while converting the draft order");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F53F7A] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Draft Orders</h1>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-[#F53F7A] text-white px-4 py-2 rounded-lg hover:bg-[#F53F7A]/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Draft Order
          </button>
        </div>

        {/* Search and Filter Section */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Search & Filter</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Vendors
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  value={vendorSearch}
                  onChange={(e) => setVendorSearch(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F53F7A] focus:border-transparent"
                  placeholder="Search by vendor name or email..."
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Products
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F53F7A] focus:border-transparent"
                  placeholder="Search by product name or description..."
                />
              </div>
            </div>
          </div>
        </div>

        {/* Draft Orders Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vendor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Unit Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {draftOrders.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                      No draft orders found.
                    </td>
                  </tr>
                ) : (
                  draftOrders.map((draft) => (
                    <tr key={draft.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {draft.vendor?.name || "N/A"}
                          </div>
                          <div className="text-sm text-gray-500">
                            {draft.vendor?.email || "N/A"}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {draft.product?.name || "N/A"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {draft.quantity}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ₹{draft.unit_price}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        ₹{draft.total_price}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                          {draft.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(draft.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleConvertToPurchaseOrder(draft.id)}
                            className="text-green-600 hover:text-green-900 transition-colors"
                            title="Convert to Purchase Order"
                          >
                            <Save className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteDraftOrder(draft.id)}
                            className="text-red-600 hover:text-red-900 transition-colors"
                            title="Delete Draft Order"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add Draft Order Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold mb-4">Add Draft Order</h2>
              
              <div className="space-y-4">
                {/* Vendor Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Vendor <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      value={vendorSearch}
                      onChange={(e) => setVendorSearch(e.target.value)}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F53F7A] focus:border-transparent"
                      placeholder="Search vendors..."
                    />
                  </div>
                  <div className="mt-2 max-h-40 overflow-y-auto border border-gray-200 rounded-lg">
                    {filteredVendors.map((vendor) => (
                      <button
                        key={vendor.id}
                        onClick={() => setSelectedVendor(vendor)}
                        className={`w-full text-left px-3 py-2 hover:bg-gray-50 ${
                          selectedVendor?.id === vendor.id ? 'bg-[#F53F7A] text-white' : ''
                        }`}
                      >
                        <div className="font-medium">{vendor.name}</div>
                        <div className="text-sm text-gray-500">{vendor.email}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Product Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Product <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F53F7A] focus:border-transparent"
                      placeholder="Search products..."
                    />
                  </div>
                  <div className="mt-2 max-h-40 overflow-y-auto border border-gray-200 rounded-lg">
                    {filteredProducts.map((product) => (
                      <button
                        key={product.id}
                        onClick={() => setSelectedProduct(product)}
                        className={`w-full text-left px-3 py-2 hover:bg-gray-50 ${
                          selectedProduct?.id === product.id ? 'bg-[#F53F7A] text-white' : ''
                        }`}
                      >
                        <div className="font-medium">{product.name}</div>
                        <div className="text-sm text-gray-500">{product.description}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quantity and Price */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Quantity <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={quantity}
                      onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                      min="1"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#F53F7A] focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Unit Price (₹) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={unitPrice}
                      onChange={(e) => setUnitPrice(parseFloat(e.target.value) || 0)}
                      min="0"
                      step="0.01"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#F53F7A] focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Total Price Display */}
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="text-sm text-gray-600">Total Price:</div>
                  <div className="text-lg font-semibold text-gray-900">
                    ₹{(quantity * unitPrice).toFixed(2)}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddDraftOrder}
                  disabled={submitting}
                  className="px-4 py-2 bg-[#F53F7A] text-white rounded-lg hover:bg-[#F53F7A]/90 transition-colors disabled:opacity-50"
                >
                  {submitting ? "Creating..." : "Create Draft Order"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DraftOrderPage;
