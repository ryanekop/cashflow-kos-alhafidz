"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import { Card } from "@/components/ui/card";
import PageHeading from "@/components/ui/page-heading";
import { MONTH_LABELS } from "@/lib/shared/constants";
import { formatIDR, formatIDRShort, formatMonthLabel } from "@/lib/shared/format";

const DashboardChart = dynamic(() => import("@/features/dashboard/DashboardChart"), {
  ssr: false,
});

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (index = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, delay: index * 0.08, ease: [0.25, 0.46, 0.45, 0.94] },
  }),
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

function SummaryIcon({ type }) {
  if (type === "balance") {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
        <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
        <path d="M18 12a2 2 0 0 0 0 4h4v-4z" />
      </svg>
    );
  }

  if (type === "income") {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
        <polyline points="17 6 23 6 23 12" />
      </svg>
    );
  }

  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" />
      <polyline points="17 18 23 18 23 12" />
    </svg>
  );
}

function buildRekap(type, members, transactions, year) {
  const monthKeys = MONTH_LABELS.map((_, index) => `${year}-${String(index + 1).padStart(2, "0")}`);

  return members.map((member) => ({
    member,
    months: monthKeys.map((month) => {
      const tx = transactions.find(
        (entry) => entry.memberId === member.id && entry.type === type && entry.month === month,
      );
      return tx ? tx.amount : null;
    }),
  }));
}

export default function DashboardPage({ data }) {
  const [year, setYear] = useState(data.year);
  const [activeRekap, setActiveRekap] = useState("kas");

  const chartData = data.summary.chartData.length
    ? data.summary.chartData.map((entry) => ({
        name: entry.name,
        kas: entry.kas,
        pengeluaran: entry.pengeluaran || 0,
      }))
    : MONTH_LABELS.slice(0, 6).map((label) => ({ name: label, kas: 0, pengeluaran: 0 }));

  const currentRekap = useMemo(() => {
    return activeRekap === "kas"
      ? buildRekap("kas", data.members, data.transactions, year)
      : buildRekap("wifi", data.members, data.transactions, year);
  }, [activeRekap, data.members, data.transactions, year]);

  const cards = [
    {
      type: "balance",
      title: "Saldo Kas",
      value: formatIDR(data.summary.kasBalance || 0),
      iconClass:
        data.summary.kasBalance >= 0
          ? "bg-[var(--color-brand-soft)] text-[var(--color-brand)]"
          : "bg-[var(--color-danger-soft)] text-[var(--color-danger)]",
    },
    {
      type: "income",
      title: "Total Pemasukan",
      value: formatIDR(data.summary.totalPemasukan || 0),
      iconClass: "bg-[var(--color-success-soft)] text-[var(--color-success)]",
    },
    {
      type: "expense",
      title: "Total Pengeluaran",
      value: formatIDR(data.summary.totalPengeluaran || 0),
      iconClass: "bg-[var(--color-danger-soft)] text-[var(--color-danger)]",
    },
  ];

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <PageHeading title="Dashboard" />
      </motion.div>

      <motion.div className="grid grid-cols-1 gap-4 sm:grid-cols-3" variants={staggerContainer} initial="hidden" animate="visible">
        {cards.map((card, index) => (
          <motion.div
            key={card.title}
            variants={fadeUp}
            custom={index}
            whileHover={{ y: -4, boxShadow: "0 8px 25px rgba(0,0,0,0.08)" }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            <Card className="p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{card.title}</span>
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${card.iconClass}`}>
                  <SummaryIcon type={card.type} />
                </div>
              </div>
              <p className="text-xl font-semibold text-gray-800 dark:text-gray-100">{card.value}</p>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {data.arrears.length > 0 ? (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
          <Card className="p-4 sm:p-5">
            <h3 className="mb-1 text-sm font-semibold text-gray-700 dark:text-gray-200">Tunggakan Pembayaran</h3>
            <p className="mb-4 text-xs text-gray-400 dark:text-gray-500">Member yang belum bayar kas atau WiFi</p>
            <motion.div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4" variants={staggerContainer} initial="hidden" animate="visible">
              {data.arrears.map((entry, index) => (
                <motion.div
                  key={entry.member.id}
                  className="overflow-hidden rounded-xl border border-red-100 dark:border-red-900/30"
                  variants={fadeUp}
                  custom={index}
                  whileHover={{ scale: 1.02, boxShadow: "0 4px 16px rgba(239,68,68,0.1)" }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                >
                  <div className="flex items-center justify-between bg-red-50/70 px-3.5 py-2.5 dark:bg-red-900/15">
                    <div className="flex items-center gap-2">
                      <div
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white ${
                          entry.member.status === "full"
                            ? "bg-[var(--color-success)]"
                            : entry.member.status === "half"
                              ? "bg-[#e8a500]"
                              : "bg-gray-400"
                        }`}
                      >
                        {entry.member.name.substring(0, 2).toUpperCase()}
                      </div>
                      <span className="truncate text-sm font-semibold text-gray-800 dark:text-gray-100">{entry.member.name}</span>
                    </div>
                    <span className="ml-2 whitespace-nowrap text-sm font-bold text-red-500">
                      {formatIDR(entry.totalKas + entry.totalWifi)}
                    </span>
                  </div>
                  <div className="space-y-2 px-3.5 py-2.5">
                    {entry.unpaidKas.length > 0 ? (
                      <div>
                        <div className="mb-1.5 flex items-center gap-1.5">
                          <span className="h-2 w-2 shrink-0 rounded-full bg-red-400" />
                          <span className="text-[11px] font-semibold text-gray-600 dark:text-gray-400">
                            Kas ({entry.unpaidKas.length} bulan · {formatIDR(entry.totalKas)})
                          </span>
                        </div>
                        <div className="space-y-0.5 pl-3.5">
                          {entry.unpaidKas.map((item) => (
                            <div key={item.month} className="flex justify-between text-[11px]">
                              <span className="text-gray-500 dark:text-gray-400">{formatMonthLabel(item.month, { month: "short", year: "numeric" })}</span>
                              <span className="font-medium text-red-500">{formatIDR(item.amount)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    {entry.unpaidWifi.length > 0 ? (
                      <div>
                        <div className="mb-1.5 flex items-center gap-1.5">
                          <span className="h-2 w-2 shrink-0 rounded-full bg-purple-400" />
                          <span className="text-[11px] font-semibold text-gray-600 dark:text-gray-400">
                            WiFi ({entry.unpaidWifi.length} bulan · {formatIDR(entry.totalWifi)})
                          </span>
                        </div>
                        <div className="space-y-0.5 pl-3.5">
                          {entry.unpaidWifi.map((item) => (
                            <div key={item.month} className="flex justify-between text-[11px]">
                              <span className="text-gray-500 dark:text-gray-400">{formatMonthLabel(item.month, { month: "short", year: "numeric" })}</span>
                              <span className="font-medium text-purple-500">{formatIDR(item.amount)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </Card>
        </motion.div>
      ) : null}

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }}>
        <Card className="p-5">
          <h3 className="mb-4 text-sm font-semibold text-gray-700 dark:text-gray-200">Pemasukan Kas</h3>
          <DashboardChart data={chartData} />
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.4 }}>
        <Card className="p-5">
          <h3 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-200">Rekap Pembayaran {year}</h3>
          <div className="mb-4 flex items-center justify-between">
            <div className="flex gap-1 rounded-lg bg-gray-100 p-0.5 dark:bg-[#1e1e38]">
              <button
                onClick={() => setActiveRekap("kas")}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  activeRekap === "kas"
                    ? "bg-white text-[var(--color-brand)] shadow-sm dark:bg-[#2a2a4a]"
                    : "text-gray-500 hover:text-gray-700 dark:text-gray-400"
                }`}
              >
                Kas
              </button>
              <button
                onClick={() => setActiveRekap("wifi")}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  activeRekap === "wifi"
                    ? "bg-white text-[var(--color-wifi)] shadow-sm dark:bg-[#2a2a4a]"
                    : "text-gray-500 hover:text-gray-700 dark:text-gray-400"
                }`}
              >
                WiFi
              </button>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setYear((value) => value - 1)} className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-100 text-xs text-gray-500 transition-colors hover:bg-gray-200 dark:bg-[#1e1e38] dark:text-gray-400 dark:hover:bg-[#2a2a4a]">←</button>
              <span className="w-10 text-center text-xs font-medium leading-7 text-gray-500 dark:text-gray-400">{year}</span>
              <button onClick={() => setYear((value) => value + 1)} className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-100 text-xs text-gray-500 transition-colors hover:bg-gray-200 dark:bg-[#1e1e38] dark:text-gray-400 dark:hover:bg-[#2a2a4a]">→</button>
            </div>
          </div>

          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-xs" style={{ minWidth: 700 }}>
              <thead>
                <tr>
                  <th className="sticky left-0 z-20 w-[36px] bg-[var(--card-bg)] px-2 py-2 text-left font-medium text-gray-400">No.</th>
                  <th className="sticky left-[36px] z-20 min-w-[100px] bg-[var(--card-bg)] px-2 py-2 text-left font-medium text-gray-400" style={{ boxShadow: "4px 0 8px -2px rgba(0,0,0,0.06)" }}>Nama</th>
                  {MONTH_LABELS.map((label, index) => (
                    <th
                      key={label}
                      className={`min-w-[42px] px-1.5 py-2 text-center font-medium ${
                        new Date().getMonth() === index && new Date().getFullYear() === year
                          ? "text-[var(--color-brand)]"
                          : "text-gray-400"
                      }`}
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {currentRekap.map((row, index) => (
                  <motion.tr
                    key={row.member.id}
                    className="border-t border-gray-50 dark:border-gray-700/30"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.03 }}
                  >
                    <td className="sticky left-0 z-20 bg-[var(--card-bg)] px-2 py-2 text-gray-400">{index + 1}</td>
                    <td className="sticky left-[36px] z-20 bg-[var(--card-bg)] px-2 py-2 font-medium text-gray-700 dark:text-gray-200" style={{ boxShadow: "4px 0 8px -2px rgba(0,0,0,0.06)" }}>
                      {row.member.name}
                    </td>
                    {row.months.map((value, monthIndex) => (
                      <td
                        key={`${row.member.id}-${monthIndex}`}
                        className={`px-1.5 py-2 text-center ${value !== null ? "font-medium text-gray-700 dark:text-gray-200" : ""}`}
                        style={{
                          background:
                            value !== null
                              ? activeRekap === "kas"
                                ? "var(--rekap-kas-bg, #eef1fe)"
                                : "var(--rekap-wifi-bg, #f3eefe)"
                              : undefined,
                        }}
                      >
                        {value !== null ? formatIDRShort(value) : ""}
                      </td>
                    ))}
                  </motion.tr>
                ))}
                {data.members.length === 0 ? (
                  <tr>
                    <td colSpan={14} className="py-8 text-center text-gray-400">
                      Belum ada member.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
