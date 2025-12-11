import type { Metadata } from "next";
import "./globals.css";
import { AppProvider } from "./context/useContext";
import { Toaster } from "react-hot-toast";

export const metadata: Metadata = {

  title: "Only 2 You",
  description: "Admin Panel",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`antialiased`}
      >
        <AppProvider>
          {children}
          <Toaster position="top-right" />
        </AppProvider>
      </body>
    </html>
  );
}
