"use client";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";

// Define route-to-title mapping (must match Sidebar links)
const pageTitleMap: Record<string, string> = {
  Dashboard: "Dashboard",
  OrderMang: "Order Management",
  UserMang: "User Management",
  ProductMang: "Product Catalog",
  CatMang: "Inventory Management",
  CouponManagement: "Coupon Management",
  Settings: "App Settings",
  Support: "Support Chat",
  // Add more as needed
};

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const pathname = usePathname();
  const safePath = pathname ?? "";

  // Extract the page key after /admin/
  const pageKey = safePath.split("/admin/")[1]?.split("/")[0] || "";

  // Use the mapped title or fallback
  const pageName = pageTitleMap[pageKey] || "Admin Panel";

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar Wrapper - Hidden on mobile (width 0), visible on desktop */}
      <div className="md:w-64 flex-shrink-0 hidden md:block">
        <Sidebar />
      </div>

      {/* Mobile Sidebar is handled internally by the Sidebar component using fixed positioning */}
      <div className="md:hidden">
        <Sidebar />
      </div>

      <div className="flex-1 flex flex-col h-full w-full overflow-hidden">
        <Header pageName={pageName} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 md:pb-6">{children}</main>
      </div>
    </div>
  );
}
