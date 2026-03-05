"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAppContext } from "../context/useContext";
import { ArrowLeft, Bell, LogOut, User } from "lucide-react";

interface User {
  id: string;
  name: string;
  email: string;
}

const Header = ({ pageName }: { pageName: string }) => {
  const { user } = useAppContext() as { user: User | null };
  const [showDropdown, setShowDropdown] = useState(false);

  const router = useRouter();

  const toggleDropdown = () => {
    setShowDropdown((prev) => !prev);
  };

  const handleLogout = () => {
    console.log("Logout clicked");
  };

  return (
    <header className="flex justify-between items-center px-4 md:px-6 py-4 bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-30">
      <h1 className="text-xl pl-12 md:pl-0 flex items-center gap-3 font-[SairaSemibold] text-gray-800">
        <ArrowLeft size={20} className="hidden md:block cursor-pointer hover:text-[#F53F7A] transition-colors" onClick={() => router.back()} />
        {pageName}
      </h1>
    </header>
  );
};

export default Header;