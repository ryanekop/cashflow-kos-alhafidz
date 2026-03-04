import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import ThemeProvider from "@/components/ThemeProvider";

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
    <html lang="id" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{
          __html: `(function(){try{var t=localStorage.getItem("theme");if(t==="dark")document.documentElement.classList.add("dark")}catch(e){}})();`
        }} />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ThemeProvider>
          <div className="flex min-h-screen bg-[#f8f9fb] dark:bg-[#0f0f23] overflow-x-hidden transition-colors duration-300">
            <Sidebar />
            <main className="flex-1 min-w-0 pt-14 p-4 pb-20 lg:pt-8 lg:p-8 lg:pb-8 sidebar-margin">
              {children}
            </main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
