"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

function formatIDR(n) {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
}

const MONTHS_LABEL = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

const fadeUp = {
    hidden: { opacity: 0, y: 24 },
    visible: (i = 0) => ({
        opacity: 1, y: 0,
        transition: { duration: 0.45, delay: i * 0.06, ease: [0.25, 0.46, 0.45, 0.94] },
    }),
};

const staggerContainer = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.06 } },
};

export default function RiwayatPage() {
    const [transactions, setTransactions] = useState([]);
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);

    // Kas filters
    const [kasMonth, setKasMonth] = useState("");
    const [kasType, setKasType] = useState("all"); // all, in, out
    const [kasSort, setKasSort] = useState("newest");

    // WiFi filters
    const [wifiMonth, setWifiMonth] = useState("");
    const [wifiSort, setWifiSort] = useState("newest");

    useEffect(() => {
        Promise.all([
            fetch("/api/transactions").then(r => r.json()),
            fetch("/api/members").then(r => r.json()),
        ]).then(([t, m]) => {
            setTransactions(t);
            setMembers(m);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <div className="w-8 h-8 border-2 border-gray-300 dark:border-gray-600 border-t-[#4f6ef7] rounded-full animate-spin" />
            </div>
        );
    }

    // ===== TIMELINE KAS DATA =====
    const kasTx = [...transactions].filter(tx => tx.type !== 'wifi').sort((a, b) => new Date(a.date) - new Date(b.date));
    let runningBalance = 0;
    const timeline = kasTx.map(tx => {
        const isExpense = tx.type === 'pengeluaran';
        const debit = isExpense ? 0 : tx.amount;
        const kredit = isExpense ? Math.abs(tx.amount) : 0;
        runningBalance += debit - kredit;
        return { ...tx, debit, kredit, saldo: runningBalance };
    });

    // ===== WIFI HISTORY DATA =====
    const wifiTxList = [...transactions].filter(tx => tx.type === 'wifi');

    // Get unique months for filters
    const kasMonths = [...new Set(timeline.map(tx => tx.month))].filter(Boolean).sort().reverse();
    const wifiMonths = [...new Set(wifiTxList.map(tx => tx.month))].filter(Boolean).sort().reverse();

    // Apply filters — Kas
    let filteredKas = [...timeline];
    if (kasMonth) {
        filteredKas = filteredKas.filter(tx => tx.month === kasMonth);
    }
    if (kasType === "in") {
        filteredKas = filteredKas.filter(tx => tx.type !== 'pengeluaran');
    } else if (kasType === "out") {
        filteredKas = filteredKas.filter(tx => tx.type === 'pengeluaran');
    }
    if (kasSort === "newest") {
        filteredKas.sort((a, b) => new Date(b.date) - new Date(a.date));
    } else {
        filteredKas.sort((a, b) => new Date(a.date) - new Date(b.date));
    }

    // Group kas by member + date + type
    const kasGroups = [];
    filteredKas.forEach(tx => {
        const dateStr = new Date(tx.date).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
        const existing = kasGroups.find(g => g.memberId === tx.memberId && g.dateStr === dateStr && g.type === tx.type);
        if (existing) {
            existing.items.push(tx);
            existing.totalDebit += tx.debit;
            existing.totalKredit += tx.kredit;
            existing.lastSaldo = tx.saldo;
        } else {
            kasGroups.push({
                memberId: tx.memberId,
                memberName: tx.memberName || "—",
                type: tx.type,
                dateStr,
                date: tx.date,
                items: [tx],
                totalDebit: tx.debit,
                totalKredit: tx.kredit,
                lastSaldo: tx.saldo,
            });
        }
    });

    // Apply filters — WiFi
    let filteredWifi = [...wifiTxList];
    if (wifiMonth) {
        filteredWifi = filteredWifi.filter(tx => tx.month === wifiMonth);
    }
    if (wifiSort === "newest") {
        filteredWifi.sort((a, b) => new Date(b.date) - new Date(a.date));
    } else {
        filteredWifi.sort((a, b) => new Date(a.date) - new Date(b.date));
    }

    // Group wifi by member + date
    const wifiGroups = [];
    filteredWifi.forEach(tx => {
        const dateStr = new Date(tx.date).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
        const existing = wifiGroups.find(g => g.memberId === tx.memberId && g.dateStr === dateStr);
        if (existing) {
            existing.items.push(tx);
            existing.totalAmount += tx.amount;
        } else {
            wifiGroups.push({
                memberId: tx.memberId,
                memberName: tx.memberName || "—",
                dateStr,
                date: tx.date,
                items: [tx],
                totalAmount: tx.amount,
            });
        }
    });

    const formatMonthLabel = (m) => {
        const d = new Date(m + "-01");
        return d.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
    };

    const selectCls = "px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#1e1e38] border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 text-xs focus:border-[#4f6ef7] focus:ring-1 focus:ring-[#4f6ef7] outline-none transition-colors";

    return (
        <div className="space-y-5">
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
            >
                <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Riwayat</h1>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Timeline kas dan riwayat pembayaran WiFi</p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* ===== TIMELINE KAS ===== */}
                <motion.div
                    className="bg-white dark:bg-[#1a1a2e] rounded-xl border border-gray-100 dark:border-gray-700/50 shadow-sm flex flex-col"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                >
                    {/* Header + Filters */}
                    <div className="p-4 sm:p-5 pb-3 border-b border-gray-100 dark:border-gray-700/50">
                        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">Timeline Kas</h3>
                        <div className="flex flex-wrap gap-2">
                            <select value={kasMonth} onChange={e => setKasMonth(e.target.value)} className={selectCls}>
                                <option value="">Semua Bulan</option>
                                {kasMonths.map(m => (
                                    <option key={m} value={m}>{formatMonthLabel(m)}</option>
                                ))}
                            </select>
                            <select value={kasType} onChange={e => setKasType(e.target.value)} className={selectCls}>
                                <option value="all">Semua Tipe</option>
                                <option value="in">Pemasukan</option>
                                <option value="out">Pengeluaran</option>
                            </select>
                            <select value={kasSort} onChange={e => setKasSort(e.target.value)} className={selectCls}>
                                <option value="newest">Terbaru</option>
                                <option value="oldest">Terlama</option>
                            </select>
                            {(kasMonth || kasType !== "all" || kasSort !== "newest") && (
                                <button
                                    onClick={() => { setKasMonth(""); setKasType("all"); setKasSort("newest"); }}
                                    className="px-2.5 py-1.5 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/50 text-red-500 text-xs font-medium hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors flex items-center gap-1"
                                >
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                                    Reset
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Scrollable Content */}
                    <div className="p-4 sm:p-5 pt-3 overflow-y-auto max-h-[500px] md:max-h-[600px]">
                        {kasGroups.length === 0 ? (
                            <p className="py-8 text-center text-gray-400 dark:text-gray-500 text-sm">Tidak ada data.</p>
                        ) : (
                            <motion.div
                                className="space-y-2"
                                variants={staggerContainer}
                                initial="hidden"
                                animate="visible"
                                key={`kas-${kasMonth}-${kasType}-${kasSort}`}
                            >
                                {kasGroups.map((g, i) => {
                                    const isExpense = g.type === "pengeluaran";
                                    return (
                                        <motion.div
                                            key={`${g.memberId}-${g.dateStr}-${g.type}-${i}`}
                                            className={`p-3 rounded-lg ${isExpense ? "bg-red-50/50 dark:bg-red-900/10" : "bg-gray-50 dark:bg-[#1e1e38]"}`}
                                            variants={fadeUp}
                                            custom={i}
                                            whileHover={{ x: 4, boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}
                                        >
                                            <div className="flex items-center justify-between mb-1">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <span className={`shrink-0 px-2 py-0.5 rounded text-[10px] font-semibold ${isExpense
                                                        ? "bg-red-100 dark:bg-red-900/30 text-red-500"
                                                        : "bg-blue-50 dark:bg-blue-900/30 text-[#4f6ef7]"
                                                        }`}>{isExpense ? "OUT" : g.type.toUpperCase()}</span>
                                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">{g.memberName}</span>
                                                </div>
                                                <span className="text-[11px] text-gray-400 dark:text-gray-500 whitespace-nowrap ml-2">{g.dateStr}</span>
                                            </div>
                                            {g.items.length === 1 ? (
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs text-gray-400 dark:text-gray-500">{g.items[0].notes || g.items[0].month}</span>
                                                    <div className="flex items-center gap-3">
                                                        <span className={`text-sm font-semibold ${isExpense ? "text-red-500" : "text-green-600 dark:text-green-400"}`}>
                                                            {isExpense ? `-${formatIDR(g.totalKredit)}` : `+${formatIDR(g.totalDebit)}`}
                                                        </span>
                                                        <span className="text-xs text-gray-400 dark:text-gray-500">Saldo: {formatIDR(g.lastSaldo)}</span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="space-y-0.5 mb-1.5">
                                                        {g.items.map(tx => (
                                                            <div key={tx.id} className="flex items-center justify-between text-xs">
                                                                <span className="text-gray-400 dark:text-gray-500">{tx.month}</span>
                                                                <span className={isExpense ? "text-red-500" : "text-green-600 dark:text-green-400"}>{formatIDR(isExpense ? tx.kredit : tx.debit)}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <div className="flex justify-between pt-1.5 border-t border-gray-200/60 dark:border-gray-600/40">
                                                        <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">{g.items.length} bulan</span>
                                                        <div className="flex items-center gap-3">
                                                            <span className={`text-sm font-bold ${isExpense ? "text-red-500" : "text-green-600 dark:text-green-400"}`}>
                                                                {isExpense ? `-${formatIDR(g.totalKredit)}` : `+${formatIDR(g.totalDebit)}`}
                                                            </span>
                                                            <span className="text-xs text-gray-400 dark:text-gray-500">Saldo: {formatIDR(g.lastSaldo)}</span>
                                                        </div>
                                                    </div>
                                                </>
                                            )}
                                        </motion.div>
                                    );
                                })}
                            </motion.div>
                        )}
                    </div>
                </motion.div>

                {/* ===== RIWAYAT WIFI ===== */}
                <motion.div
                    className="bg-white dark:bg-[#1a1a2e] rounded-xl border border-gray-100 dark:border-gray-700/50 shadow-sm flex flex-col"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                >
                    {/* Header + Filters */}
                    <div className="p-4 sm:p-5 pb-3 border-b border-gray-100 dark:border-gray-700/50">
                        <div className="flex items-center gap-2 mb-3">
                            <span className="w-2.5 h-2.5 rounded-full bg-purple-400 shrink-0" />
                            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Riwayat WiFi</h3>
                            <span className="text-[10px] text-gray-400 dark:text-gray-500 ml-auto">tidak dihitung ke saldo kas</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <select value={wifiMonth} onChange={e => setWifiMonth(e.target.value)} className={selectCls}>
                                <option value="">Semua Bulan</option>
                                {wifiMonths.map(m => (
                                    <option key={m} value={m}>{formatMonthLabel(m)}</option>
                                ))}
                            </select>
                            <select value={wifiSort} onChange={e => setWifiSort(e.target.value)} className={selectCls}>
                                <option value="newest">Terbaru</option>
                                <option value="oldest">Terlama</option>
                            </select>
                            {(wifiMonth || wifiSort !== "newest") && (
                                <button
                                    onClick={() => { setWifiMonth(""); setWifiSort("newest"); }}
                                    className="px-2.5 py-1.5 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/50 text-red-500 text-xs font-medium hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors flex items-center gap-1"
                                >
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                                    Reset
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Scrollable Content */}
                    <div className="p-4 sm:p-5 pt-3 overflow-y-auto max-h-[500px] md:max-h-[600px]">
                        {wifiGroups.length === 0 ? (
                            <p className="py-8 text-center text-gray-400 dark:text-gray-500 text-sm">Tidak ada data WiFi.</p>
                        ) : (
                            <motion.div
                                className="space-y-2"
                                variants={staggerContainer}
                                initial="hidden"
                                animate="visible"
                                key={`wifi-${wifiMonth}-${wifiSort}`}
                            >
                                {wifiGroups.map((g, i) => (
                                    <motion.div
                                        key={`${g.memberId}-${g.dateStr}-${i}`}
                                        className="p-3 rounded-lg bg-purple-50/50 dark:bg-purple-900/10"
                                        variants={fadeUp}
                                        custom={i}
                                        whileHover={{ x: 4, boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}
                                    >
                                        <div className="flex items-center justify-between mb-1">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <span className="shrink-0 px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-50 dark:bg-purple-900/30 text-purple-500">WIFI</span>
                                                <span className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">{g.memberName}</span>
                                            </div>
                                            <span className="text-[11px] text-gray-400 dark:text-gray-500 whitespace-nowrap ml-2">{g.dateStr}</span>
                                        </div>
                                        {g.items.length === 1 ? (
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs text-gray-400 dark:text-gray-500">{g.items[0].notes || g.items[0].month}</span>
                                                <span className="text-sm font-semibold text-purple-600 dark:text-purple-400">{formatIDR(g.totalAmount)}</span>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="space-y-0.5 mb-1.5">
                                                    {g.items.map(tx => (
                                                        <div key={tx.id} className="flex items-center justify-between text-xs">
                                                            <span className="text-gray-400 dark:text-gray-500">{tx.month}</span>
                                                            <span className="text-purple-600 dark:text-purple-400">{formatIDR(tx.amount)}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="flex justify-between pt-1.5 border-t border-purple-200/60 dark:border-purple-700/40">
                                                    <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">{g.items.length} bulan</span>
                                                    <span className="text-sm font-bold text-purple-600 dark:text-purple-400">{formatIDR(g.totalAmount)}</span>
                                                </div>
                                            </>
                                        )}
                                    </motion.div>
                                ))}
                            </motion.div>
                        )}
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
