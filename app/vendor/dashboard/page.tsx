"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import { Package, ShoppingCart, TrendingUp, DollarSign, AlertCircle } from "lucide-react";
import Link from "next/link";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function VendorDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [vendor, setVendor] = useState<any>(null);
  const [stats, setStats] = useState({
    totalProducts: 0,
    activeProducts: 0,
    totalOrders: 0,
    pendingOrders: 0,
    totalRevenue: 0,
    monthlyRevenue: 0,
  });

  useEffect(() => {
    checkAuthAndLoadData();
  }, []);

  const checkAuthAndLoadData = async () => {
    try {
      // Check if user is authenticated
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        router.push("/auth/Login");
        return;
      }

      // Check user role
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("role, vendor_id, is_active")
        .eq("id", user.id)
        .single();

      if (userError || !userData) {
        router.push("/auth/Login");
        return;
      }

      if (userData.role !== "vendor") {
        toast.error("Access denied. Vendor access required.");
        router.push("/auth/Login");
        return;
      }

      if (!userData.is_active) {
        toast.error("Your vendor account is inactive. Please contact support.");
        return;
      }

      // Load vendor data
      if (userData.vendor_id) {
        const { data: vendorData, error: vendorError } = await supabase
          .from("vendors")
          .select("*")
          .eq("id", userData.vendor_id)
          .single();

        if (!vendorError && vendorData) {
          setVendor(vendorData);
          loadStats(vendorData.id);
        }
      }
    } catch (error: any) {
      console.error("Error:", error);
      router.push("/auth/Login");
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async (vendorId: string) => {
    try {
      // Get product stats
      const { data: products, error: productsError } = await supabase
        .from("products")
        .select("id, is_active")
        .eq("vendor_id", vendorId);

      if (!productsError && products) {
        setStats(prev => ({
          ...prev,
          totalProducts: products.length,
          activeProducts: products.filter((p: any) => p.is_active).length,
        }));
      }

      // Get order stats (assuming orders have vendor_id or order_items have vendor_id)
      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select("id, status, total_amount, created_at")
        .eq("vendor_id", vendorId);

      if (!ordersError && orders) {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        
        setStats(prev => ({
          ...prev,
          totalOrders: orders.length,
          pendingOrders: orders.filter((o: any) => o.status === "pending" || o.status === "processing").length,
          totalRevenue: orders.reduce((sum: number, o: any) => sum + (parseFloat(o.total_amount) || 0), 0),
          monthlyRevenue: orders
            .filter((o: any) => new Date(o.created_at) >= startOfMonth)
            .reduce((sum: number, o: any) => sum + (parseFloat(o.total_amount) || 0), 0),
        }));
      }
    } catch (error: any) {
      console.error("Error loading stats:", error);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/auth/Login");
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F53F7A]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Vendor Dashboard</h1>
              <p className="text-sm text-gray-600">Welcome, {vendor?.name || "Vendor"}</p>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900 border border-gray-300 rounded-lg"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Products</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalProducts}</p>
              </div>
              <Package className="w-12 h-12 text-blue-500" />
            </div>
            <Link href="/vendor/products" className="text-sm text-blue-600 hover:text-blue-700 mt-4 inline-block">
              Manage Products →
            </Link>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Products</p>
                <p className="text-2xl font-bold text-green-600 mt-1">{stats.activeProducts}</p>
              </div>
              <TrendingUp className="w-12 h-12 text-green-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Orders</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalOrders}</p>
              </div>
              <ShoppingCart className="w-12 h-12 text-purple-500" />
            </div>
            <Link href="/vendor/orders" className="text-sm text-purple-600 hover:text-purple-700 mt-4 inline-block">
              View Orders →
            </Link>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending Orders</p>
                <p className="text-2xl font-bold text-orange-600 mt-1">{stats.pendingOrders}</p>
              </div>
              <AlertCircle className="w-12 h-12 text-orange-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  ₹{stats.totalRevenue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </p>
              </div>
              <DollarSign className="w-12 h-12 text-green-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Monthly Revenue</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  ₹{stats.monthlyRevenue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </p>
              </div>
              <TrendingUp className="w-12 h-12 text-blue-500" />
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              href="/vendor/products/add"
              className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-[#F53F7A] hover:bg-[#F53F7A]/5 transition text-center"
            >
              <Package className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <p className="font-medium text-gray-900">Add New Product</p>
            </Link>
            <Link
              href="/vendor/products"
              className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-[#F53F7A] hover:bg-[#F53F7A]/5 transition text-center"
            >
              <Package className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <p className="font-medium text-gray-900">Manage Products</p>
            </Link>
            <Link
              href="/vendor/orders"
              className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-[#F53F7A] hover:bg-[#F53F7A]/5 transition text-center"
            >
              <ShoppingCart className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <p className="font-medium text-gray-900">View Orders</p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

