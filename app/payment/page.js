"use client";

import { useEffect, useState } from "react";

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

const inputCls = "w-full px-3 py-2.5 rounded-lg bg-white border border-gray-200 text-gray-800 text-sm focus:border-[#4f6ef7] focus:ring-1 focus:ring-[#4f6ef7] outline-none transition-colors";

const WA_NUMBER = "6283846451376";

export default function PaymentPage() {
    const [members, setMembers] = useState([]);
    const [wifiBills, setWifiBills] = useState([]);
    const [wifiUsage, setWifiUsage] = useState([]);
    const [transactions, setTransactions] = useState([]);

    const [selectedMember, setSelectedMember] = useState("");
    const [popup, setPopup] = useState(null);
    const [paymentMethod, setPaymentMethod] = useState("");

    // Multiple kas entries
    const [kasEntries, setKasEntries] = useState([{ month: "", status: "full" }]);
    // Multiple wifi entries
    const [wifiEntries, setWifiEntries] = useState([{ month: "" }]);

    const [loaded, setLoaded] = useState(false);

    // Load from localStorage on mount
    useEffect(() => {
        try {
            const saved = localStorage.getItem("payment_calc");
            if (saved) {
                const d = JSON.parse(saved);
                if (d.selectedMember) setSelectedMember(d.selectedMember);
                if (d.paymentMethod) setPaymentMethod(d.paymentMethod);
                if (d.kasEntries?.length) setKasEntries(d.kasEntries);
                if (d.wifiEntries?.length) setWifiEntries(d.wifiEntries);
            }
        } catch { }
        setLoaded(true);
    }, []);

    // Save to localStorage on change
    useEffect(() => {
        if (!loaded) return;
        localStorage.setItem("payment_calc", JSON.stringify({ selectedMember, paymentMethod, kasEntries, wifiEntries }));
    }, [selectedMember, paymentMethod, kasEntries, wifiEntries, loaded]);

    const clearSavedData = () => localStorage.removeItem("payment_calc");

    useEffect(() => {
        Promise.all([
            fetch("/api/members").then(r => r.json()),
            fetch("/api/wifi-bills").then(r => r.json()),
            fetch("/api/wifi-usage").then(r => r.json()),
            fetch("/api/transactions").then(r => r.json()),
        ]).then(([m, w, u, t]) => { setMembers(m); setWifiBills(w); setWifiUsage(u); setTransactions(t); });
    }, []);

    // Calculate kas amount for an entry
    const getKasAmount = (entry) => {
        if (!entry.month || !entry.status) return 0;
        return calculateKas(entry.month, entry.status);
    };

    // Calculate wifi amount for an entry
    const getWifiAmount = (entry) => {
        if (!entry.month || !selectedMember) return 0;
        const memberId = parseInt(selectedMember);
        const bill = wifiBills.find(b => b.month === entry.month);
        const monthUsage = wifiUsage.filter(u => u.month === entry.month);
        const fullUsers = monthUsage.filter(u => u.level === "full").length;
        const halfUsers = monthUsage.filter(u => u.level === "half").length;

        if (bill && (fullUsers + halfUsers) > 0) {
            const totalUnits = fullUsers + halfUsers * 0.75;
            const unitCost = bill.amount / totalUnits;
            const myUsage = monthUsage.find(u => u.memberId === memberId);
            if (myUsage) {
                return myUsage.level === "half" ? Math.round(unitCost * 0.75) : Math.round(unitCost);
            }
        }
        return 0;
    };

    const getWifiStatus = (entry) => {
        if (!entry.month || !selectedMember) return null;
        const memberId = parseInt(selectedMember);
        return wifiUsage.find(u => u.memberId === memberId && u.month === entry.month);
    };

    const totalKas = kasEntries.reduce((sum, e) => sum + getKasAmount(e), 0);
    const totalWifi = wifiEntries.reduce((sum, e) => sum + getWifiAmount(e), 0);
    const totalPayment = totalKas + totalWifi;

    // Add/remove entries
    const addKasEntry = () => setKasEntries([...kasEntries, { month: "", status: "full" }]);
    const removeKasEntry = (i) => setKasEntries(kasEntries.filter((_, idx) => idx !== i));
    const updateKasEntry = (i, field, val) => {
        const entries = [...kasEntries];
        entries[i] = { ...entries[i], [field]: val };
        setKasEntries(entries);
    };

    const addWifiEntry = () => setWifiEntries([...wifiEntries, { month: "" }]);
    const removeWifiEntry = (i) => setWifiEntries(wifiEntries.filter((_, idx) => idx !== i));
    const updateWifiEntry = (i, field, val) => {
        const entries = [...wifiEntries];
        entries[i] = { ...entries[i], [field]: val };
        setWifiEntries(entries);
    };

    const checkPaid = (type, month) => {
        if (!selectedMember) return false;
        return transactions.some(t => t.memberId === parseInt(selectedMember) && t.type === type && t.month === month);
    };

    const getMemberName = () => {
        const m = members.find(m => m.id === parseInt(selectedMember));
        return m ? m.name : "";
    };

    const paymentMethods = [
        { id: "bni", label: "BNI", color: "#f26522", desc: "Transfer via BNI" },
        { id: "shopeepay", label: "ShopeePay", color: "#ee4d2d", desc: "Via ShopeePay", short: "S" },
        { id: "gopay", label: "GoPay", color: "#00aed6", desc: "Via GoPay", short: "GP" },
        { id: "dana", label: "DANA", color: "#118eea", desc: "Via DANA", short: "D" },
    ];

    const handleWhatsApp = () => {
        if (!selectedMember) return setPopup({ title: "Perhatian", message: "Pilih nama kamu dulu!" });
        if (!paymentMethod) return setPopup({ title: "Perhatian", message: "Pilih metode pembayaran dulu!" });

        const activeKas = kasEntries.filter(e => e.month && getKasAmount(e) > 0);
        const activeWifi = wifiEntries.filter(e => e.month && getWifiAmount(e) > 0);

        if (activeKas.length === 0 && activeWifi.length === 0) {
            return setPopup({ title: "Perhatian", message: "Pilih minimal satu bulan untuk kas atau WiFi!" });
        }

        // Check already paid
        const issues = [];
        activeKas.forEach(e => { if (checkPaid("kas", e.month)) issues.push(`Kas ${e.month}`); });
        activeWifi.forEach(e => { if (checkPaid("wifi", e.month)) issues.push(`WiFi ${e.month}`); });
        if (issues.length > 0) {
            return setPopup({ title: "Sudah Bayar ✓", message: `${issues.join(", ")} sudah dibayar.` });
        }

        // Check wifi usage filled
        for (const e of activeWifi) {
            if (!getWifiStatus(e)) {
                return setPopup({ title: "Isi WiFi Dulu", message: `Kamu belum mengisi pemakaian WiFi bulan ${e.month}. Isi dulu di halaman 'Isi WiFi'.` });
            }
        }

        const name = getMemberName();
        const method = paymentMethods.find(m => m.id === paymentMethod);
        let parts = [];
        if (activeKas.length > 0) {
            const kasMonths = activeKas.map(e => e.month).join(", ");
            parts.push(`kas bulan ${kasMonths} (${formatIDR(totalKas)})`);
        }
        if (activeWifi.length > 0) {
            const wifiMonths = activeWifi.map(e => e.month).join(", ");
            parts.push(`wifi bulan ${wifiMonths} (${formatIDR(totalWifi)})`);
        }

        const text = encodeURIComponent(`Halo mas, saya ${name} mau bayar ${parts.join(" dan ")} total ${formatIDR(totalPayment)} via ${method.label} ini ya buktinya.`);
        window.open(`https://wa.me/${WA_NUMBER}?text=${text}`, "_blank");
        clearSavedData();
    };

    return (
        <div className="max-w-xl mx-auto space-y-5">
            {popup && (
                <div className="modal-overlay" onClick={() => setPopup(null)}>
                    <div className="modal-box" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-2 mb-3">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#e8a500" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                            </svg>
                            <h3 className="text-base font-semibold text-gray-800">{popup.title}</h3>
                        </div>
                        <p className="text-sm text-gray-600 mb-4">{popup.message}</p>
                        <button onClick={() => setPopup(null)} className="w-full py-2 rounded-lg bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 transition-colors">Tutup</button>
                    </div>
                </div>
            )}

            <div className="text-center">
                <h1 className="text-xl font-semibold text-gray-800">Kalkulator Pembayaran</h1>
                <p className="text-sm text-gray-400 mt-1">Hitung tagihan lalu hubungi via WhatsApp</p>
            </div>

            {/* Select Member */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <label className="block text-xs text-gray-500 mb-1.5">Siapa kamu?</label>
                <select value={selectedMember} onChange={e => setSelectedMember(e.target.value)} className={inputCls}>
                    <option value="">Pilih Namamu...</option>
                    {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
            </div>

            {/* ===== KAS (multiple entries) ===== */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4f6ef7" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" /><path d="M3 5v14a2 2 0 0 0 2 2h16v-5" /><path d="M18 12a2 2 0 0 0 0 4h4v-4z" />
                        </svg>
                        Kas Kos
                    </h2>
                    <button onClick={addKasEntry} className="text-xs text-[#4f6ef7] hover:text-[#4060e0] font-medium transition-colors flex items-center gap-1">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                        Tambah Bulan
                    </button>
                </div>

                {kasEntries.map((entry, i) => (
                    <div key={i} className="space-y-2">
                        {kasEntries.length > 1 && (
                            <div className="flex items-center justify-between">
                                <span className="text-[11px] text-gray-400 font-medium">Kas #{i + 1}</span>
                                <button onClick={() => removeKasEntry(i)} className="text-gray-300 hover:text-red-400 transition-colors">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                                </button>
                            </div>
                        )}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs text-gray-500 mb-1.5">Bulan</label>
                                <input type="month" value={entry.month} onChange={e => updateKasEntry(i, "month", e.target.value)} className={inputCls} />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 mb-1.5">Status</label>
                                <select value={entry.status} onChange={e => updateKasEntry(i, "status", e.target.value)} className={inputCls}>
                                    <option value="full">Di kos (Full)</option>
                                    <option value="half">Setengah bulan</option>
                                    <option value="none">Tidak di kos</option>
                                </select>
                            </div>
                        </div>
                        {entry.month && (
                            <div className="flex items-center justify-between p-2.5 rounded-lg bg-blue-50/60 border border-blue-100">
                                <span className="text-xs text-gray-500">Subtotal</span>
                                <span className="text-sm font-semibold text-gray-800">{formatIDR(getKasAmount(entry))}</span>
                            </div>
                        )}
                    </div>
                ))}

                {totalKas > 0 && kasEntries.length > 1 && (
                    <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50 border border-blue-200">
                        <span className="text-sm text-gray-600 font-medium">Total Kas</span>
                        <span className="text-lg font-semibold text-gray-800">{formatIDR(totalKas)}</span>
                    </div>
                )}
            </div>

            {/* ===== WIFI (multiple entries, auto-detect) ===== */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7c5cfc" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M5 12.55a11 11 0 0 1 14.08 0" /><path d="M1.42 9a16 16 0 0 1 21.16 0" /><path d="M8.53 16.11a6 6 0 0 1 6.95 0" /><line x1="12" y1="20" x2="12.01" y2="20" />
                        </svg>
                        WiFi
                    </h2>
                    <button onClick={addWifiEntry} className="text-xs text-[#7c5cfc] hover:text-[#6b4fe0] font-medium transition-colors flex items-center gap-1">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                        Tambah Bulan
                    </button>
                </div>

                {wifiEntries.map((entry, i) => (
                    <div key={i} className="space-y-2">
                        {wifiEntries.length > 1 && (
                            <div className="flex items-center justify-between">
                                <span className="text-[11px] text-gray-400 font-medium">WiFi #{i + 1}</span>
                                <button onClick={() => removeWifiEntry(i)} className="text-gray-300 hover:text-red-400 transition-colors">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                                </button>
                            </div>
                        )}
                        <div>
                            <label className="block text-xs text-gray-500 mb-1.5">Bulan</label>
                            <input type="month" value={entry.month} onChange={e => updateWifiEntry(i, "month", e.target.value)} className={inputCls} />
                        </div>
                        {entry.month && selectedMember && (() => {
                            const usage = getWifiStatus(entry);
                            const amount = getWifiAmount(entry);
                            if (usage) {
                                return (
                                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-purple-50/60 border border-purple-100">
                                        <div>
                                            <span className="text-xs text-gray-500">Subtotal</span>
                                            <p className="text-[10px] text-gray-400">{usage.level === "full" ? "Full" : "Setengah"}</p>
                                        </div>
                                        {amount > 0 ? (
                                            <span className="text-sm font-semibold text-gray-800">{formatIDR(amount)}</span>
                                        ) : (
                                            <span className="text-[11px] text-amber-600">Tagihan belum diinput admin</span>
                                        )}
                                    </div>
                                );
                            } else {
                                return (
                                    <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-100 text-xs text-amber-700">
                                        Belum isi pemakaian WiFi bulan ini. <a href="/wifi" className="underline font-medium hover:text-amber-800">Isi di sini →</a>
                                    </div>
                                );
                            }
                        })()}
                    </div>
                ))}

                {totalWifi > 0 && wifiEntries.length > 1 && (
                    <div className="flex items-center justify-between p-3 rounded-lg bg-purple-50 border border-purple-200">
                        <span className="text-sm text-gray-600 font-medium">Total WiFi</span>
                        <span className="text-lg font-semibold text-gray-800">{formatIDR(totalWifi)}</span>
                    </div>
                )}
            </div>

            {/* ===== TOTAL ===== */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <div className="flex justify-between items-center mb-3">
                    <span className="text-sm font-semibold text-gray-700">Total Pembayaran</span>
                    <span className="text-2xl font-bold text-gray-800">{formatIDR(totalPayment)}</span>
                </div>
                {totalKas > 0 && (
                    <div className="flex justify-between text-sm text-gray-500">
                        <span>Kas ({kasEntries.filter(e => e.month).map(e => e.month).join(", ")})</span>
                        <span>{formatIDR(totalKas)}</span>
                    </div>
                )}
                {totalWifi > 0 && (
                    <div className="flex justify-between text-sm text-gray-500">
                        <span>WiFi ({wifiEntries.filter(e => e.month).map(e => e.month).join(", ")})</span>
                        <span>{formatIDR(totalWifi)}</span>
                    </div>
                )}
            </div>

            {/* ===== PAYMENT METHOD ===== */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
                <h3 className="text-sm font-semibold text-gray-700">Metode Pembayaran</h3>
                <div className="grid grid-cols-2 sm:grid-cols-2 gap-2.5">
                    {paymentMethods.map(m => (
                        <button key={m.id} onClick={() => setPaymentMethod(m.id)}
                            className={`p-3 rounded-lg border text-left transition-all ${paymentMethod === m.id
                                ? "bg-white border-[#4f6ef7] ring-1 ring-[#4f6ef7] shadow-sm"
                                : "bg-gray-50 border-gray-100 hover:border-gray-200"
                                }`}>
                            <div className="flex items-center gap-2 mb-1">
                                <div className="w-6 h-6 rounded flex items-center justify-center" style={{ background: m.color }}>
                                    <span className="text-white text-[8px] font-bold">{m.short || m.label}</span>
                                </div>
                                <span className="text-sm font-medium text-gray-700">{m.label}</span>
                                {paymentMethod === m.id && (
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4f6ef7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="ml-auto">
                                        <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                )}
                            </div>
                            <p className="text-[11px] text-gray-400">{m.desc}</p>
                        </button>
                    ))}
                </div>
                <button onClick={handleWhatsApp} className="w-full py-3 rounded-lg bg-[#25D366] text-white text-sm font-medium hover:bg-[#1fb855] transition-colors flex items-center justify-center gap-2">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                    Kirim Bukti via WhatsApp
                </button>
            </div>

            {/* Tarif Info */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-3">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
                    </svg>
                    Informasi Tarif Kas
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div className="p-3 rounded-lg bg-gray-50">
                        <p className="text-xs text-gray-400 mb-2 font-medium">Sebelum Juli 2025</p>
                        <ul className="space-y-1 text-gray-600 text-xs">
                            <li>Di kos (Full): <span className="font-medium text-gray-700">Rp25.000</span></li>
                            <li>Setengah bulan: <span className="font-medium text-gray-700">Rp12.500</span></li>
                            <li>Tidak di kos: <span className="font-medium text-gray-700">Rp10.000</span></li>
                        </ul>
                    </div>
                    <div className="p-3 rounded-lg bg-gray-50">
                        <p className="text-xs text-gray-400 mb-2 font-medium">Mulai Juli 2025</p>
                        <ul className="space-y-1 text-gray-600 text-xs">
                            <li>Di kos (Full): <span className="font-medium text-gray-700">Rp30.000</span></li>
                            <li>Setengah bulan: <span className="font-medium text-gray-700">Rp15.000</span></li>
                            <li>Tidak di kos: <span className="font-medium text-gray-700">Rp10.000</span></li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}
