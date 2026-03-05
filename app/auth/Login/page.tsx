"use client";
import React, { useEffect, useState } from "react";
import { Eye, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { supabase } from "../../../lib/supabase";
import Logo from "../../components/Logo";

const LoginPage = () => {
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingUser, setIsCheckingUser] = useState(false);
  const router = useRouter();

  const togglePasswordVisibility = () => {
    setPasswordVisible(!passwordVisible);
  };

  const handleLogin = async () => {
    if (!email || !password) {
      toast.error("Please fill in all fields!");
      return;
    }

    setIsLoading(true);

    try {
      // Sign in with Supabase
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (authError) {
        toast.error(authError.message || "Authentication failed!");
        setIsLoading(false);
        return;
      }

      if (!authData.user) {
        toast.error("User not found!");
        setIsLoading(false);
        return;
      }

      // Fetch user role from the users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('role, vendor_id, is_active')
        .eq('id', authData.user.id)
        .single();

      if (userError) {
        toast.error("Failed to fetch user data!");
        setIsLoading(false);
        return;
      }

      // Check user role and redirect accordingly
      if (userData.role === 'admin') {
        toast.success("Login successful! Welcome admin.");
        router.push('/admin/Dashboard');
      } else if (userData.role === 'vendor') {
        if (!userData.is_active) {
          toast.error("Your vendor account is inactive. Please contact support.");
          await supabase.auth.signOut();
          return;
        }
        toast.success("Login successful! Welcome vendor.");
        router.push('/vendor/dashboard');
      } else {
        toast.error("Access denied! Invalid user role.");
        await supabase.auth.signOut();
      }

    } catch (error) {
      console.error('Login error:', error);
      toast.error("An unexpected error occurred!");
    } finally {
      setIsLoading(false);
    }
  };

  if (isCheckingUser) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <Loader2 className="animate-spin h-8 w-8 text-[#F53F7A]" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center p-4 auth-gradient relative overflow-hidden">
      {/* Decorative blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-pink-200/40 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-200/40 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md glass-card rounded-2xl p-8 md:p-10 shadow-2xl relative z-10 transition-all duration-300 hover:shadow-pink-500/10">
        <div className="flex flex-col items-center mb-8 space-y-2">
          <div className="transform hover:scale-105 transition-transform duration-300">
            <Logo />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mt-4 tracking-tight">Welcome Back</h1>
          <p className="text-gray-500 text-sm text-center">
            Sign in to access your admin dashboard
          </p>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-semibold text-gray-700 ml-1">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F53F7A]/20 focus:border-[#F53F7A] transition-all duration-200"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-semibold text-gray-700 ml-1">
              Password
            </label>
            <div className="relative">
              <input
                type={passwordVisible ? "text" : "password"}
                id="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F53F7A]/20 focus:border-[#F53F7A] transition-all duration-200 pr-10"
              />
              <button
                type="button"
                onClick={togglePasswordVisibility}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1"
              >
                {passwordVisible ? <Eye size={20} /> : <Eye size={20} className="stroke-[2.5px]" />}
              </button>
            </div>
          </div>

          <button
            onClick={handleLogin}
            disabled={isLoading}
            className="w-full py-3.5 bg-gradient-to-r from-[#F53F7A] to-[#ff784e] text-white font-semibold rounded-xl hover:opacity-95 hover:shadow-lg hover:shadow-pink-500/30 transform active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 group"
          >
            {isLoading ? (
              <Loader2 className="animate-spin h-5 w-5 text-white" />
            ) : (
              <>
                Sign In
              </>
            )}
          </button>
        </div>

        <div className="mt-8 text-center">
          <p className="text-xs text-gray-400">
            &copy; {new Date().getFullYear()} Only2U. All rights reserved.
          </p>
        </div>
      </div>

      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} newestOnTop closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover theme="light" />
    </div>
  );
};

export default LoginPage;
