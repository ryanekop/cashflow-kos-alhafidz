"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const fadeUp = {
    hidden: { opacity: 0, y: 24 },
    visible: (i = 0) => ({
        opacity: 1, y: 0,
        transition: { duration: 0.45, delay: i * 0.1, ease: [0.25, 0.46, 0.45, 0.94] },
    }),
};

const staggerContainer = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.06 } },
};

export default function WifiPage() {
    const [members, setMembers] = useState([]);
    const [wifiBills, setWifiBills] = useState([]);
    const [wifiUsage, setWifiUsage] = useState([]);
    const [selectedMember, setSelectedMember] = useState("");
    const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
    const [level, setLevel] = useState("full");
    const [popup, setPopup] = useState(null);
    const [successMsg, setSuccessMsg] = useState("");

    const inputCls = "w-full px-3 py-2.5 rounded-lg bg-white dark:bg-[#1e1e38] border border-gray-200 dark:border-gray-600 text-gray-800 dark:text-gray-200 text-sm focus:border-[#4f6ef7] focus:ring-1 focus:ring-[#4f6ef7] outline-none transition-colors";

    useEffect(() => {
        Promise.all([
            fetch("/api/members").then(r => r.json()),
            fetch("/api/wifi-bills").then(r => r.json()),
            fetch("/api/wifi-usage").then(r => r.json()),
        ]).then(([m, w, u]) => { setMembers(m); setWifiBills(w); setWifiUsage(u); });
    }, []);

    const handleSubmit = async () => {
        if (!selectedMember) return setPopup({ title: "Perhatian", message: "Pilih nama kamu dulu!" });
        if (!month) return setPopup({ title: "Perhatian", message: "Pilih bulan!" });

        const member = members.find(m => m.id === parseInt(selectedMember));

        // Check if already filled
        const existing = wifiUsage.find(u => u.memberId === parseInt(selectedMember) && u.month === month);
        if (existing) {
            // Update existing
            await fetch("/api/wifi-usage", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ memberId: parseInt(selectedMember), memberName: member.name, month, level }),
            });
            setSuccessMsg(`Data WiFi kamu untuk ${month} diubah ke ${level === "full" ? "Full" : "Setengah Bulan"}`);
        } else {
            await fetch("/api/wifi-usage", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ memberId: parseInt(selectedMember), memberName: member.name, month, level }),
            });
            setSuccessMsg(`Data WiFi kamu untuk ${month} tersimpan: ${level === "full" ? "Full" : "Setengah Bulan"}`);
        }

        setTimeout(() => setSuccessMsg(""), 4000);
        // Refresh
        const u = await fetch("/api/wifi-usage").then(r => r.json());
        setWifiUsage(u);
    };

    const handleDeleteUsage = async (id, name) => {
        if (!confirm(`Hapus data WiFi untuk ${name}?`)) return;
        await fetch(`/api/wifi-usage?id=${id}`, { method: "DELETE" });
        const u = await fetch("/api/wifi-usage").then(r => r.json());
        setWifiUsage(u);
        setSuccessMsg(`Data WiFi ${name} dihapus`);
        setTimeout(() => setSuccessMsg(""), 3000);
    };

    // Calc preview
    const bill = wifiBills.find(b => b.month === month);
    const monthUsage = wifiUsage.filter(u => u.month === month);
    const fullUsers = monthUsage.filter(u => u.level === "full").length;
    const halfUsers = monthUsage.filter(u => u.level === "half").length;

    let previewAmount = 0;
    if (bill && (fullUsers + halfUsers) > 0) {
        const totalUnits = fullUsers + halfUsers * 0.75;
        const unitCost = bill.amount / totalUnits;
        previewAmount = level === "half" ? Math.round(unitCost * 0.75) : Math.round(unitCost);
    }

    return (
        <div className="max-w-lg mx-auto space-y-5">
            <AnimatePresence>
                {popup && (
                    <motion.div
                        className="modal-overlay"
                        onClick={() => setPopup(null)}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        <motion.div
                            className="modal-box"
                            onClick={e => e.stopPropagation()}
                            initial={{ opacity: 0, scale: 0.85, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.85, y: 20 }}
                            transition={{ type: "spring", stiffness: 350, damping: 25 }}
                        >
                            <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-2">{popup.title}</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{popup.message}</p>
                            <button onClick={() => setPopup(null)} className="w-full py-2 rounded-lg bg-gray-100 dark:bg-[#2a2a4a] text-gray-700 dark:text-gray-200 text-sm font-medium hover:bg-gray-200 dark:hover:bg-[#3a3a5a] transition-colors">Tutup</button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {successMsg && (
                    <motion.div
                        className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700/50 text-green-700 dark:text-green-400 text-sm"
                        initial={{ opacity: 0, y: -20, height: 0 }}
                        animate={{ opacity: 1, y: 0, height: "auto" }}
                        exit={{ opacity: 0, y: -20, height: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    >
                        ✓ {successMsg}
                    </motion.div>
                )}
            </AnimatePresence>

            <motion.div
                className="text-center"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
            >
                <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Isi Pemakaian WiFi</h1>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Isi apakah kamu pakai WiFi bulan ini</p>
            </motion.div>

            {/* Form */}
            <motion.div
                className="bg-white dark:bg-[#1a1a2e] rounded-xl border border-gray-100 dark:border-gray-700/50 shadow-sm p-5 space-y-4"
                variants={fadeUp} custom={0} initial="hidden" animate="visible"
            >
                <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5">Siapa kamu?</label>
                    <select value={selectedMember} onChange={e => setSelectedMember(e.target.value)} className={inputCls}>
                        <option value="">Pilih Namamu...</option>
                        {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5">Bulan</label>
                        <input type="month" value={month} onChange={e => setMonth(e.target.value)} className={inputCls} />
                    </div>
                    <div>
                        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5">Pakai WiFi bulan ini?</label>
                        <select value={level} onChange={e => setLevel(e.target.value)} className={inputCls}>
                            <option value="full">Full (sebulan penuh)</option>
                            <option value="half">Setengah bulan</option>
                        </select>
                    </div>
                </div>

                <motion.button
                    onClick={handleSubmit}
                    className="w-full py-2.5 rounded-lg bg-[#7c5cfc] text-white text-sm font-medium hover:bg-[#6b4fe0] transition-colors"
                    whileTap={{ scale: 0.97 }}
                    whileHover={{ boxShadow: "0 6px 20px rgba(124,92,252,0.3)" }}
                >
                    Simpan Pemakaian WiFi
                </motion.button>
            </motion.div>

            {/* Preview */}
            <AnimatePresence>
                {bill && (fullUsers + halfUsers) > 0 && selectedMember && (
                    <motion.div
                        className="bg-white dark:bg-[#1a1a2e] rounded-xl border border-gray-100 dark:border-gray-700/50 shadow-sm p-5"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                    >
                        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3 flex items-center gap-2">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7c5cfc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="4" y="2" width="16" height="20" rx="2" /><line x1="8" y1="6" x2="16" y2="6" />
                            </svg>
                            Perkiraan Tagihan WiFi
                        </h3>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between text-gray-500 dark:text-gray-400">
                                <span>Total tagihan bulan ini</span>
                                <span className="font-medium text-gray-700 dark:text-gray-200">{formatIDR(bill.amount)}</span>
                            </div>
                            <div className="flex justify-between text-gray-500 dark:text-gray-400">
                                <span>Pengguna: {fullUsers} full, {halfUsers} setengah</span>
                                <span className="text-xs text-gray-400 dark:text-gray-500">({fullUsers + halfUsers} orang)</span>
                            </div>
                            <div className="border-t border-gray-100 dark:border-gray-700/50 pt-2 flex justify-between">
                                <span className="text-gray-600 dark:text-gray-300 font-medium">Kamu bayar</span>
                                <motion.span
                                    className="text-lg font-semibold text-gray-800 dark:text-gray-100"
                                    key={previewAmount}
                                    initial={{ scale: 1.1, color: "#7c5cfc" }}
                                    animate={{ scale: 1, color: "var(--foreground)" }}
                                    transition={{ duration: 0.3 }}
                                >
                                    {formatIDR(previewAmount)}
                                </motion.span>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {!bill && month && (
                    <motion.div
                        className="bg-white dark:bg-[#1a1a2e] rounded-xl border border-gray-100 dark:border-gray-700/50 shadow-sm p-5"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        transition={{ duration: 0.4 }}
                    >
                        <p className="text-sm text-amber-600 dark:text-amber-400 text-center">Tagihan WiFi bulan {month} belum diinput admin</p>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Who filled in */}
            <AnimatePresence>
                {monthUsage.length > 0 && (
                    <motion.div
                        className="bg-white dark:bg-[#1a1a2e] rounded-xl border border-gray-100 dark:border-gray-700/50 shadow-sm p-5"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        transition={{ duration: 0.4, delay: 0.1 }}
                    >
                        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">Yang sudah isi ({month})</h3>
                        <motion.div
                            className="space-y-1.5"
                            variants={staggerContainer}
                            initial="hidden"
                            animate="visible"
                        >
                            {monthUsage.map((u, idx) => (
                                <motion.div
                                    key={u.id}
                                    className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 dark:bg-[#1e1e38] text-sm"
                                    variants={fadeUp}
                                    custom={idx}
                                    whileHover={{ x: 4, backgroundColor: "var(--card-border)" }}
                                >
                                    <span className="text-gray-700 dark:text-gray-200 font-medium">{u.memberName}</span>
                                    <div className="flex items-center gap-2">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${u.level === "full" ? "bg-blue-50 dark:bg-blue-900/30 text-[#4f6ef7] border border-blue-200 dark:border-blue-700/50" : "bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-700/50"
                                            }`}>{u.level === "full" ? "FULL" : "SETENGAH"}</span>
                                        <motion.button
                                            onClick={() => handleDeleteUsage(u.id, u.memberName)}
                                            className="text-gray-300 dark:text-gray-600 hover:text-red-400 transition-colors"
                                            whileTap={{ scale: 0.85 }}
                                        >
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                            </svg>
                                        </motion.button>
                                    </div>
                                </motion.div>
                            ))}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function formatIDR(n) {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
}
