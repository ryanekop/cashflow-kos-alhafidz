"use client";

import { useEffect, useState } from "react";

export default function WifiPage() {
    const [members, setMembers] = useState([]);
    const [wifiBills, setWifiBills] = useState([]);
    const [wifiUsage, setWifiUsage] = useState([]);
    const [selectedMember, setSelectedMember] = useState("");
    const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
    const [level, setLevel] = useState("full");
    const [popup, setPopup] = useState(null);
    const [successMsg, setSuccessMsg] = useState("");

    const inputCls = "w-full px-3 py-2.5 rounded-lg bg-white border border-gray-200 text-gray-800 text-sm focus:border-[#4f6ef7] focus:ring-1 focus:ring-[#4f6ef7] outline-none transition-colors";

    const monthOptions = (() => {
        const options = [];
        const now = new Date();
        for (let i = -12; i <= 6; i++) {
            const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
            const val = d.toISOString().slice(0, 7);
            const label = d.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
            options.push({ value: val, label });
        }
        return options;
    })();

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
            {popup && (
                <div className="modal-overlay" onClick={() => setPopup(null)}>
                    <div className="modal-box" onClick={e => e.stopPropagation()}>
                        <h3 className="text-base font-semibold text-gray-800 mb-2">{popup.title}</h3>
                        <p className="text-sm text-gray-600 mb-4">{popup.message}</p>
                        <button onClick={() => setPopup(null)} className="w-full py-2 rounded-lg bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 transition-colors">Tutup</button>
                    </div>
                </div>
            )}

            {successMsg && (
                <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm">✓ {successMsg}</div>
            )}

            <div className="text-center">
                <h1 className="text-xl font-semibold text-gray-800">Isi Pemakaian WiFi</h1>
                <p className="text-sm text-gray-400 mt-1">Isi apakah kamu pakai WiFi bulan ini</p>
            </div>

            {/* Form */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
                <div>
                    <label className="block text-xs text-gray-500 mb-1.5">Siapa kamu?</label>
                    <select value={selectedMember} onChange={e => setSelectedMember(e.target.value)} className={inputCls}>
                        <option value="">Pilih Namamu...</option>
                        {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs text-gray-500 mb-1.5">Bulan</label>
                        <select value={month} onChange={e => setMonth(e.target.value)} className={inputCls}>
                            <option value="">Pilih Bulan...</option>
                            {monthOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs text-gray-500 mb-1.5">Pakai WiFi bulan ini?</label>
                        <select value={level} onChange={e => setLevel(e.target.value)} className={inputCls}>
                            <option value="full">Full (sebulan penuh)</option>
                            <option value="half">Setengah bulan</option>
                        </select>
                    </div>
                </div>

                <button onClick={handleSubmit} className="w-full py-2.5 rounded-lg bg-[#7c5cfc] text-white text-sm font-medium hover:bg-[#6b4fe0] transition-colors">
                    Simpan Pemakaian WiFi
                </button>
            </div>

            {/* Preview */}
            {bill && (fullUsers + halfUsers) > 0 && selectedMember && (
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7c5cfc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="4" y="2" width="16" height="20" rx="2" /><line x1="8" y1="6" x2="16" y2="6" />
                        </svg>
                        Perkiraan Tagihan WiFi
                    </h3>
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between text-gray-500">
                            <span>Total tagihan bulan ini</span>
                            <span className="font-medium text-gray-700">{formatIDR(bill.amount)}</span>
                        </div>
                        <div className="flex justify-between text-gray-500">
                            <span>Pengguna: {fullUsers} full, {halfUsers} setengah</span>
                            <span className="text-xs text-gray-400">({fullUsers + halfUsers} orang)</span>
                        </div>
                        <div className="border-t border-gray-100 pt-2 flex justify-between">
                            <span className="text-gray-600 font-medium">Kamu bayar</span>
                            <span className="text-lg font-semibold text-gray-800">{formatIDR(previewAmount)}</span>
                        </div>
                    </div>
                </div>
            )}

            {!bill && month && (
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                    <p className="text-sm text-amber-600 text-center">Tagihan WiFi bulan {month} belum diinput admin</p>
                </div>
            )}

            {/* Who filled in */}
            {monthUsage.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Yang sudah isi ({month})</h3>
                    <div className="space-y-1.5">
                        {monthUsage.map(u => (
                            <div key={u.id} className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 text-sm">
                                <span className="text-gray-700 font-medium">{u.memberName}</span>
                                <div className="flex items-center gap-2">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${u.level === "full" ? "bg-blue-50 text-[#4f6ef7] border border-blue-200" : "bg-amber-50 text-amber-600 border border-amber-200"
                                        }`}>{u.level === "full" ? "FULL" : "SETENGAH"}</span>
                                    <button onClick={() => handleDeleteUsage(u.id, u.memberName)} className="text-gray-300 hover:text-red-400 transition-colors">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

function formatIDR(n) {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
}
