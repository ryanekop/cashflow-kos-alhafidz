import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Cashflow Kos Alhafidz",
  description: "Sistem pembayaran kas dan WiFi Kos Alhafidz",
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <div className="flex min-h-screen bg-[#f8f9fb] overflow-x-hidden">
          <Sidebar />
          <main className="flex-1 min-w-0 lg:ml-60 p-4 pb-20 lg:p-8 lg:pb-8">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
