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
  });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [couponStats, setCouponStats] = useState({
    totalUses: 0,
    totalValue: 0,
  });
  const [abandonedCarts, setAbandonedCarts] = useState({
    count: 0,
    potentialRevenue: 0,
    list: [] as any[],
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
  const [expandedCartId, setExpandedCartId] = useState<string | null>(null);

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

      setStats({
        revenue,
        users: usersCount || 0,
        products: productsCount || 0,
        orders: ordersCount || 0,
        productsToday: productsTodayCount || 0,
      });
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

      // Abandoned Carts stats (Fetch all, not filtered by date range)
      // Simple query without joins first
      const { data: abandonedData, error: abandonedError } = await supabase
        .from("abandoned_carts")
        .select("*")
        .order("abandoned_at", { ascending: false })
        .limit(50);

      if (abandonedError) {
        console.error("Error fetching abandoned carts:", abandonedError);
      }

      console.log("Abandoned carts raw data:", abandonedData);
      console.log("Abandoned carts count:", abandonedData?.length || 0);

      // Fetch users separately
      let usersMap: Record<string, any> = {};
      try {
        const { data: usersData } = await supabase
          .from("users")
          .select("id, name, email, phone")
          .limit(1000);
        
        usersMap = (usersData || []).reduce((acc: Record<string, any>, user: any) => {
          acc[user.id] = user;
          return acc;
        }, {});
        console.log("Users fetched:", Object.keys(usersMap).length);
      } catch (e) {
        console.error("Error fetching users:", e);
      }

      if (abandonedData && abandonedData.length > 0) {
        // Merge user data with abandoned carts
        const cartsWithUsers = abandonedData.map((cart: any) => {
          const user = cart.user_id ? usersMap[cart.user_id] : null;
          return {
            ...cart,
            user: user
          };
        });

        // Show all abandoned carts, not just unrecovered ones
        const activeAbandoned = cartsWithUsers.filter(c => !c.recovered);
        const totalPotential = activeAbandoned.reduce((sum, c) => sum + (Number(c.cart_total) || 0), 0);

        setAbandonedCarts({
          count: activeAbandoned.length,
          potentialRevenue: totalPotential,
          list: cartsWithUsers.slice(0, 5)
        });
      } else {
        console.log("No abandoned carts found");
        setAbandonedCarts({
          count: 0,
          potentialRevenue: 0,
          list: []
        });
      }

      setLoading(false);
    };
    fetchStats();
  }, [dateRange]);

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem("adminId");
    }
    router.push("/auth/Login");
  };

  const toggleCartExpansion = (cartId: string) => {
    setExpandedCartId(expandedCartId === cartId ? null : cartId);
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
          { label: "Abandoned Carts", value: abandonedCarts.count, icon: Package, color: "text-orange-600", bg: "bg-orange-100" },
          { label: "Redemptions", value: couponStats.totalUses, icon: Percent, color: "text-purple-600", bg: "bg-purple-100" },
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

      {/* Abandoned Carts Table */}
      <div className="grid grid-cols-1 gap-8 mb-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
          <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/30">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <Package className="text-orange-500" size={20} /> Recent Abandoned Carts
            </h2>
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-orange-600 bg-orange-50 px-3 py-1 rounded-full border border-orange-100">
                Potential: ₹{abandonedCarts.potentialRevenue.toLocaleString()}
              </span>
              <button className="text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors">View All</button>
            </div>
          </div>
          <div className="overflow-x-auto flex-1">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50/50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Cart Items</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Value</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Abandoned At</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-50">
                {abandonedCarts.list.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-12 text-gray-400">No abandoned carts found.</td></tr>
                ) : (
                  abandonedCarts.list.map((cart) => (
                    <React.Fragment key={cart.id}>
                      <tr className="hover:bg-gray-50/80 transition-colors group cursor-pointer" onClick={() => toggleCartExpansion(cart.id)}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900 group-hover:text-[#F53F7A] transition-colors">
                            {cart.user?.name || cart.user?.email || "Guest User"}
                          </div>
                          {cart.user?.email && cart.user?.name && (
                            <div className="text-xs text-gray-400">{cart.user.email}</div>
                          )}
                          {cart.user?.phone && (
                            <div className="text-xs text-gray-500 mt-1">📞 {cart.user.phone}</div>
                          )}
                          {!cart.user && cart.user_id && (
                            <div className="text-xs text-gray-400 mt-1">User ID: {cart.user_id.substring(0, 8)}...</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-700">{cart.item_count} items</span>
                            <svg
                              className={`w-4 h-4 text-gray-400 transition-transform ${expandedCartId === cart.id ? 'rotate-180' : ''}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">₹{Number(cart.cart_total).toLocaleString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-400 font-medium">
                          {cart.abandoned_at ? new Date(cart.abandoned_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {cart.notified_at ? (
                            <span className="px-2 py-1 text-xs font-medium text-blue-700 bg-blue-50 rounded-full border border-blue-100">
                              Notified
                            </span>
                          ) : (
                            <span className="px-2 py-1 text-xs font-medium text-amber-700 bg-amber-50 rounded-full border border-amber-100">
                              Pending
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {cart.user?.phone && (
                              <a
                                href={`https://wa.me/${cart.user.phone.replace(/\D/g, '')}?text=Hi ${encodeURIComponent(cart.user.name || 'there')}, we noticed you left some beautiful items in your cart. Complete your order now!`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 px-3 py-1.5 bg-green-50 text-green-700 border border-green-200 rounded-full text-xs font-semibold hover:bg-green-100 transition-colors"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                                </svg>
                                WhatsApp
                              </a>
                            )}
                          </div>
                        </td>
                      </tr>
                      {/* Expanded Cart Items Row */}
                      {expandedCartId === cart.id && cart.cart_items && (
                        <tr className="bg-gray-50/50">
                          <td colSpan={6} className="px-6 py-4">
                            <div className="space-y-3">
                              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Cart Items:</p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {(Array.isArray(cart.cart_items) ? cart.cart_items : []).map((item: any, idx: number) => (
                                  <div key={idx} className="flex items-center gap-3 bg-white p-3 rounded-lg border border-gray-100">
                                    {item.image && (
                                      <img
                                        src={item.image}
                                        alt={item.name}
                                        className="w-12 h-12 object-cover rounded-md"
                                      />
                                    )}
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                                      <div className="flex items-center gap-2 text-xs text-gray-500">
                                        {item.size && <span>Size: {item.size}</span>}
                                        {item.color && <span>Color: {item.color}</span>}
                                        <span className="font-medium text-gray-700">₹{item.price}</span>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
