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
  Package
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import Logo from "./Logo";

const Sidebar = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const router = useRouter();
  const path = usePathname();
  const pageName = path.split("/").pop();

  const menuItems = [
    {
      name: "Dashboard",
      icon: Home,
      link: "/admin/Dashboard",
      path: "Dashboard",
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
  ];

  const handleLogout = () => {
    router.push("/auth/Login");
  };

  const handleMenuClick = () => setIsSidebarOpen(false);

  return (
    <div>
      {/* Toggle Button for Mobile */}
      <button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="md:hidden p-2 fixed top-4 left-4 z-50 bg-white shadow-lg rounded-full"
      >
        <Menu size={24} />
      </button>

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-white border-r border-gray-200 shadow-xl z-40 transform transition-transform duration-300 flex flex-col ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0`}
      >
        {/* Close on mobile */}
        <div
          onClick={() => setIsSidebarOpen(false)}
          className="md:hidden absolute top-4 right-4 cursor-pointer"
        >
          <X size={28} className="text-gray-700" />
        </div>

        {/* Logo */}
        <div className="p-6 border-b border-gray-100 flex items-center justify-center">
          {/* <img src="/logo.jpg" alt="Logo" height={50} /> */}
          <Logo />
        </div>

        {/* Navigation */}
        <nav className="flex flex-col py-6 px-4 space-y-2 flex-1">
          {menuItems.map((item, index) => {
            const isActive = pageName === item.path;
            return (
              <Link
                key={index}
                href={item.link}
                onClick={handleMenuClick}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-sm font-medium ${
                  isActive
                    ? "bg-[#F53F7A]/10 text-[#F53F7A] font-semibold"
                    : "text-gray-700 hover:bg-[#F53F7A]/5 hover:text-[#F53F7A]"
                }`}
              >
                <item.icon size={20} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Logout Button */}
        <div className="p-6 border-t border-gray-100">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 text-sm text-[#F53F7A] hover:text-[#F53F7A]/80 transition w-full"
          >
            <LogOut size={20} />
            Log out
          </button>
        </div>
      </aside>

      {/* Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-40 z-30 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default Sidebar;
