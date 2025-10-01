"use client";

import React, { useEffect, useState } from "react";
import { LogOut, Home, Users, Package, HandHeart, TrendingUp } from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { supabase } from "../../../lib/supabase";

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    revenue: 0,
    users: 0,
    products: 0,
    orders: 0,
  });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      // Total revenue
      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select("total_amount, order_number, created_at, status, user_id");
      // Total users
      const { count: usersCount } = await supabase
        .from("users")
        .select("id", { count: "exact", head: true });
      // Total products
      const { count: productsCount } = await supabase
        .from("products")
        .select("id", { count: "exact", head: true });
      // Total orders
      const { count: ordersCount } = await supabase
        .from("orders")
        .select("id", { count: "exact", head: true });
      let revenue = 0;
      if (orders && Array.isArray(orders)) {
        revenue = orders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
      }
      setStats({
        revenue,
        users: usersCount || 0,
        products: productsCount || 0,
        orders: ordersCount || 0,
      });

      // Fetch recent orders with user info
      const { data: ordersWithUser } = await supabase
        .from("orders")
        .select("id, order_number, total_amount, status, created_at, user:users(name, email)")
        .order("created_at", { ascending: false })
        .limit(5);
      setRecentOrders(ordersWithUser || []);

      // Fetch top products by quantity sold
      const { data: orderItems } = await supabase
        .from("order_items")
        .select("product_id, product_name, quantity");
      // Aggregate in JS
      const productMap: Record<string, { product_id: string, product_name: string, total_sold: number }> = {};
      (orderItems || []).forEach((item: any) => {
        if (!productMap[item.product_id]) {
          productMap[item.product_id] = {
            product_id: item.product_id,
            product_name: item.product_name,
            total_sold: 0,
          };
        }
        productMap[item.product_id].total_sold += item.quantity || 0;
      });
      const topProductsArr = Object.values(productMap)
        .sort((a, b) => b.total_sold - a.total_sold)
        .slice(0, 5);
      setTopProducts(topProductsArr);

      setLoading(false);
    };
    fetchStats();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("adminId");
    router.push("/auth/Login");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="h-8 w-8 text-gray-800">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center px-4 py-2 text-sm font-medium text-red-600 hover:text-red-800"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Logout
        </button>
      </div>

      {/* Dashboard Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-lg p-4 shadow flex items-center gap-4">
          <div className="bg-[#F53F7A]/10 p-3 rounded-full"><Home className="text-[#F53F7A]" size={28} /></div>
          <div>
            <p className="text-gray-500 text-sm">Total Revenue</p>
            <h2 className="text-xl font-semibold">{stats.revenue.toLocaleString()}</h2>
          </div>
        </div>
        <div className="bg-white rounded-lg p-4 shadow flex items-center gap-4">
          <div className="bg-blue-100 p-3 rounded-full"><Users className="text-blue-600" size={28} /></div>
          <div>
            <p className="text-gray-500 text-sm">Total Users</p>
            <h2 className="text-xl font-semibold">{stats.users}</h2>
          </div>
        </div>
        <div className="bg-white rounded-lg p-4 shadow flex items-center gap-4">
          <div className="bg-green-100 p-3 rounded-full"><HandHeart className="text-green-600" size={28} /></div>
          <div>
            <p className="text-gray-500 text-sm">Total Products</p>
            <h2 className="text-xl font-semibold">{stats.products}</h2>
          </div>
        </div>
        <div className="bg-white rounded-lg p-4 shadow flex items-center gap-4">
          <div className="bg-yellow-100 p-3 rounded-full"><Package className="text-yellow-600" size={28} /></div>
          <div>
            <p className="text-gray-500 text-sm">Total Orders</p>
            <h2 className="text-xl font-semibold">{stats.orders}</h2>
          </div>
        </div>
      </div>

      {/* Recent Orders Table */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><Package className="text-yellow-600" size={20}/> Recent Orders</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order #</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {recentOrders.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-8 text-gray-400">No recent orders.</td></tr>
              ) : (
                recentOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap font-semibold">{order.order_number}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{order.user?.name || "N/A"}</div>
                      <div className="text-xs text-gray-500">{order.user?.email || "N/A"}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{order.total_amount?.toLocaleString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        order.status === 'approved' ? 'bg-green-100 text-green-800' :
                        order.status === 'rejected' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">
                      {order.created_at ? new Date(order.created_at).toLocaleDateString() : "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top Products Section */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><TrendingUp className="text-[#F53F7A]" size={20}/> Top Products</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Sold</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {topProducts.length === 0 ? (
                <tr><td colSpan={2} className="text-center py-8 text-gray-400">No data.</td></tr>
              ) : (
                topProducts.map((prod) => (
                  <tr key={prod.product_id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{prod.product_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{prod.total_sold}</td>
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
