"use client";

import { useTheme } from "@/components/ThemeProvider";
import { motion } from "framer-motion";

export default function Header() {
    const { isDark, toggleTheme } = useTheme();

    return (
        <header className="sticky top-0 z-40 bg-white/80 dark:bg-[#1a1a2e]/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700/50 -mx-4 lg:-mx-8 px-4 lg:px-8">
            <div className="flex items-center justify-between h-14">
                {/* Title */}
                <div className="flex items-center gap-2.5">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#4f6ef7]">
                        <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" /><path d="M3 5v14a2 2 0 0 0 2 2h16v-5" /><path d="M18 12a2 2 0 0 0 0 4h4v-4z" />
                    </svg>
                    <h1 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Cashflow Alhafidz</h1>
                </div>

                {/* Dark mode toggle */}
                <motion.button
                    onClick={toggleTheme}
                    className="relative w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-700/50 flex items-center justify-center text-gray-500 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600/50 transition-colors"
                    whileTap={{ scale: 0.9 }}
                    whileHover={{ rotate: 15 }}
                    title={isDark ? "Switch to light mode" : "Switch to dark mode"}
                >
                    <motion.div
                        key={isDark ? "moon" : "sun"}
                        initial={{ rotate: -90, opacity: 0, scale: 0.5 }}
                        animate={{ rotate: 0, opacity: 1, scale: 1 }}
                        exit={{ rotate: 90, opacity: 0, scale: 0.5 }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                    >
                        {isDark ? (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="5" />
                                <line x1="12" y1="1" x2="12" y2="3" />
                                <line x1="12" y1="21" x2="12" y2="23" />
                                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                                <line x1="1" y1="12" x2="3" y2="12" />
                                <line x1="21" y1="12" x2="23" y2="12" />
                                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                            </svg>
                        ) : (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                            </svg>
                        )}
                    </motion.div>
                </motion.button>
            </div>
        </header>
    );
}
