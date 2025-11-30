"use client";

import { useRouter } from "next/navigation";
import { CheckCircle } from "lucide-react";
import Logo from "../../../../components/Logo";

export default function RegistrationSuccessPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
        <div className="flex justify-center mb-4">
          <Logo />
        </div>
        <div className="flex justify-center mb-6">
          <CheckCircle className="w-20 h-20 text-green-500" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Registration Submitted!</h1>
        <p className="text-gray-600 mb-6">
          Thank you for your interest in becoming a vendor. We have received your registration request and will review it shortly.
        </p>
        <p className="text-sm text-gray-500 mb-6">
          You will receive an email notification once your application is reviewed. This process typically takes 2-3 business days.
        </p>
        <button
          onClick={() => router.push("/")}
          className="w-full py-2 bg-[#F53F7A] text-white rounded-lg hover:bg-[#F53F7A]/90"
        >
          Return to Home
        </button>
      </div>
    </div>
  );
}

