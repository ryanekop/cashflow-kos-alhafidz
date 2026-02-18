"use client";

import { useEffect, useState } from "react";
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

  // ===== TIMELINE DATA =====
  const sortedTx = [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date));
  let runningBalance = 0;
  const timeline = sortedTx.map(tx => {
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

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-gray-800">Dashboard</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {cards.map((card, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-gray-500 font-medium">{card.title}</span>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: card.bg, color: card.color }}>{card.icon}</div>
            </div>
            <p className="text-xl font-semibold text-gray-800">{card.value}</p>
          </div>
        ))}
      </div>

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

          // WiFi debts from wifi-debts.json
          const myWifiDebts = wifiDebts.filter(d => d.memberId === m.id);
          const unpaidWifi = myWifiDebts.map(d => ({ month: d.month, amount: d.amount }));

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
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 sm:p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-1">Tunggakan Pembayaran</h3>
            <p className="text-xs text-gray-400 mb-4">Member yang belum bayar kas atau WiFi</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {arrears.map(a => (
                <div key={a.member.id} className="rounded-xl border border-red-100 overflow-hidden">
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
                        <div className="sm:columns-2 gap-x-3 space-y-0.5 pl-3.5">
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
                        <div className="sm:columns-2 gap-x-3 space-y-0.5 pl-3.5">
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
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Chart Kas */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
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
      </div>

      {/* ===== REKAP TABLE ===== */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <h3 className="text-sm font-semibold text-gray-700">Rekap Pembayaran {year}</h3>
          <div className="flex items-center gap-2">
            <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
              <button onClick={() => setActiveRekap("kas")} className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${activeRekap === "kas" ? "bg-white text-[#4f6ef7] shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>Kas</button>
              <button onClick={() => setActiveRekap("wifi")} className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${activeRekap === "wifi" ? "bg-white text-[#7c5cfc] shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>WiFi</button>
            </div>
            <div className="flex gap-1">
              <button onClick={() => setYear(y => y - 1)} className="w-7 h-7 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200 flex items-center justify-center text-xs transition-colors">←</button>
              <span className="text-xs text-gray-500 font-medium w-10 text-center leading-7">{year}</span>
              <button onClick={() => setYear(y => y + 1)} className="w-7 h-7 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200 flex items-center justify-center text-xs transition-colors">→</button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto -mx-5 px-5">
          <table className="w-full text-xs min-w-[700px]">
            <thead>
              <tr>
                <th className="text-left py-2 px-2 text-gray-400 font-medium sticky left-0 bg-white z-10">No.</th>
                <th className="text-left py-2 px-2 text-gray-400 font-medium sticky left-8 bg-white z-10 min-w-[100px]">Nama</th>
                {MONTHS.map((m, i) => (
                  <th key={i} className={`text-center py-2 px-1.5 font-medium min-w-[42px] ${new Date().getMonth() === i && new Date().getFullYear() === year ? "text-[#4f6ef7]" : "text-gray-400"
                    }`}>{m}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {currentRekap.map((row, idx) => (
                <tr key={row.member.id} className="border-t border-gray-50">
                  <td className="py-2 px-2 text-gray-400 sticky left-0 bg-white">{idx + 1}</td>
                  <td className="py-2 px-2 font-medium text-gray-700 sticky left-8 bg-white">{row.member.name}</td>
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
                </tr>
              ))}
              {members.length === 0 && (
                <tr><td colSpan={14} className="py-8 text-center text-gray-400">Belum ada member.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ===== TIMELINE KAS ===== */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 sm:p-5">
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
            <div className="space-y-2">
              {groups.map((g, i) => {
                const isExpense = g.type === "pengeluaran";
                return (
                  <div key={i} className={`p-3 rounded-lg ${isExpense ? "bg-red-50/50" : "bg-gray-50"}`}>
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
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>
    </div>
  );
}
