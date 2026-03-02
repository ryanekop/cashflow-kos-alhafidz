"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

function formatIDR(n) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency", currency: "IDR",
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(n);
}

function formatIDRShort(n) {
  if (n >= 1000) return `${n / 1000}`;
  return String(n);
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i = 0) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.45, delay: i * 0.1, ease: [0.25, 0.46, 0.45, 0.94] },
  }),
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.5 } },
};

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [members, setMembers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());
  const [activeRekap, setActiveRekap] = useState("kas");
  const [wifiUsage, setWifiUsage] = useState([]);
  const [wifiBills, setWifiBills] = useState([]);
  const [wifiDebts, setWifiDebts] = useState([]);

  useEffect(() => {
    Promise.all([
      fetch("/api/summary").then(r => r.json()),
      fetch("/api/members").then(r => r.json()),
      fetch("/api/transactions").then(r => r.json()),
      fetch("/api/wifi-usage").then(r => r.json()),
      fetch("/api/wifi-bills").then(r => r.json()),
      fetch("/api/wifi-debts").then(r => r.json()),
    ]).then(([s, m, t, wu, wb, wd]) => {
      setData(s); setMembers(m); setTransactions(t); setWifiUsage(wu); setWifiBills(wb); setWifiDebts(wd); setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-8 h-8 border-2 border-gray-300 border-t-[#4f6ef7] rounded-full animate-spin" />
      </div>
    );
  }

  // Chart — Kas + Pengeluaran
  const chartData = data?.chartData?.length > 0
    ? data.chartData.map(d => ({ name: d.name, kas: d.kas, pengeluaran: d.pengeluaran || 0 }))
    : MONTHS.slice(0, 6).map(m => ({ name: m, kas: 0, pengeluaran: 0 }));

  const cards = [
    {
      title: "Saldo Kas", value: formatIDR(data?.kasBalance || 0),
      bg: data?.kasBalance >= 0 ? "#eef1fe" : "#fef2f2", color: data?.kasBalance >= 0 ? "#4f6ef7" : "#ef4444",
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" /><path d="M3 5v14a2 2 0 0 0 2 2h16v-5" /><path d="M18 12a2 2 0 0 0 0 4h4v-4z" /></svg>,
    },
    {
      title: "Total Pemasukan", value: formatIDR(data?.totalPemasukan || 0),
      bg: "#ecf7ef", color: "#34a853",
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg>,
    },
    {
      title: "Total Pengeluaran", value: formatIDR(data?.totalPengeluaran || 0),
      bg: "#fef2f2", color: "#ef4444",
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6" /><polyline points="17 18 23 18 23 12" /></svg>,
    },
  ];

  // ===== REKAP GRID DATA =====
  const monthKeys = MONTHS.map((_, i) => `${year}-${String(i + 1).padStart(2, "0")}`);

  const getRekapData = (type) => {
    return members.map(m => {
      const row = { member: m };
      monthKeys.forEach((mk, i) => {
        const tx = transactions.find(t => t.memberId === m.id && t.type === type && t.month === mk);
        row[`m${i}`] = tx ? tx.amount : null;
      });
      return row;
    });
  };

  const kasRekap = getRekapData("kas");
  const wifiRekap = getRekapData("wifi");
  const currentRekap = activeRekap === "kas" ? kasRekap : wifiRekap;

  // ===== TIMELINE DATA (Kas + Pengeluaran only, no WiFi) =====
  const kasTx = [...transactions].filter(tx => tx.type !== 'wifi').sort((a, b) => new Date(a.date) - new Date(b.date));
  let runningBalance = 0;
  const timeline = kasTx.map(tx => {
    const isExpense = tx.type === 'pengeluaran';
    const debit = isExpense ? 0 : tx.amount;
    const kredit = isExpense ? Math.abs(tx.amount) : 0;
    runningBalance += debit - kredit;
    return { ...tx, debit, kredit, saldo: runningBalance };
  });

  // Group timeline by month
  const timelineByMonth = {};
  timeline.forEach(tx => {
    const monthLabel = tx.month || "Unknown";
    if (!timelineByMonth[monthLabel]) timelineByMonth[monthLabel] = [];
    timelineByMonth[monthLabel].push(tx);
  });

  // ===== WIFI HISTORY DATA (separate) =====
  const wifiTxList = [...transactions].filter(tx => tx.type === 'wifi').sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <div className="space-y-6">
      <motion.h1
        className="text-xl font-semibold text-gray-800"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        Dashboard
      </motion.h1>

      {/* Summary Cards */}
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-3 gap-4"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        {cards.map((card, i) => (
          <motion.div
            key={i}
            className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm"
            variants={fadeUp}
            custom={i}
            whileHover={{ y: -4, boxShadow: "0 8px 25px rgba(0,0,0,0.08)" }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-gray-500 font-medium">{card.title}</span>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: card.bg, color: card.color }}>{card.icon}</div>
            </div>
            <p className="text-xl font-semibold text-gray-800">{card.value}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* ===== TUNGGAKAN (ARREARS) ===== */}
      {(() => {
        // Helper: generate months from start to end
        const genMonths = (start, end) => {
          const months = [];
          const [sy, sm] = start.split("-").map(Number);
          const [ey, em] = end.split("-").map(Number);
          let y = sy, m = sm;
          while (y < ey || (y === ey && m <= em)) {
            months.push(`${y}-${String(m).padStart(2, "0")}`);
            m++; if (m > 12) { m = 1; y++; }
          }
          return months;
        };

        const now = new Date();
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
        const formatMon = (m) => {
          const d = new Date(m + "-01");
          return d.toLocaleDateString("id-ID", { month: "short", year: "numeric" });
        };

        const calcKas = (monthStr, status) => {
          const date = new Date(monthStr + "-01");
          const july2025 = new Date("2025-07-01");
          if (status === "none") return 10000;
          if (date >= july2025) return status === "full" ? 30000 : 15000;
          return status === "full" ? 25000 : 12500;
        };

        const arrears = [];

        // Process existing members
        members.forEach(m => {
          const kasTx = transactions.filter(t => t.memberId === m.id && t.type === "kas");
          let unpaidKas = [];

          if (kasTx.length > 0) {
            const firstMonth = kasTx.map(t => t.month).sort()[0];
            const allMonths = genMonths(firstMonth, currentMonth);
            const paidKasMonths = new Set(kasTx.map(t => t.month));
            unpaidKas = allMonths
              .filter(mo => !paidKasMonths.has(mo))
              .map(mo => ({ month: mo, amount: calcKas(mo, m.status) }));
          }

          // WiFi debts from wifi-debts.json (manually entered, historical)
          const myWifiDebts = wifiDebts.filter(d => d.memberId === m.id);
          const unpaidWifi = myWifiDebts.map(d => ({ month: d.month, amount: d.amount }));

          // Also compute WiFi debts from wifi-bills + wifi-usage (auto-calculated)
          // For months that have a bill and usage data but no wifi transaction yet
          const paidWifiMonths = new Set([
            ...transactions.filter(t => t.memberId === m.id && t.type === "wifi").map(t => t.month),
            ...unpaidWifi.map(w => w.month), // don't duplicate with manual debts
          ]);
          wifiBills.forEach(bill => {
            if (paidWifiMonths.has(bill.month)) return;
            const monthUsage = wifiUsage.filter(u => u.month === bill.month);
            const myUsage = monthUsage.find(u => u.memberId === m.id);
            if (!myUsage) return; // member didn't use WiFi this month
            const fullUsers = monthUsage.filter(u => u.level === "full").length;
            const halfUsers = monthUsage.filter(u => u.level === "half").length;
            if (fullUsers + halfUsers === 0) return;
            const totalUnits = fullUsers + halfUsers * 0.75;
            const unitCost = bill.amount / totalUnits;
            const amount = myUsage.level === "half" ? Math.round(unitCost * 0.75) : Math.round(unitCost);
            unpaidWifi.push({ month: bill.month, amount });
          });

          if (unpaidKas.length > 0 || unpaidWifi.length > 0) {
            arrears.push({
              member: m,
              unpaidKas,
              unpaidWifi,
              totalKas: unpaidKas.reduce((s, e) => s + e.amount, 0),
              totalWifi: unpaidWifi.reduce((s, e) => s + e.amount, 0),
            });
          }
        });

        // Add wifi debts for non-members (e.g. Aziz who left)
        const nonMemberDebts = wifiDebts.filter(d => d.memberId === 0 || !members.find(m => m.id === d.memberId));
        const grouped = {};
        nonMemberDebts.forEach(d => {
          if (!grouped[d.memberName]) grouped[d.memberName] = [];
          grouped[d.memberName].push({ month: d.month, amount: d.amount });
        });
        Object.entries(grouped).forEach(([name, debts]) => {
          arrears.push({
            member: { id: name, name, status: "none" },
            unpaidKas: [],
            unpaidWifi: debts,
            totalKas: 0,
            totalWifi: debts.reduce((s, e) => s + e.amount, 0),
          });
        });

        if (arrears.length === 0) return null;

        // Sort arrears by total owed (highest first)
        arrears.sort((a, b) => (b.totalKas + b.totalWifi) - (a.totalKas + a.totalWifi));

        return (
          <motion.div
            className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 sm:p-5"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <h3 className="text-sm font-semibold text-gray-700 mb-1">Tunggakan Pembayaran</h3>
            <p className="text-xs text-gray-400 mb-4">Member yang belum bayar kas atau WiFi</p>
            <motion.div
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3"
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
            >
              {arrears.map((a, idx) => (
                <motion.div
                  key={a.member.id}
                  className="rounded-xl border border-red-100 overflow-hidden"
                  variants={fadeUp}
                  custom={idx}
                  whileHover={{ scale: 1.02, boxShadow: "0 4px 16px rgba(239,68,68,0.1)" }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between px-3.5 py-2.5 bg-red-50/70">
                    <div className="flex items-center gap-2">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0 ${a.member.status === "full" ? "bg-[#34a853]" : a.member.status === "half" ? "bg-[#e8a500]" : "bg-gray-400"}`}>
                        {a.member.name.substring(0, 2).toUpperCase()}
                      </div>
                      <span className="text-sm font-semibold text-gray-800 truncate">{a.member.name}</span>
                    </div>
                    <span className="text-sm font-bold text-red-500 whitespace-nowrap ml-2">{formatIDR(a.totalKas + a.totalWifi)}</span>
                  </div>
                  {/* Body */}
                  <div className="px-3.5 py-2.5 space-y-2">
                    {a.unpaidKas.length > 0 && (
                      <div>
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <span className="w-2 h-2 rounded-full bg-red-400 shrink-0" />
                          <span className="text-[11px] font-semibold text-gray-600">Kas ({a.unpaidKas.length} bulan · {formatIDR(a.totalKas)})</span>
                        </div>
                        <div className="space-y-0.5 pl-3.5">
                          {a.unpaidKas.map(e => (
                            <div key={e.month} className="flex justify-between text-[11px] break-inside-avoid">
                              <span className="text-gray-500">{formatMon(e.month)}</span>
                              <span className="text-red-500 font-medium">{formatIDR(e.amount)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {a.unpaidWifi.length > 0 && (
                      <div>
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <span className="w-2 h-2 rounded-full bg-purple-400 shrink-0" />
                          <span className="text-[11px] font-semibold text-gray-600">WiFi ({a.unpaidWifi.length} bulan · {formatIDR(a.totalWifi)})</span>
                        </div>
                        <div className="space-y-0.5 pl-3.5">
                          {a.unpaidWifi.map(e => (
                            <div key={e.month} className="flex justify-between text-[11px] break-inside-avoid">
                              <span className="text-gray-500">{formatMon(e.month)}</span>
                              <span className="text-purple-500 font-medium">{formatIDR(e.amount)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        );
      })()}

      {/* Chart Kas */}
      <motion.div
        className="bg-white rounded-xl border border-gray-100 shadow-sm p-5"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Pemasukan Kas</h3>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#9ca3af" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${v / 1000}k`} />
              <Tooltip contentStyle={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: "10px", fontSize: "13px", boxShadow: "0 4px 12px rgba(0,0,0,0.06)" }} formatter={(v) => formatIDR(v)} />
              <Bar dataKey="kas" name="Kas" fill="#4f6ef7" radius={[5, 5, 0, 0]} />
              <Bar dataKey="pengeluaran" name="Pengeluaran" fill="#ef4444" radius={[5, 5, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* ===== REKAP TABLE ===== */}
      <motion.div
        className="bg-white rounded-xl border border-gray-100 shadow-sm p-5"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
      >
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Rekap Pembayaran {year}</h3>
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
            <button onClick={() => setActiveRekap("kas")} className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${activeRekap === "kas" ? "bg-white text-[#4f6ef7] shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>Kas</button>
            <button onClick={() => setActiveRekap("wifi")} className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${activeRekap === "wifi" ? "bg-white text-[#7c5cfc] shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>WiFi</button>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setYear(y => y - 1)} className="w-7 h-7 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200 flex items-center justify-center text-xs transition-colors">←</button>
            <span className="text-xs text-gray-500 font-medium w-10 text-center leading-7">{year}</span>
            <button onClick={() => setYear(y => y + 1)} className="w-7 h-7 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200 flex items-center justify-center text-xs transition-colors">→</button>
          </div>
        </div>

        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-xs" style={{ minWidth: 700 }}>
            <thead>
              <tr>
                <th className="text-left py-2 px-2 text-gray-400 font-medium sticky left-0 bg-white z-20 w-[36px]">No.</th>
                <th className="text-left py-2 px-2 text-gray-400 font-medium sticky left-[36px] bg-white z-20 min-w-[100px]" style={{ boxShadow: '4px 0 8px -2px rgba(0,0,0,0.06)' }}>Nama</th>
                {MONTHS.map((m, i) => (
                  <th key={i} className={`text-center py-2 px-1.5 font-medium min-w-[42px] ${new Date().getMonth() === i && new Date().getFullYear() === year ? "text-[#4f6ef7]" : "text-gray-400"
                    }`}>{m}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {currentRekap.map((row, idx) => (
                <motion.tr
                  key={row.member.id}
                  className="border-t border-gray-50"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: idx * 0.03 }}
                >
                  <td className="py-2 px-2 text-gray-400 sticky left-0 bg-white z-20">{idx + 1}</td>
                  <td className="py-2 px-2 font-medium text-gray-700 sticky left-[36px] bg-white z-20" style={{ boxShadow: '4px 0 8px -2px rgba(0,0,0,0.06)' }}>{row.member.name}</td>
                  {MONTHS.map((_, i) => {
                    const val = row[`m${i}`];
                    return (
                      <td key={i} className={`text-center py-2 px-1.5 ${val !== null ? "font-medium text-gray-700" : ""}`}
                        style={{ background: val !== null ? (activeRekap === "kas" ? "#eef1fe" : "#f3eefe") : undefined }}
                      >
                        {val !== null ? formatIDRShort(val) : ""}
                      </td>
                    );
                  })}
                </motion.tr>
              ))}
              {members.length === 0 && (
                <tr><td colSpan={14} className="py-8 text-center text-gray-400">Belum ada member.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* ===== TIMELINE KAS ===== */}
      <motion.div
        className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 sm:p-5"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.6 }}
      >
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Timeline Kas {year}</h3>
        {(() => {
          const yearTxs = timeline.filter(tx => new Date(tx.date).getFullYear() === year);
          if (yearTxs.length === 0) return <p className="py-8 text-center text-gray-400 text-sm">Belum ada transaksi di tahun {year}.</p>;

          // Group by member + date + type
          const groups = [];
          yearTxs.forEach(tx => {
            const dateStr = new Date(tx.date).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
            const existing = groups.find(g => g.memberId === tx.memberId && g.dateStr === dateStr && g.type === tx.type);
            if (existing) {
              existing.items.push(tx);
              existing.totalDebit += tx.debit;
              existing.totalKredit += tx.kredit;
              existing.lastSaldo = tx.saldo;
            } else {
              groups.push({
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

          return (
            <motion.div
              className="space-y-2"
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
            >
              {groups.map((g, i) => {
                const isExpense = g.type === "pengeluaran";
                return (
                  <motion.div
                    key={i}
                    className={`p-3 rounded-lg ${isExpense ? "bg-red-50/50" : "bg-gray-50"}`}
                    variants={fadeUp}
                    custom={i}
                    whileHover={{ x: 4, boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`shrink-0 px-2 py-0.5 rounded text-[10px] font-semibold ${isExpense ? "bg-red-100 text-red-500" : g.type === "wifi" ? "bg-purple-50 text-purple-500" : "bg-blue-50 text-[#4f6ef7]"
                          }`}>{g.type === "pengeluaran" ? "OUT" : g.type.toUpperCase()}</span>
                        <span className="text-sm font-medium text-gray-700 truncate">{g.memberName}</span>
                      </div>
                      <span className="text-[11px] text-gray-400 whitespace-nowrap ml-2">{g.dateStr}</span>
                    </div>
                    {g.items.length === 1 ? (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400">{g.items[0].notes || g.items[0].month}</span>
                        <div className="flex items-center gap-3">
                          <span className={`text-sm font-semibold ${isExpense ? "text-red-500" : "text-green-600"}`}>
                            {isExpense ? `-${formatIDR(g.totalKredit)}` : `+${formatIDR(g.totalDebit)}`}
                          </span>
                          <span className="text-xs text-gray-400">Saldo: {formatIDR(g.lastSaldo)}</span>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="space-y-0.5 mb-1.5">
                          {g.items.map(tx => (
                            <div key={tx.id} className="flex items-center justify-between text-xs">
                              <span className="text-gray-400">{tx.month}</span>
                              <span className={isExpense ? "text-red-500" : "text-green-600"}>{formatIDR(isExpense ? tx.kredit : tx.debit)}</span>
                            </div>
                          ))}
                        </div>
                        <div className="flex justify-between pt-1.5 border-t border-gray-200/60">
                          <span className="text-[11px] font-medium text-gray-500">{g.items.length} bulan</span>
                          <div className="flex items-center gap-3">
                            <span className={`text-sm font-bold ${isExpense ? "text-red-500" : "text-green-600"}`}>
                              {isExpense ? `-${formatIDR(g.totalKredit)}` : `+${formatIDR(g.totalDebit)}`}
                            </span>
                            <span className="text-xs text-gray-400">Saldo: {formatIDR(g.lastSaldo)}</span>
                          </div>
                        </div>
                      </>
                    )}
                  </motion.div>
                );
              })}
            </motion.div>
          );
        })()}
      </motion.div>

      {/* ===== RIWAYAT WIFI (separate from Kas timeline) ===== */}
      {wifiTxList.length > 0 && (
        <motion.div
          className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 sm:p-5"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.7 }}
        >
          <div className="flex items-center gap-2 mb-4">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-400 shrink-0" />
            <h3 className="text-sm font-semibold text-gray-700">Riwayat WiFi</h3>
            <span className="text-[10px] text-gray-400 ml-auto">tidak dihitung ke saldo kas</span>
          </div>
          <motion.div
            className="space-y-2"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            {(() => {
              // Group wifi tx by member + date
              const wifiGroups = [];
              wifiTxList.forEach(tx => {
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

              return wifiGroups.map((g, i) => (
                <motion.div
                  key={i}
                  className="p-3 rounded-lg bg-purple-50/50"
                  variants={fadeUp}
                  custom={i}
                  whileHover={{ x: 4, boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="shrink-0 px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-50 text-purple-500">WIFI</span>
                      <span className="text-sm font-medium text-gray-700 truncate">{g.memberName}</span>
                    </div>
                    <span className="text-[11px] text-gray-400 whitespace-nowrap ml-2">{g.dateStr}</span>
                  </div>
                  {g.items.length === 1 ? (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">{g.items[0].notes || g.items[0].month}</span>
                      <span className="text-sm font-semibold text-purple-600">{formatIDR(g.totalAmount)}</span>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-0.5 mb-1.5">
                        {g.items.map(tx => (
                          <div key={tx.id} className="flex items-center justify-between text-xs">
                            <span className="text-gray-400">{tx.month}</span>
                            <span className="text-purple-600">{formatIDR(tx.amount)}</span>
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-between pt-1.5 border-t border-purple-200/60">
                        <span className="text-[11px] font-medium text-gray-500">{g.items.length} bulan</span>
                        <span className="text-sm font-bold text-purple-600">{formatIDR(g.totalAmount)}</span>
                      </div>
                    </>
                  )}
                </motion.div>
              ));
            })()}
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
