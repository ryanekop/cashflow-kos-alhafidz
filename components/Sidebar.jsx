"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "@/components/ThemeProvider";

const navItems = [
    {
        name: "Dashboard",
        path: "/",
        icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="9" rx="1" /><rect x="14" y="3" width="7" height="5" rx="1" /><rect x="14" y="12" width="7" height="9" rx="1" /><rect x="3" y="16" width="7" height="5" rx="1" />
            </svg>
        ),
    },
    {
        name: "Riwayat",
        path: "/riwayat",
        icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
            </svg>
        ),
    },
    {
        name: "Isi WIFI",
        path: "/wifi",
        icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12.55a11 11 0 0 1 14.08 0" /><path d="M1.42 9a16 16 0 0 1 21.16 0" /><path d="M8.53 16.11a6 6 0 0 1 6.95 0" /><line x1="12" y1="20" x2="12.01" y2="20" />
            </svg>
        ),
    },
    {
        name: "Bayar",
        path: "/payment",
        icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="4" y="2" width="16" height="20" rx="2" /><line x1="8" y1="6" x2="16" y2="6" /><line x1="8" y1="10" x2="10" y2="10" /><line x1="14" y1="10" x2="16" y2="10" /><line x1="8" y1="14" x2="10" y2="14" /><line x1="14" y1="14" x2="16" y2="14" />
            </svg>
        ),
    },
    {
        name: "Admin",
        path: "/admin",
        icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
        ),
    },
];

// Desktop shows all items
const desktopItems = navItems;

export default function Sidebar() {
    const pathname = usePathname();
    const { isDark, toggleTheme, mounted } = useTheme();
    const [collapsed, setCollapsed] = useState(false);

    // persist collapsed state
    useEffect(() => {
        const saved = localStorage.getItem("sidebar-collapsed");
        if (saved === "true") setCollapsed(true);
    }, []);

    // Sync CSS variable with collapsed state
    useEffect(() => {
        document.documentElement.style.setProperty('--sidebar-width', collapsed ? '68px' : '240px');
    }, [collapsed]);

    const toggleCollapsed = () => {
        setCollapsed(prev => {
            const next = !prev;
            localStorage.setItem("sidebar-collapsed", String(next));
            return next;
        });
    };

    return (
        <>
            {/* ===== MOBILE: Top header bar + Bottom tab bar ===== */}

            {/* Mobile top bar with title + dark mode toggle */}
            <div className="lg:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-2.5 bg-white/95 dark:bg-[#1a1a2e]/95 backdrop-blur-md border-b border-gray-200 dark:border-gray-700/50">
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">Cashflow Alhafidz</span>
                <button
                    onClick={toggleTheme}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#2a2a4a] transition-colors"
                >
                    {mounted && (isDark ? (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                        </svg>
                    ) : (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                        </svg>
                    ))}
                </button>
            </div>

            {/* Mobile bottom tab bar */}
            <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-[#1a1a2e]/95 backdrop-blur-md border-t border-gray-200 dark:border-gray-700/50 flex">
                {navItems.map((item) => {
                    const isActive = pathname === item.path;
                    return (
                        <Link key={item.path} href={item.path}
                            className="flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium relative">
                            <motion.div
                                className="flex flex-col items-center gap-0.5"
                                whileTap={{ scale: 0.85 }}
                                transition={{ type: "spring", stiffness: 400, damping: 17 }}
                            >
                                <span className="relative">
                                    <motion.span
                                        className={isActive ? "text-[#4f6ef7]" : "text-gray-400 dark:text-gray-500"}
                                        animate={{ y: isActive ? -2 : 0 }}
                                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                                    >
                                        {item.icon}
                                    </motion.span>
                                </span>
                                <motion.span
                                    className={isActive ? "text-[#4f6ef7]" : "text-gray-400 dark:text-gray-500"}
                                    animate={{ opacity: isActive ? 1 : 0.6 }}
                                >
                                    {item.name}
                                </motion.span>
                            </motion.div>
                            {isActive && (
                                <motion.div
                                    layoutId="mobile-active-pill"
                                    className="absolute -top-[1px] left-1/2 -translate-x-1/2 w-8 h-[3px] rounded-full bg-[#4f6ef7]"
                                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                                />
                            )}
                        </Link>
                    );
                })}
            </nav>

            {/* ===== DESKTOP: Left sidebar (collapsible) ===== */}
            <motion.aside
                className={`hidden lg:flex fixed inset-y-0 left-0 z-50 flex-col bg-white dark:bg-[#1a1a2e] border-r border-gray-200 dark:border-gray-700/50`}
                animate={{ width: collapsed ? 68 : 240 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
                {/* Header with collapse toggle */}
                <div className="flex items-center gap-2.5 px-4 py-4 border-b border-gray-100 dark:border-gray-700/50">
                    <motion.button
                        onClick={toggleCollapsed}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#2a2a4a] transition-colors shrink-0"
                        whileTap={{ scale: 0.9 }}
                        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
                        </svg>
                    </motion.button>
                    <AnimatePresence>
                        {!collapsed && (
                            <motion.div
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden whitespace-nowrap"
                            >
                                <h1 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Kos Alhafidz</h1>
                                <p className="text-[11px] text-gray-400 dark:text-gray-500">Cashflow Manager</p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Nav items */}
                <nav className="flex-1 mt-3 px-2 space-y-0.5 overflow-y-auto">
                    {desktopItems.map((item, index) => {
                        const isActive = pathname === item.path;
                        return (
                            <Link key={item.path} href={item.path} className="block relative" title={collapsed ? item.name : undefined}>
                                <motion.div
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ duration: 0.3, delay: index * 0.05 }}
                                    whileHover={{ x: collapsed ? 0 : 4 }}
                                    whileTap={{ scale: 0.97 }}
                                    className={`flex items-center gap-3 rounded-lg text-sm transition-colors relative z-10 px-3 py-2.5 ${isActive ? "text-[#4f6ef7] font-medium" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                                        }`}
                                >
                                    <span className={`shrink-0 ${isActive ? "text-[#4f6ef7]" : "text-gray-400 dark:text-gray-500"}`}>{item.icon}</span>
                                    <AnimatePresence>
                                        {!collapsed && (
                                            <motion.span
                                                initial={{ opacity: 0, width: 0 }}
                                                animate={{ opacity: 1, width: "auto" }}
                                                exit={{ opacity: 0, width: 0 }}
                                                transition={{ duration: 0.2 }}
                                                className="overflow-hidden whitespace-nowrap"
                                            >
                                                {item.name}
                                            </motion.span>
                                        )}
                                    </AnimatePresence>
                                </motion.div>
                                {isActive && (
                                    <motion.div
                                        layoutId="desktop-active-bg"
                                        className="absolute inset-0 bg-[#eef1fe] dark:bg-[#4f6ef7]/15 rounded-lg"
                                        transition={{ type: "spring", stiffness: 350, damping: 30 }}
                                    />
                                )}
                            </Link>
                        );
                    })}
                </nav>

                {/* Bottom: Theme toggle */}
                <div className="px-2 py-3 border-t border-gray-100 dark:border-gray-700/50">
                    {collapsed ? (
                        /* Icon-only toggle */
                        <motion.button
                            onClick={toggleTheme}
                            className="w-full flex items-center justify-center py-2.5 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#2a2a4a] transition-colors"
                            whileTap={{ scale: 0.9 }}
                            title={isDark ? "Light mode" : "Dark mode"}
                        >
                            {mounted && (isDark ? (
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                                </svg>
                            ) : (
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                                </svg>
                            ))}
                        </motion.button>
                    ) : (
                        /* Pill toggle (light/dark) */
                        <div className="flex items-center bg-gray-100 dark:bg-[#1e1e38] rounded-xl p-1">
                            <button
                                onClick={() => isDark && toggleTheme()}
                                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all ${!isDark ? "bg-white dark:bg-[#2a2a4a] text-gray-800 dark:text-gray-100 shadow-sm" : "text-gray-400 dark:text-gray-500"
                                    }`}
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                                </svg>
                                Light
                            </button>
                            <button
                                onClick={() => !isDark && toggleTheme()}
                                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all ${isDark ? "bg-white dark:bg-[#2a2a4a] text-gray-800 dark:text-gray-100 shadow-sm" : "text-gray-400 dark:text-gray-500"
                                    }`}
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                                </svg>
                                Dark
                            </button>
                        </div>
                    )}
                </div>
            </motion.aside>
        </>
    );
}
