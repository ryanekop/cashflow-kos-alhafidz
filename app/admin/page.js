"use client";

import { useEffect, useState, useCallback } from "react";

function formatIDR(n) {
    return new Intl.NumberFormat("id-ID", {
        style: "currency", currency: "IDR",
        minimumFractionDigits: 0, maximumFractionDigits: 0,
    }).format(n);
}

function calculateKas(monthStr, status) {
    const date = new Date(monthStr + "-01");
    const july2025 = new Date("2025-07-01");
    if (status === "none") return 10000;
    if (date >= july2025) return status === "full" ? 30000 : 15000;
    return status === "full" ? 25000 : 12500;
}

const ADMIN_PASSWORD = "alhafidz321";
const inputCls = "w-full px-3 py-2.5 rounded-lg bg-white border border-gray-200 text-gray-800 text-sm focus:border-[#4f6ef7] focus:ring-1 focus:ring-[#4f6ef7] outline-none transition-colors";

export default function AdminPage() {
    const [authenticated, setAuthenticated] = useState(false);
    const [password, setPassword] = useState("");
    const [pwError, setPwError] = useState(false);

    const [members, setMembers] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [wifiBills, setWifiBills] = useState([]);
    const [wifiUsage, setWifiUsage] = useState([]);
    const [activeTab, setActiveTab] = useState("status");
    const [toast, setToast] = useState("");

    // Inline KAS status picker: { memberId: true/false }
    const [kasPicker, setKasPicker] = useState({});

    // Status Bayar month selector
    const [statusMonth, setStatusMonth] = useState(new Date().toISOString().slice(0, 7));

    const [memberForm, setMemberForm] = useState({ name: "", status: "full" });
    const [wifiForm, setWifiForm] = useState({ month: new Date().toISOString().slice(0, 7), amount: "" });

    const fetchAll = useCallback(async () => {
        const [m, t, w, wu] = await Promise.all([
            fetch("/api/members").then(r => r.json()),
            fetch("/api/transactions").then(r => r.json()),
            fetch("/api/wifi-bills").then(r => r.json()),
            fetch("/api/wifi-usage").then(r => r.json()),
        ]);
        setMembers(m); setTransactions(t); setWifiBills(w); setWifiUsage(wu);
    }, []);

    useEffect(() => {
        if (typeof window !== "undefined" && sessionStorage.getItem("admin_auth") === "true") {
            setAuthenticated(true);
        }
    }, []);

    useEffect(() => { if (authenticated) fetchAll(); }, [authenticated, fetchAll]);

    const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

    const handleLogin = (e) => {
        e.preventDefault();
        if (password === ADMIN_PASSWORD) {
            setAuthenticated(true);
            sessionStorage.setItem("admin_auth", "true");
        } else {
            setPwError(true);
            setTimeout(() => setPwError(false), 2000);
        }
    };

    // Calculate WiFi amount for a member
    const calcWifiForMember = (memberId, month) => {
        const bill = wifiBills.find(b => b.month === month);
        const monthUsage = wifiUsage.filter(u => u.month === month);
        const fullUsers = monthUsage.filter(u => u.level === "full").length;
        const halfUsers = monthUsage.filter(u => u.level === "half").length;
        if (!bill || (fullUsers + halfUsers) === 0) return 0;
        const totalUnits = fullUsers + halfUsers * 0.75;
        const unitCost = bill.amount / totalUnits;
        const myUsage = monthUsage.find(u => u.memberId === memberId);
        if (!myUsage) return 0;
        return myUsage.level === "half" ? Math.round(unitCost * 0.75) : Math.round(unitCost);
    };

    const togglePaymentStatus = async (memberId, memberName, type, month, currentlyPaid) => {
        if (currentlyPaid) {
            const tx = transactions.find(t => t.memberId === memberId && t.type === type && t.month === month);
            if (tx) {
                await fetch(`/api/transactions?id=${tx.id}`, { method: "DELETE" });
                showToast(`${type.toUpperCase()} ${memberName} (${month}): BELUM BAYAR`);
            }
            fetchAll();
        } else if (type === "kas") {
            // Show inline picker for KAS
            setKasPicker(prev => ({ ...prev, [memberId]: true }));
        } else {
            // WiFi: auto-calculate
            const amount = calcWifiForMember(memberId, month);
            await fetch("/api/transactions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ memberId, memberName, type, month, amount, status: "admin-set", notes: "Diset oleh admin" }),
            });
            showToast(`WIFI ${memberName} (${month}): SUDAH BAYAR — ${formatIDR(amount)}`);
            fetchAll();
        }
    };

    const confirmKasPayment = async (memberId, memberName, month, status) => {
        const amount = calculateKas(month, status);
        await fetch("/api/transactions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ memberId, memberName, type: "kas", month, amount, status, notes: "Diset oleh admin" }),
        });
        setKasPicker(prev => ({ ...prev, [memberId]: false }));
        showToast(`KAS ${memberName} (${month}): SUDAH BAYAR — ${formatIDR(amount)}`);
        fetchAll();
    };

    const handleAddMember = async (e) => {
        e.preventDefault();
        if (!memberForm.name) return;
        await fetch("/api/members", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(memberForm),
        });
        setMemberForm({ name: "", status: "full" });
        showToast(`Member ${memberForm.name} ditambahkan`);
        fetchAll();
    };

    const handleDeleteMember = async (id, name) => {
        if (!confirm(`Hapus member "${name}"?`)) return;
        await fetch(`/api/members?id=${id}`, { method: "DELETE" });
        showToast(`Member ${name} dihapus`);
        fetchAll();
    };

    const handleWifi = async (e) => {
        e.preventDefault();
        if (!wifiForm.amount) return;
        await fetch("/api/wifi-bills", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ month: wifiForm.month, amount: parseInt(wifiForm.amount) }),
        });
        showToast("Tagihan WiFi disimpan");
        fetchAll();
    };

    const handleDeleteTx = async (id) => {
        if (!confirm("Hapus transaksi ini?")) return;
        await fetch(`/api/transactions?id=${id}`, { method: "DELETE" });
        showToast("Transaksi dihapus");
        fetchAll();
    };

    const handleDeleteWifiBill = async (month) => {
        if (!confirm(`Hapus tagihan WiFi bulan ${month}?`)) return;
        const bills = wifiBills.filter(b => b.month !== month);
        await fetch("/api/wifi-bills", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(bills),
        });
        showToast(`Tagihan WiFi ${month} dihapus`);
        fetchAll();
    };

    const handleDeleteWifiUsage = async (id) => {
        if (!confirm("Hapus data WiFi usage ini?")) return;
        await fetch(`/api/wifi-usage?id=${id}`, { method: "DELETE" });
        showToast("WiFi usage dihapus");
        fetchAll();
    };

    // ===== Login Screen =====
    if (!authenticated) {
        return (
            <div className="flex items-center justify-center min-h-[70vh]">
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 w-full max-w-sm">
                    <div className="text-center mb-5">
                        <div className="w-12 h-12 rounded-xl bg-[#eef1fe] flex items-center justify-center mx-auto mb-3">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4f6ef7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                            </svg>
                        </div>
                        <h2 className="text-lg font-semibold text-gray-800">Admin Panel</h2>
                        <p className="text-xs text-gray-400 mt-1">Masukkan password untuk melanjutkan</p>
                    </div>
                    <form onSubmit={handleLogin} className="space-y-3">
                        <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password"
                            className={`${inputCls} ${pwError ? "border-red-300 focus:border-red-400 focus:ring-red-400" : ""}`} autoFocus />
                        {pwError && <p className="text-xs text-red-500">Password salah</p>}
                        <button type="submit" className="w-full py-2.5 rounded-lg bg-[#4f6ef7] text-white text-sm font-medium hover:bg-[#4060e0] transition-colors">Masuk</button>
                    </form>
                </div>
            </div>
        );
    }

    const tabs = [
        { id: "status", label: "Status Bayar" },
        { id: "member", label: "Kelola Member" },
        { id: "wifi", label: "Tagihan WiFi" },
        { id: "wifi-usage", label: "Isi WiFi" },
        { id: "history", label: "Riwayat" },
    ];

    // Month navigation helpers
    const prevMonth = () => {
        const d = new Date(statusMonth + "-01");
        d.setMonth(d.getMonth() - 1);
        setStatusMonth(d.toISOString().slice(0, 7));
    };
    const nextMonth = () => {
        const d = new Date(statusMonth + "-01");
        d.setMonth(d.getMonth() + 1);
        setStatusMonth(d.toISOString().slice(0, 7));
    };
    const formatMonth = (m) => {
        const d = new Date(m + "-01");
        return d.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
    };

    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between">
                <h1 className="text-xl font-semibold text-gray-800">Admin Panel</h1>
                <button onClick={() => { sessionStorage.removeItem("admin_auth"); setAuthenticated(false); }}
                    className="text-xs text-gray-400 hover:text-red-500 transition-colors">Logout</button>
            </div>

            {toast && (
                <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm">✓ {toast}</div>
            )}

            {/* Tabs */}
            <div className="flex gap-1.5 bg-white rounded-xl border border-gray-100 p-1 shadow-sm overflow-x-auto no-scrollbar">
                {tabs.map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                        className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${activeTab === tab.id ? "bg-[#4f6ef7] text-white" : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                            }`}
                    >{tab.label}</button>
                ))}
            </div>

            {/* ===== STATUS TAB with Month Selector ===== */}
            {activeTab === "status" && (
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                        <div>
                            <h2 className="text-sm font-semibold text-gray-700">Status Pembayaran</h2>
                            <p className="text-xs text-gray-400 mt-0.5">Klik untuk mengubah status</p>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <button onClick={prevMonth} className="w-7 h-7 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200 flex items-center justify-center text-xs transition-colors">←</button>
                            <span className="text-xs font-medium text-gray-600 w-32 text-center">{formatMonth(statusMonth)}</span>
                            <button onClick={nextMonth} className="w-7 h-7 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200 flex items-center justify-center text-xs transition-colors">→</button>
                        </div>
                    </div>
                    <div className="space-y-2">
                        {members.map(m => {
                            const kasTx = transactions.find(t => t.memberId === m.id && t.type === "kas" && t.month === statusMonth);
                            const wifiTx = transactions.find(t => t.memberId === m.id && t.type === "wifi" && t.month === statusMonth);
                            const hasPaidKas = !!kasTx;
                            const hasPaidWifi = !!wifiTx;
                            const showPicker = kasPicker[m.id] && !hasPaidKas;
                            return (
                                <div key={m.id} className="p-3 rounded-lg bg-gray-50">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-[10px] font-bold ${m.status === "full" ? "bg-[#34a853]" : m.status === "half" ? "bg-[#e8a500]" : "bg-gray-400"
                                                }`}>
                                                {m.name.substring(0, 2).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-gray-700">{m.name}</p>
                                                {(hasPaidKas || hasPaidWifi) && (
                                                    <p className="text-[10px] text-gray-400">
                                                        {hasPaidKas && kasTx.amount > 0 && `Kas: ${formatIDR(kasTx.amount)}`}
                                                        {hasPaidKas && kasTx.amount > 0 && hasPaidWifi && wifiTx.amount > 0 && " · "}
                                                        {hasPaidWifi && wifiTx.amount > 0 && `WiFi: ${formatIDR(wifiTx.amount)}`}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex gap-1.5">
                                            <button onClick={() => togglePaymentStatus(m.id, m.name, "kas", statusMonth, hasPaidKas)}
                                                className={`px-3 py-1 rounded text-[11px] font-semibold transition-colors ${hasPaidKas ? "bg-green-50 text-green-600 border border-green-200 hover:bg-green-100" : "bg-red-50 text-red-500 border border-red-200 hover:bg-red-100"
                                                    }`}>KAS {hasPaidKas ? "✓" : "✗"}</button>
                                            <button onClick={() => togglePaymentStatus(m.id, m.name, "wifi", statusMonth, hasPaidWifi)}
                                                className={`px-3 py-1 rounded text-[11px] font-semibold transition-colors ${hasPaidWifi ? "bg-green-50 text-green-600 border border-green-200 hover:bg-green-100" : "bg-red-50 text-red-500 border border-red-200 hover:bg-red-100"
                                                    }`}>WIFI {hasPaidWifi ? "✓" : "✗"}</button>
                                        </div>
                                    </div>
                                    {/* Inline KAS status picker */}
                                    {showPicker && (
                                        <div className="mt-2.5 pt-2.5 border-t border-gray-100">
                                            <p className="text-[11px] text-gray-400 mb-2">Pilih status untuk hitung nominal Kas:</p>
                                            <div className="flex gap-1.5">
                                                <button onClick={() => confirmKasPayment(m.id, m.name, statusMonth, "full")}
                                                    className="px-3 py-1.5 rounded-lg bg-blue-50 text-[#4f6ef7] text-[11px] font-medium border border-blue-200 hover:bg-blue-100 transition-colors">
                                                    Full ({formatIDR(calculateKas(statusMonth, "full"))})
                                                </button>
                                                <button onClick={() => confirmKasPayment(m.id, m.name, statusMonth, "half")}
                                                    className="px-3 py-1.5 rounded-lg bg-amber-50 text-amber-600 text-[11px] font-medium border border-amber-200 hover:bg-amber-100 transition-colors">
                                                    Half ({formatIDR(calculateKas(statusMonth, "half"))})
                                                </button>
                                                <button onClick={() => confirmKasPayment(m.id, m.name, statusMonth, "none")}
                                                    className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-500 text-[11px] font-medium border border-gray-200 hover:bg-gray-200 transition-colors">
                                                    None ({formatIDR(calculateKas(statusMonth, "none"))})
                                                </button>
                                                <button onClick={() => setKasPicker(prev => ({ ...prev, [m.id]: false }))}
                                                    className="px-2 py-1.5 rounded-lg text-gray-300 hover:text-gray-500 text-[11px] transition-colors">✕</button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ===== MEMBER TAB ===== */}
            {activeTab === "member" && (
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                    <h2 className="text-sm font-semibold text-gray-700 mb-4">Kelola Member</h2>
                    <form onSubmit={handleAddMember} className="space-y-3 mb-5 pb-5 border-b border-gray-100">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs text-gray-500 mb-1.5">Nama</label>
                                <input type="text" value={memberForm.name} onChange={e => setMemberForm({ ...memberForm, name: e.target.value })} placeholder="Nama member" className={inputCls} />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 mb-1.5">Status</label>
                                <select value={memberForm.status} onChange={e => setMemberForm({ ...memberForm, status: e.target.value })} className={inputCls}>
                                    <option value="full">Di kos (Full)</option>
                                    <option value="half">Setengah bulan</option>
                                    <option value="none">Tidak di kos</option>
                                </select>
                            </div>
                        </div>
                        <button type="submit" className="w-full py-2.5 rounded-lg bg-[#4f6ef7] text-white text-sm font-medium hover:bg-[#4060e0] transition-colors">Tambah Member</button>
                    </form>
                    <div className="space-y-1.5">
                        {members.map(m => (
                            <div key={m.id} className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50">
                                <div className="flex items-center gap-3">
                                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold ${m.status === "full" ? "bg-[#34a853]" : m.status === "half" ? "bg-[#e8a500]" : "bg-gray-400"
                                        }`}>{m.name.substring(0, 2).toUpperCase()}</div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-700">{m.name}</p>
                                        <p className="text-[11px] text-gray-400">{m.status === "full" ? "Di kos" : m.status === "half" ? "Setengah bulan" : "Tidak di kos"}</p>
                                    </div>
                                </div>
                                <button onClick={() => handleDeleteMember(m.id, m.name)} className="text-gray-300 hover:text-red-400 transition-colors">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                    </svg>
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ===== WIFI TAB ===== */}
            {activeTab === "wifi" && (
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                    <h2 className="text-sm font-semibold text-gray-700 mb-4">Input Tagihan WiFi Bulanan</h2>
                    <form onSubmit={handleWifi} className="space-y-4">
                        <div>
                            <label className="block text-xs text-gray-500 mb-1.5">Bulan</label>
                            <input type="month" value={wifiForm.month} onChange={e => setWifiForm({ ...wifiForm, month: e.target.value })} className={inputCls} />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1.5">Total Tagihan (Rp)</label>
                            <input type="number" value={wifiForm.amount} onChange={e => setWifiForm({ ...wifiForm, amount: e.target.value })} placeholder="305250" className={inputCls} />
                        </div>
                        <button type="submit" className="w-full py-2.5 rounded-lg bg-[#4f6ef7] text-white text-sm font-medium hover:bg-[#4060e0] transition-colors">Simpan Tagihan</button>
                    </form>
                    <div className="mt-5">
                        <h3 className="text-xs text-gray-400 mb-2.5">Tagihan Tersimpan</h3>
                        <div className="space-y-1.5">
                            {wifiBills.map(b => (
                                <div key={b.month} className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 text-sm">
                                    <span className="text-gray-500">{b.month}</span>
                                    <div className="flex items-center gap-3">
                                        <span className="font-medium text-gray-700">{formatIDR(b.amount)}</span>
                                        <button onClick={() => handleDeleteWifiBill(b.month)} className="text-gray-300 hover:text-red-400 transition-colors">
                                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {wifiBills.length === 0 && <p className="text-sm text-gray-400 text-center py-4">Belum ada tagihan.</p>}
                        </div>
                    </div>
                </div>
            )}

            {/* ===== WIFI USAGE TAB ===== */}
            {activeTab === "wifi-usage" && (
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                    <h2 className="text-sm font-semibold text-gray-700 mb-1">Data Isi WiFi</h2>
                    <p className="text-xs text-gray-400 mb-4">List member yang mengisi WiFi per bulan</p>
                    <div className="space-y-3">
                        {(() => {
                            // Group by month
                            const byMonth = {};
                            wifiUsage.forEach(u => {
                                if (!byMonth[u.month]) byMonth[u.month] = [];
                                byMonth[u.month].push(u);
                            });
                            const months = Object.keys(byMonth).sort().reverse();
                            if (months.length === 0) return <p className="text-sm text-gray-400 text-center py-4">Belum ada data WiFi usage.</p>;
                            return months.map(month => (
                                <div key={month} className="rounded-lg bg-gray-50 p-3">
                                    <h4 className="text-xs font-semibold text-gray-600 mb-2">{month}</h4>
                                    <div className="space-y-1">
                                        {byMonth[month].map(u => {
                                            const member = members.find(m => m.id === u.memberId);
                                            return (
                                                <div key={u.id} className="flex items-center justify-between py-1.5 px-2 rounded bg-white">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm text-gray-700">{member?.name || u.memberId}</span>
                                                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${u.level === "full" ? "bg-blue-50 text-[#4f6ef7]" : "bg-amber-50 text-amber-600"}`}>{u.level}</span>
                                                    </div>
                                                    <button onClick={() => handleDeleteWifiUsage(u.id)} className="text-gray-300 hover:text-red-400 transition-colors">
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                            <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ));
                        })()}
                    </div>
                </div>
            )}

            {/* ===== HISTORY TAB ===== */}
            {activeTab === "history" && (() => {
                // Group transactions by member + date + type
                const groups = [];
                const sorted = transactions.slice().sort((a, b) => new Date(b.date) - new Date(a.date));
                sorted.forEach(t => {
                    const dateStr = new Date(t.date).toLocaleDateString("id-ID");
                    const existing = groups.find(g => g.memberId === t.memberId && g.dateStr === dateStr && g.type === t.type);
                    if (existing) {
                        existing.items.push(t);
                        existing.total += t.amount;
                    } else {
                        groups.push({
                            memberId: t.memberId,
                            memberName: t.memberName,
                            type: t.type,
                            dateStr,
                            date: t.date,
                            items: [t],
                            total: t.amount,
                        });
                    }
                });

                return (
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                        <h2 className="text-sm font-semibold text-gray-700 mb-4">Riwayat Transaksi</h2>
                        <div className="space-y-2">
                            {groups.map((g, i) => (
                                <div key={i} className="p-3 rounded-lg bg-gray-50 hover:bg-gray-100/70 transition-colors">
                                    <div className="flex items-center justify-between mb-1.5">
                                        <div className="flex items-center gap-2">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${g.type === "kas" ? "bg-blue-50 text-[#4f6ef7]" : g.type === "pengeluaran" ? "bg-red-50 text-red-500" : "bg-purple-50 text-purple-500"
                                                }`}>{g.type.toUpperCase()}</span>
                                            <span className="text-sm font-medium text-gray-700">{g.memberName}</span>
                                        </div>
                                        <span className="text-xs text-gray-400">{g.dateStr}</span>
                                    </div>
                                    {g.items.length === 1 ? (
                                        <div className="flex items-center justify-between">
                                            <div className="text-xs text-gray-400">
                                                {g.items[0].month}
                                                {g.items[0].notes && g.items[0].notes !== `Import dari Excel (${g.items[0].status})` && (
                                                    <span className="ml-1.5 text-gray-300">· {g.items[0].notes}</span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className={`text-sm font-semibold ${g.type === "pengeluaran" ? "text-red-500" : "text-gray-700"}`}>{formatIDR(Math.abs(g.total))}</span>
                                                <button onClick={() => handleDeleteTx(g.items[0].id)} className="text-gray-300 hover:text-red-400 transition-colors">
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="space-y-0.5 mb-1.5">
                                                {g.items.map(t => (
                                                    <div key={t.id} className="flex items-center justify-between text-xs">
                                                        <span className="text-gray-400">{t.month}</span>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-gray-600">{formatIDR(Math.abs(t.amount))}</span>
                                                            <button onClick={() => handleDeleteTx(t.id)} className="text-gray-200 hover:text-red-400 transition-colors">
                                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                    <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                                                </svg>
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="flex justify-between pt-1.5 border-t border-gray-200/60">
                                                <span className="text-[11px] font-medium text-gray-500">{g.items.length} bulan</span>
                                                <span className={`text-sm font-bold ${g.type === "pengeluaran" ? "text-red-500" : "text-gray-700"}`}>{formatIDR(Math.abs(g.total))}</span>
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))}
                            {transactions.length === 0 && (
                                <p className="py-10 text-center text-gray-400 text-sm">Belum ada transaksi.</p>
                            )}
                        </div>
                    </div>
                );
            })()}
        </div>
    );
}
