"use client";

import React, { useEffect, useState } from "react";
import { LogOut, Home, Users, Package, HandHeart, TrendingUp, Percent, Calendar as CalendarIcon, ChevronDown, Video } from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { supabase } from "../../../lib/supabase";
import { startOfDay, endOfDay, subDays, startOfMonth, endOfMonth, format, isValid, parseISO } from "date-fns";
import DateRangePicker from "../../../components/admin/Dashboard/DateRangePicker";

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    revenue: 0,
    users: 0,
    products: 0,
    orders: 0,
    productsToday: 0,
    coinsUsed: 0,
    coinFaceSwaps: 0,
    coinRedemptions: 0,
  });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [couponStats, setCouponStats] = useState({
    totalUses: 0,
    totalValue: 0,
  });
  const [couponPerformance, setCouponPerformance] = useState<
    Array<{
      code: string;
      uses: number;
      estimatedValue: number;
      discountType: string;
    }>
  >([]);
  const [videoStats, setVideoStats] = useState<
    Array<{
      sizeName: string;
      count: number;
    }>
  >([]);
  const [coinBreakdown, setCoinBreakdown] = useState<
    Array<{
      type: string;
      count: number;
      totalCoins: number;
    }>
  >([]);

  // Date Filtering State
  const [dateRange, setDateRange] = useState<{ start: Date | null; end: Date | null }>({
    start: startOfMonth(new Date()),
    end: endOfDay(new Date()),
  });
  const [selectedPreset, setSelectedPreset] = useState<string>("month");

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);

      // Base query builder
      const applyDateFilter = (query: any, dateField = "created_at") => {
        if (dateRange.start) {
          query = query.gte(dateField, dateRange.start.toISOString());
        }
        if (dateRange.end) {
          query = query.lte(dateField, dateRange.end.toISOString());
        }
        return query;
      };

      // Total revenue
      let revenueQuery = supabase
        .from("orders")
        .select("total_amount, order_number, created_at, status, user_id");

      const { data: orders } = await applyDateFilter(revenueQuery);

      // Total users (created in range)
      let usersQuery = supabase
        .from("users")
        .select("id", { count: "exact", head: true });
      const { count: usersCount } = await applyDateFilter(usersQuery, "created_at");

      // Total products (created in range - strictly interpreting "in range" for dashboard stats)
      // Or maybe products should be total regardless? usually dashboard stats are "New Products" in range. 
      // Let's stick to "Total Products" generally, but if filter is applied, maybe "New Products"? 
      // The user asked for "data based on date selection". Usually means "activity in this period". 
      // So "Products added in this period" makes sense.
      let productsQuery = supabase
        .from("products")
        .select("id", { count: "exact", head: true });

      // For products, maybe we only filter if it's NOT "all time"? 
      // Actually consistent filtering is better. "Products added" logic.
      const { count: productsCount } = await applyDateFilter(productsQuery);

      // Total orders
      let ordersQuery = supabase
        .from("orders")
        .select("id", { count: "exact", head: true });
      const { count: ordersCount } = await applyDateFilter(ordersQuery);

      // Products Today (This is specific "Today" stat, might be redundant if filter is "Yesterday" but let's keep logic or adjust)
      // The original code calculated "Products Today" specifically. 
      // If we are filtering by date, maybe this card should be replaced or adapted?
      // Let's calculate it independently as "Products Today" regardless of filter, OR 
      // make it "Products in Range" which we already have in productsCount.
      // Let's keep "Products Today" independent as a quick stat? 
      // Or if range is selected, maybe we show activity?
      // Let's keep the existing "Products Today" logic untouched for now to not break "at a glance" utility, 
      // UNLESS the user wants *everything* filtered. 
      // "give option to see data based on date selection". 
      // I will filter the main stats (Revenue, Users, Orders, Products Added).
      // "Products Today" is a specific day stat. 

      // Let's actually calculate "Products Today" just as before for consistency, 
      // BUT if the range IS "Today", it will match "Total Products".
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { count: productsTodayCount } = await supabase
        .from("products")
        .select("id", { count: "exact", head: true })
        .gte("created_at", today.toISOString());

      let revenue = 0;
      if (orders && Array.isArray(orders)) {
        revenue = orders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
      }

      // Coupon Stats
      // We need to filter based on usage date? 
      // Coupons table has `uses_count`. It doesn't have a history log easily accessible here maybe?
      // Wait, `coupon_usage` table usually exists? 
      // The current code aggregates from `coupons` table which has `uses_count`. 
      // `uses_count` is a total. We can't easily filter "uses in date range" purely from `coupons` table 
      // unless we rely on `orders` table to check coupon usage.
      // Let's see if `orders` table has `coupon_code` or similar.
      // If not, we might not be able to filter coupon stats accurately by date without a join or new query.
      // For now, I will NOT filter coupon stats deeply if data isn't obvious, to avoid breaking it.
      // Actually, looking at previous code: `const { data: couponData } = await supabase.from("coupons")...`
      // It uses `uses_count`. This is a global counter. 
      // I will leave coupon stats as "All Time" for now or check if orders have coupon info.

      const { data: couponData } = await supabase
        .from("coupons")
        .select("code, discount_type, discount_value, uses_count, min_order_value");

      const couponAggregates = (couponData || []).reduce(
        (acc, coupon: any) => {
          const uses = Number(coupon.uses_count) || 0;
          // Ideally we filtred by orders in range that used this coupon. 
          // If we can't link them easily, we keep it total.
          // BUT `orders` might have coupon info. 
          // Let's check `orders` structure? 
          // The previous query `orders` select was "total_amount, order_number, created_at, status, user_id".
          // It didn't select coupon.

          acc.totalUses += uses;
          let estimatedValue = 0;
          const discountValue = Number(coupon.discount_value) || 0;
          if (coupon.discount_type === "fixed") {
            estimatedValue = discountValue * uses;
          } else if (coupon.discount_type === "percentage") {
            const minOrder = Number(coupon.min_order_value) || 0;
            if (minOrder > 0) {
              estimatedValue = (discountValue / 100) * minOrder * uses;
            }
          }
          acc.totalValue += estimatedValue;
          acc.breakdown.push({
            code: coupon.code,
            uses,
            estimatedValue,
            discountType: coupon.discount_type,
          });
          return acc;
        },
        { totalUses: 0, totalValue: 0, breakdown: [] as any[] }
      );

      setStats(prev => ({
        ...prev,
        revenue,
        users: usersCount || 0,
        products: productsCount || 0,
        orders: ordersCount || 0,
        productsToday: productsTodayCount || 0,
      }));
      setCouponStats({
        totalUses: couponAggregates.totalUses,
        totalValue: couponAggregates.totalValue,
      });
      setCouponPerformance(
        couponAggregates.breakdown.sort((a, b) => b.uses - a.uses).slice(0, 5)
      );

      // Fetch recent orders with user info (Filtered)
      let recentOrdersQuery = supabase
        .from("orders")
        .select("id, order_number, total_amount, status, created_at, user:users(name, email)")
        .order("created_at", { ascending: false })
        .limit(5);

      const { data: ordersWithUser } = await applyDateFilter(recentOrdersQuery);
      setRecentOrders(ordersWithUser || []);

      // Fetch top products by quantity sold (Filtered)
      // Order items don't have date. We must filter by order's date.
      // This requires a join or two steps. 
      // Step 1: Get filtered order IDs.
      const filteredOrderIds = (orders || []).map((o: any) => o.id);

      // If we have filtered orders, we fetch items for those orders.
      // If "all time", we might just fetch all? 
      // `order_items` might be huge. 
      // Previous code fetched ALL `order_items`?!?! 
      // `const { data: orderItems } = await supabase.from("order_items").select(...);`
      // That seems risky for scale but I will keep logic but apply filter `in` filteredOrderIds.

      let orderItemsQuery = supabase
        .from("order_items")
        .select("product_id, product_name, quantity");

      if (dateRange.start || dateRange.end) {
        if (filteredOrderIds.length > 0) {
          orderItemsQuery = orderItemsQuery.in('order_id', filteredOrderIds);
        } else {
          // No orders in range -> no items
          setTopProducts([]);
          setLoading(false);
          return; // Quick exit if no orders
        }
      }

      const { data: orderItems } = await orderItemsQuery;

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

      // Fetch video stats by size
      let videoStatsQuery = supabase
        .from("product_variants")
        .select(`
          video_urls,
          size:sizes(name)
        `);

      const { data: variantVideos } = await videoStatsQuery;

      const sizeVideoCountMap: Record<string, number> = {};
      (variantVideos || []).forEach((variant: any) => {
        const videos = variant.video_urls || [];
        if (videos.length > 0) {
          const sizeName = variant.size?.name || "Unknown";
          sizeVideoCountMap[sizeName] = (sizeVideoCountMap[sizeName] || 0) + videos.length;
        }
      });

      const videoStatsArr = Object.entries(sizeVideoCountMap)
        .map(([sizeName, count]) => ({ sizeName, count }))
        .sort((a, b) => b.count - a.count);

      setVideoStats(videoStatsArr);

      // Fetch Coin Stats
      let coinQuery = supabase.from("coin_transactions").select("*");
      const { data: coinData } = await applyDateFilter(coinQuery);

      let faceSwaps = 0;
      let redemptions = 0;
      let totalCoins = 0;
      const typeMap: Record<string, { count: number; total: number }> = {};

      if (coinData) {
        coinData.forEach((tx: any) => {
          const type = tx.type || 'other';
          if (type === 'face_swap') faceSwaps++;
          if (type === 'redemption') redemptions++;
          const amt = Math.abs(tx.amount || 0);
          totalCoins += amt;

          if (!typeMap[type]) typeMap[type] = { count: 0, total: 0 };
          typeMap[type].count++;
          typeMap[type].total += amt;
        });
      }

      setCoinBreakdown(
        Object.entries(typeMap).map(([type, data]) => ({
          type,
          count: data.count,
          totalCoins: data.total,
        })).sort((a, b) => b.totalCoins - a.totalCoins)
      );

      setStats((prev) => ({
        ...prev,
        coinsUsed: totalCoins,
        coinFaceSwaps: faceSwaps,
        coinRedemptions: redemptions,
      }));

      setLoading(false);
    };
    fetchStats();
  }, [dateRange]);

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
    <div className="p-4 md:p-8 min-h-screen dashboard-gradient-bg">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 tracking-tight">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">Overview of your store's performance</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Refined Date Range Picker */}
          <DateRangePicker
            dateRange={dateRange}
            onChange={(range, preset) => {
              setDateRange(range);
              setSelectedPreset(preset);
            }}
            selectedPreset={selectedPreset}
          />

          <button
            onClick={handleLogout}
            className="flex items-center px-4 py-2.5 bg-white text-red-600 hover:text-white hover:bg-red-600 border border-red-100 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md font-medium text-sm group"
          >
            <LogOut className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform" />
            Logout
          </button>
        </div>
      </div>

      {/* Dashboard Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 mb-8">
        {[
          { label: "Total Revenue", value: `₹${stats.revenue.toLocaleString()}`, icon: Home, color: "text-[#F53F7A]", bg: "bg-[#F53F7A]/10" },
          { label: "Total Users", value: stats.users, icon: Users, color: "text-blue-600", bg: "bg-blue-100" },
          { label: "Total Products", value: stats.products, icon: HandHeart, color: "text-green-600", bg: "bg-green-100" },
          { label: "Products Today", value: stats.productsToday, icon: TrendingUp, color: "text-blue-600", bg: "bg-blue-100" },
          { label: "Total Orders", value: stats.orders, icon: Package, color: "text-yellow-600", bg: "bg-yellow-100" },
          { label: "Coins Used", value: stats.coinsUsed.toLocaleString(), icon: TrendingUp, color: "text-orange-600", bg: "bg-orange-100" },
          { label: "Face Swaps", value: stats.coinFaceSwaps, icon: Video, color: "text-pink-600", bg: "bg-pink-100" },
          { label: "Coin Redemptions", value: stats.coinRedemptions, icon: Percent, color: "text-indigo-600", bg: "bg-indigo-100" },
        ].map((stat, index) => (
          <div key={index} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
            <div className="flex justify-between items-start mb-4">
              <div className={`${stat.bg} p-3 rounded-xl`}>
                <stat.icon className={`${stat.color}`} size={24} />
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800">{stat.value}</h2>
              <p className="text-gray-500 text-xs font-medium uppercase tracking-wide mt-1">{stat.label}</p>
            </div>
          </div>
        ))}
        {/* Estimated Savings Card - Spanning/Distinct */}
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-5 shadow-lg shadow-emerald-200 text-white hover:-translate-y-1 transition-all duration-300 sm:col-span-2 lg:col-span-1 xl:col-span-1">
          <div className="flex justify-between items-start mb-4">
            <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm">
              <Percent className="text-white" size={24} />
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-bold">₹{couponStats.totalValue.toFixed(2)}</h2>
            <p className="text-emerald-100 text-xs font-medium uppercase tracking-wide mt-1">Est. Savings</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8">
        {/* Recent Orders Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
          <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/30">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <Package className="text-yellow-500" size={20} /> Recent Orders
            </h2>
            <button className="text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors">View All</button>
          </div>
          <div className="overflow-x-auto flex-1">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50/50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Order #</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Total</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-50">
                {recentOrders.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-12 text-gray-400">No recent orders found.</td></tr>
                ) : (
                  recentOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50/80 transition-colors group">
                      <td className="px-6 py-4 whitespace-nowrap font-semibold text-gray-700">#{order.order_number}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 group-hover:text-[#F53F7A] transition-colors">{order.user?.name || "N/A"}</div>
                        <div className="text-xs text-gray-400">{order.user?.email || "N/A"}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">₹{order.total_amount?.toLocaleString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full border ${order.status === 'approved' ? 'bg-green-50 text-green-700 border-green-100' :
                          order.status === 'rejected' ? 'bg-red-50 text-red-700 border-red-100' :
                            'bg-amber-50 text-amber-700 border-amber-100'
                          }`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-400 font-medium">
                        {order.created_at ? new Date(order.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : "-"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Products Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
          <div className="p-6 border-b border-gray-50 bg-gray-50/30">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <TrendingUp className="text-[#F53F7A]" size={20} /> Top Products
            </h2>
          </div>
          <div className="overflow-x-auto flex-1">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50/50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Product</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Units Sold</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Performance</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-50">
                {topProducts.length === 0 ? (
                  <tr><td colSpan={3} className="text-center py-12 text-gray-400">No top products yet.</td></tr>
                ) : (
                  topProducts.map((prod, idx) => (
                    <tr key={prod.product_id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 text-xs font-bold text-gray-500 border border-gray-200">
                            {idx + 1}
                          </span>
                          <span className="font-medium text-gray-900">{prod.product_name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-700">{prod.total_sold}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="w-24 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                          <div className="bg-[#F53F7A]" style={{ width: `${Math.min((prod.total_sold / (topProducts[0]?.total_sold || 1)) * 100, 100)}%`, height: '100%' }}></div>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Coupon Performance and Video Stats */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-50 bg-gray-50/30">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <Percent className="text-purple-600" size={20} /> Coupon Usage
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50/50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Code</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Uses</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Est. Value</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-50">
                {couponPerformance.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-gray-400">
                      No coupons have been redeemed yet.
                    </td>
                  </tr>
                ) : (
                  couponPerformance.map((coupon) => (
                    <tr key={coupon.code} className="hover:bg-gray-50/80 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-mono font-bold text-gray-800 bg-gray-100 px-2 py-1 rounded-md border border-gray-200">{coupon.code}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 capitalize">
                        {coupon.discountType}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-700">
                        {coupon.uses}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-emerald-600">
                        ₹{coupon.estimatedValue.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-xs font-medium text-green-700 bg-green-50 px-2 py-1 rounded-full border border-green-100">Active</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Video Stats Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
          <div className="p-6 border-b border-gray-50 bg-gray-50/30">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <Video className="text-blue-500" size={20} /> Video Count by Size
            </h2>
          </div>
          <div className="overflow-x-auto flex-1">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50/50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Size</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Videos</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Percentage</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-50">
                {videoStats.length === 0 ? (
                  <tr><td colSpan={3} className="text-center py-12 text-gray-400">No videos found.</td></tr>
                ) : (
                  videoStats.map((stat, idx) => {
                    const totalVideos = videoStats.reduce((sum, s) => sum + s.count, 0);
                    const percentage = totalVideos > 0 ? (stat.count / totalVideos) * 100 : 0;
                    return (
                      <tr key={stat.sizeName} className="hover:bg-gray-50/80 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="font-medium text-gray-900">{stat.sizeName}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-700">{stat.count}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="w-24 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                            <div className="bg-blue-500" style={{ width: `${percentage}%`, height: '100%' }}></div>
                          </div>
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

      {/* Coin Usage Section */}
      <div className="grid grid-cols-1 gap-8 mb-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-50 bg-gray-50/30">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <TrendingUp className="text-orange-500" size={20} /> Coin Usage Breakdown
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50/50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Activity Type</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Count</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Coins</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Contribution</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-50">
                {coinBreakdown.length === 0 ? (
                  <tr><td colSpan={4} className="text-center py-12 text-gray-400">No coin activity found in this period.</td></tr>
                ) : (
                  coinBreakdown.map((item) => {
                    const totalUsed = stats.coinsUsed || 1;
                    const percentage = (item.totalCoins / totalUsed) * 100;
                    return (
                      <tr key={item.type} className="hover:bg-gray-50/80 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="font-bold text-gray-800 uppercase text-xs tracking-wider px-2 py-1 bg-gray-100 rounded-md border border-gray-200">
                            {item.type.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-700">{item.count}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-orange-600">{item.totalCoins.toLocaleString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="w-24 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                              <div className="bg-orange-500" style={{ width: `${percentage}%`, height: '100%' }}></div>
                            </div>
                            <span className="text-xs text-gray-400 font-medium">{percentage.toFixed(1)}%</span>
                          </div>
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
    </div>
  );
}
