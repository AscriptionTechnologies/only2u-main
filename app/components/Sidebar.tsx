"use client";
import Link from "next/link";
import { useState } from "react";
import {
  Home,
  Users,
  Menu,
  HandHeart,
  Contact,
  UserPlus,
  Bell,
  Settings2,
  FileCheck,
  LogOut,
  X,
  Palette,
  Package,
  MessageCircle,
  Percent,
  Ticket,
  Star,
  FileText,
  BarChart3,
  Archive,
  Sparkles
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import Logo from "./Logo";

const Sidebar = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const router = useRouter();
  const path = usePathname();
  const pageName = (path ?? "").split("/").pop();

  const menuItems = [
    {
      name: "Dashboard",
      icon: Home,
      link: "/admin/Dashboard",
      path: "Dashboard",
    },
    {
      name: "Talk with Data",
      icon: Sparkles,
      link: "/admin/DataChat",
      path: "DataChat",
    },
    {
      name: "Order Management",
      icon: Package,
      link: "/admin/OrderManagement",
      path: "OrderManagement",
    },
    {
      name: "Inventory Management",
      icon: Contact,
      link: "/admin/CategoryManagement",
      path: "CategoryManagement",
    },

    {
      name: "Fabric Management",
      icon: Palette,
      link: "/admin/FabricManagement",
      path: "FabricManagement",
    },
    {
      name: "User Management",
      icon: Users,
      link: "/admin/UserManagement",
      path: "UserManagement",
    },
    {
      name: "Vendor Management",
      icon: UserPlus,
      link: "/admin/VendorManagement",
      path: "VendorManagement",
    },
    {
      name: "Vendor Registrations",
      icon: FileCheck,
      link: "/admin/VendorRegistrationRequests",
      path: "VendorRegistrationRequests",
    },
    {
      name: "Vendor Q&A",
      icon: MessageCircle,
      link: "/admin/VendorQA",
      path: "VendorQA",
    },
    {
      name: "Coupon Management",
      icon: Percent,
      link: "/admin/CouponManagement",
      path: "CouponManagement",
    },
    {
      name: "Referral Codes",
      icon: Ticket,
      link: "/admin/ReferralManagement",
      path: "ReferralManagement",
    },
    {
      name: "Influencer Profiles",
      icon: Star,
      link: "/admin/InfluencerProfiles",
      path: "InfluencerProfiles",
    },
    {
      name: "Influencer Requests",
      icon: UserPlus,
      link: "/admin/InfluencerRequests",
      path: "InfluencerRequests",
    },
    {
      name: "Invoices & GST",
      icon: FileText,
      link: "/admin/InvoiceManagement",
      path: "InvoiceManagement",
    },
    {
      name: "Accounting Reports",
      icon: BarChart3,
      link: "/admin/AccountingReports",
      path: "AccountingReports",
    },
    {
      name: "Settings",
      icon: Settings2,
      link: "/admin/Settings",
      path: "Settings",
    },
    {
      name: "App Feedbacks",
      icon: HandHeart,
      link: "/admin/Feedback",
      path: "Feedback",
    },
    {
      name: "Support Chat",
      icon: MessageCircle,
      link: "/admin/Support",
      path: "Support",
    },
  ];

  const handleLogout = () => {
    router.push("/auth/Login");
  };

  const handleMenuClick = () => setIsSidebarOpen(false);

  return (
    <>
      {/* Toggle Button for Mobile - Only visible when sidebar is closed to avoid overlap */}
      {!isSidebarOpen && (
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="md:hidden p-2.5 fixed top-3 left-3 z-[100] bg-white/80 backdrop-blur-md shadow-lg rounded-xl border border-gray-200/50 text-gray-700 hover:text-[#F53F7A] transition-all active:scale-95"
          aria-label="Open Menu"
        >
          <Menu size={22} />
        </button>
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 w-72 bg-white/90 backdrop-blur-xl border-r border-gray-100 shadow-2xl z-[100] transform transition-transform duration-300 ease-out flex flex-col ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"
          } md:translate-x-0 md:static md:shadow-none md:z-auto`}
      >
        {/* Close on mobile */}
        <div className="md:hidden absolute top-4 right-4 z-[101]">
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="p-2 rounded-full bg-gray-50 text-gray-500 hover:bg-red-50 hover:text-red-500 transition-colors shadow-sm"
          >
            <X size={20} />
          </button>
        </div>

        {/* Logo */}
        <div className="h-20 flex items-center justify-center border-b border-gray-100/50">
          <div className="scale-90 transform transition-transform hover:scale-100 duration-300">
            <Logo />
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex flex-col flex-1 overflow-y-auto scrollbar-hide py-6 px-4 space-y-1">
          {menuItems.map((item, index) => {
            const isActive = pageName === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={index}
                href={item.link}
                onClick={handleMenuClick}
                className={`group flex items-center gap-3.5 px-4 py-3.5 rounded-2xl transition-all duration-200 text-sm font-medium relative overflow-hidden ${isActive
                  ? "bg-gradient-to-r from-[#F53F7A]/10 to-[#F53F7A]/5 text-[#F53F7A] font-semibold shadow-sm"
                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                  }`}
              >
                {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-1 bg-[#F53F7A] rounded-r-full" />}
                <Icon
                  size={20}
                  className={`transition-colors duration-200 ${isActive ? "text-[#F53F7A]" : "text-gray-400 group-hover:text-[#F53F7A]"}`}
                />
                <span className="relative z-10">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Logout Button */}
        <div className="p-4 border-t border-gray-100/50 bg-gray-50/30">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 text-sm text-gray-500 hover:text-red-600 hover:bg-red-50/50 px-4 py-3.5 rounded-2xl transition-all w-full font-medium group"
          >
            <LogOut size={20} className="text-gray-400 group-hover:text-red-500 transition-colors" />
            <span className="group-hover:translate-x-1 transition-transform">Log out</span>
          </button>
        </div>
      </aside>

      {/* Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-[90] md:hidden transition-all duration-300"
          onClick={() => setIsSidebarOpen(false)}
          aria-hidden="true"
        />
      )}
    </>
  );
};

export default Sidebar;
