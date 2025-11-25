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
        .select('role')
        .eq('id', authData.user.id)
        .single();

      if (userError) {
        toast.error("Failed to fetch user data!");
        setIsLoading(false);
        return;
      }

      // Check if user has admin role
      if (userData.role === 'admin') {
        toast.success("Login successful! Welcome admin.");
        router.push('/admin/Dashboard');
      } else {
        toast.error("Access denied! Admin privileges required.");
        // Sign out the user since they don't have admin access
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
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="animate-spin h-6 w-6 text-[#000000]" />
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row-reverse w-full bg-white h-screen p-1 justify-center">
      {/* Login Form */}
      <div className="md:w-2/4 md:h-full h-3/4 flex justify-center items-center p-8">
        <div className="w-full bg-white rounded-xl p-8 md:max-w-md space-y-6 md:shadow-none shadow shadow-[#343434]/30">
          <div className="flex justify-center space-x-4 items-center">
            <Logo />
            <h2 className="text-2xl font-bold text-[#000000] tracking-tight"></h2>
          </div>

          <p className="text-center text-sm text-[#343434] mb-4">
            Please log in to access your dashboard.
          </p>

          <div>
            <label htmlFor="email" className="text-[#343434] font-medium">
              Email
            </label>
            <input
              type="email"
              id="email"
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full mt-2 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#F53F7A] transition-all"
            />
          </div>

          <div>
            <label htmlFor="password" className="text-[#343434] font-medium">
              Password
            </label>
            <div className="relative flex items-center">
              <input
                type={passwordVisible ? "text" : "password"}
                id="password"
                placeholder="Enter Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full mt-2 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#F53F7A] transition-all"
              />
              <Eye
                className="absolute right-3 top-[20px] text-[#888] cursor-pointer"
                onClick={togglePasswordVisibility}
              />
            </div>
          </div>


          <button
            onClick={handleLogin}
            disabled={isLoading}
            className="w-full py-3 bg-gradient-to-r from-[#F53F7A] to-[#ff784e] text-white font-semibold rounded-lg hover:opacity-90 transition duration-300 flex items-center justify-center"
          >
            {isLoading ? (
              <Loader2 className="animate-spin h-5 w-5 text-white" />
            ) : (
              "Login"
            )}
          </button>
        </div>
      </div>

      {/* Side Image */}
      {/* <div className="hidden md:flex w-3/4 h-full relative items-center justify-center overflow-hidden rounded-r-3xl">
        <Image
          src="/help-needy.jpg"
          alt="login page image"
          fill
          className="object-cover rounded-r-3xl"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#000000]/70 rounded-r-3xl" />
      </div> */}

      <ToastContainer />
    </div>
  );
};

export default LoginPage;
