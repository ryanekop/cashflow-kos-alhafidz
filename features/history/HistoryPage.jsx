"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import EmptyState from "@/components/ui/empty-state";
import PageHeading from "@/components/ui/page-heading";
import { formatDateLabel, formatIDR, formatMonthLabel } from "@/lib/shared/format";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (index = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, delay: index * 0.06, ease: [0.25, 0.46, 0.45, 0.94] },
  }),
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};

function groupKas(timeline) {
  const groups = [];

  timeline.forEach((entry) => {
    const dateStr = formatDateLabel(entry.date, { day: "numeric", month: "short", year: "numeric" });
    const existing = groups.find(
      (group) => group.memberId === entry.memberId && group.dateStr === dateStr && group.type === entry.type,
    );

    if (existing) {
      existing.items.push(entry);
      existing.totalDebit += entry.debit;
      existing.totalKredit += entry.kredit;
      existing.lastSaldo = entry.saldo;
      return;
    }

    groups.push({
      memberId: entry.memberId,
      memberName: entry.memberName || "—",
      type: entry.type,
      dateStr,
      items: [entry],
      totalDebit: entry.debit,
      totalKredit: entry.kredit,
      lastSaldo: entry.saldo,
    });
  });

  return groups;
}

function groupWifi(transactions) {
  const groups = [];

  transactions.forEach((entry) => {
    const dateStr = formatDateLabel(entry.date, { day: "numeric", month: "short", year: "numeric" });
    const existing = groups.find((group) => group.memberId === entry.memberId && group.dateStr === dateStr);

    if (existing) {
      existing.items.push(entry);
      existing.totalAmount += entry.amount;
      return;
    }

    groups.push({
      memberId: entry.memberId,
      memberName: entry.memberName || "—",
      dateStr,
      items: [entry],
      totalAmount: entry.amount,
    });
  });

  return groups;
}

export default function HistoryPage({ data }) {
  const [kasMonth, setKasMonth] = useState("");
  const [kasType, setKasType] = useState("all");
  const [kasSort, setKasSort] = useState("newest");
  const [wifiMonth, setWifiMonth] = useState("");
  const [wifiSort, setWifiSort] = useState("newest");

  const kasMonths = useMemo(
    () => [...new Set(data.timeline.map((entry) => entry.month))].filter(Boolean).sort().reverse(),
    [data.timeline],
  );
  const wifiMonths = useMemo(
    () => [...new Set(data.wifiTransactions.map((entry) => entry.month))].filter(Boolean).sort().reverse(),
    [data.wifiTransactions],
  );

  const kasGroups = useMemo(() => {
    let filtered = [...data.timeline];

    if (kasMonth) {
      filtered = filtered.filter((entry) => entry.month === kasMonth);
    }

    if (kasType === "in") {
      filtered = filtered.filter((entry) => entry.type !== "pengeluaran");
    } else if (kasType === "out") {
      filtered = filtered.filter((entry) => entry.type === "pengeluaran");
    }

    filtered.sort((left, right) =>
      kasSort === "newest"
        ? new Date(right.date).getTime() - new Date(left.date).getTime()
        : new Date(left.date).getTime() - new Date(right.date).getTime(),
    );

    return groupKas(filtered);
  }, [data.timeline, kasMonth, kasSort, kasType]);

  const wifiGroups = useMemo(() => {
    let filtered = [...data.wifiTransactions];

    if (wifiMonth) {
      filtered = filtered.filter((entry) => entry.month === wifiMonth);
    }

    filtered.sort((left, right) =>
      wifiSort === "newest"
        ? new Date(right.date).getTime() - new Date(left.date).getTime()
        : new Date(left.date).getTime() - new Date(right.date).getTime(),
    );

    return groupWifi(filtered);
  }, [data.wifiTransactions, wifiMonth, wifiSort]);

  return (
    <div className="space-y-5">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <PageHeading title="Riwayat" description="Timeline kas dan riwayat pembayaran WiFi" />
      </motion.div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
          <Card className="flex flex-col">
            <div className="border-b border-gray-100 p-4 pb-3 dark:border-gray-700/50 sm:p-5">
              <h3 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-200">Timeline Kas</h3>
              <div className="flex flex-wrap gap-2">
                <select value={kasMonth} onChange={(event) => setKasMonth(event.target.value)} className="form-control px-2.5 py-1.5 text-xs">
                  <option value="">Semua Bulan</option>
                  {kasMonths.map((month) => (
                    <option key={month} value={month}>
                      {formatMonthLabel(month)}
                    </option>
                  ))}
                </select>
                <select value={kasType} onChange={(event) => setKasType(event.target.value)} className="form-control px-2.5 py-1.5 text-xs">
                  <option value="all">Semua Tipe</option>
                  <option value="in">Pemasukan</option>
                  <option value="out">Pengeluaran</option>
                </select>
                <select value={kasSort} onChange={(event) => setKasSort(event.target.value)} className="form-control px-2.5 py-1.5 text-xs">
                  <option value="newest">Terbaru</option>
                  <option value="oldest">Terlama</option>
                </select>
                {kasMonth || kasType !== "all" || kasSort !== "newest" ? (
                  <button onClick={() => { setKasMonth(""); setKasType("all"); setKasSort("newest"); }} className="flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-500 transition-colors hover:bg-red-100 dark:border-red-700/50 dark:bg-red-900/20 dark:hover:bg-red-900/30">
                    Reset
                  </button>
                ) : null}
              </div>
            </div>

            <div className="max-h-[500px] overflow-y-auto p-4 pt-3 sm:p-5 md:max-h-[600px]">
              {kasGroups.length === 0 ? (
                <EmptyState>Tidak ada data.</EmptyState>
              ) : (
                <motion.div className="space-y-2" variants={staggerContainer} initial="hidden" animate="visible" key={`kas-${kasMonth}-${kasType}-${kasSort}`}>
                  {kasGroups.map((group, index) => {
                    const isExpense = group.type === "pengeluaran";
                    return (
                      <motion.div
                        key={`${group.memberId}-${group.dateStr}-${group.type}-${index}`}
                        className={`rounded-lg p-3 ${isExpense ? "bg-red-50/50 dark:bg-red-900/10" : "bg-gray-50 dark:bg-[#1e1e38]"}`}
                        variants={fadeUp}
                        custom={index}
                        whileHover={{ x: 4, boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}
                      >
                        <div className="mb-1 flex items-center justify-between">
                          <div className="flex min-w-0 items-center gap-2">
                            <span className={`shrink-0 rounded px-2 py-0.5 text-[10px] font-semibold ${isExpense ? "bg-red-100 text-red-500 dark:bg-red-900/30" : "bg-blue-50 text-[var(--color-brand)] dark:bg-blue-900/30"}`}>
                              {isExpense ? "OUT" : group.type.toUpperCase()}
                            </span>
                            <span className="truncate text-sm font-medium text-gray-700 dark:text-gray-200">{group.memberName}</span>
                          </div>
                          <span className="ml-2 whitespace-nowrap text-[11px] text-gray-400 dark:text-gray-500">{group.dateStr}</span>
                        </div>
                        {group.items.length === 1 ? (
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-400 dark:text-gray-500">{group.items[0].notes || group.items[0].month}</span>
                            <div className="flex items-center gap-3">
                              <span className={`text-sm font-semibold ${isExpense ? "text-red-500" : "text-green-600 dark:text-green-400"}`}>
                                {isExpense ? `-${formatIDR(group.totalKredit)}` : `+${formatIDR(group.totalDebit)}`}
                              </span>
                              <span className="text-xs text-gray-400 dark:text-gray-500">Saldo: {formatIDR(group.lastSaldo)}</span>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="mb-1.5 space-y-0.5">
                              {group.items.map((item) => (
                                <div key={item.id} className="flex items-center justify-between text-xs">
                                  <span className="text-gray-400 dark:text-gray-500">{item.month}</span>
                                  <span className={isExpense ? "text-red-500" : "text-green-600 dark:text-green-400"}>
                                    {formatIDR(isExpense ? item.kredit : item.debit)}
                                  </span>
                                </div>
                              ))}
                            </div>
                            <div className="flex justify-between border-t border-gray-200/60 pt-1.5 dark:border-gray-600/40">
                              <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">{group.items.length} bulan</span>
                              <div className="flex items-center gap-3">
                                <span className={`text-sm font-bold ${isExpense ? "text-red-500" : "text-green-600 dark:text-green-400"}`}>
                                  {isExpense ? `-${formatIDR(group.totalKredit)}` : `+${formatIDR(group.totalDebit)}`}
                                </span>
                                <span className="text-xs text-gray-400 dark:text-gray-500">Saldo: {formatIDR(group.lastSaldo)}</span>
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
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
          <Card className="flex flex-col">
            <div className="border-b border-gray-100 p-4 pb-3 dark:border-gray-700/50 sm:p-5">
              <div className="mb-3 flex items-center gap-2">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-purple-400" />
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Riwayat WiFi</h3>
                <span className="ml-auto text-[10px] text-gray-400 dark:text-gray-500">tidak dihitung ke saldo kas</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <select value={wifiMonth} onChange={(event) => setWifiMonth(event.target.value)} className="form-control px-2.5 py-1.5 text-xs">
                  <option value="">Semua Bulan</option>
                  {wifiMonths.map((month) => (
                    <option key={month} value={month}>
                      {formatMonthLabel(month)}
                    </option>
                  ))}
                </select>
                <select value={wifiSort} onChange={(event) => setWifiSort(event.target.value)} className="form-control px-2.5 py-1.5 text-xs">
                  <option value="newest">Terbaru</option>
                  <option value="oldest">Terlama</option>
                </select>
                {wifiMonth || wifiSort !== "newest" ? (
                  <button onClick={() => { setWifiMonth(""); setWifiSort("newest"); }} className="flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-500 transition-colors hover:bg-red-100 dark:border-red-700/50 dark:bg-red-900/20 dark:hover:bg-red-900/30">
                    Reset
                  </button>
                ) : null}
              </div>
            </div>

            <div className="max-h-[500px] overflow-y-auto p-4 pt-3 sm:p-5 md:max-h-[600px]">
              {wifiGroups.length === 0 ? (
                <EmptyState>Tidak ada data WiFi.</EmptyState>
              ) : (
                <motion.div className="space-y-2" variants={staggerContainer} initial="hidden" animate="visible" key={`wifi-${wifiMonth}-${wifiSort}`}>
                  {wifiGroups.map((group, index) => (
                    <motion.div
                      key={`${group.memberId}-${group.dateStr}-${index}`}
                      className="rounded-lg bg-purple-50/50 p-3 dark:bg-purple-900/10"
                      variants={fadeUp}
                      custom={index}
                      whileHover={{ x: 4, boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}
                    >
                      <div className="mb-1 flex items-center justify-between">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="shrink-0 rounded bg-purple-50 px-2 py-0.5 text-[10px] font-semibold text-purple-500 dark:bg-purple-900/30">WIFI</span>
                          <span className="truncate text-sm font-medium text-gray-700 dark:text-gray-200">{group.memberName}</span>
                        </div>
                        <span className="ml-2 whitespace-nowrap text-[11px] text-gray-400 dark:text-gray-500">{group.dateStr}</span>
                      </div>
                      {group.items.length === 1 ? (
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-400 dark:text-gray-500">{group.items[0].notes || group.items[0].month}</span>
                          <span className="text-sm font-semibold text-purple-600 dark:text-purple-400">{formatIDR(group.totalAmount)}</span>
                        </div>
                      ) : (
                        <>
                          <div className="mb-1.5 space-y-0.5">
                            {group.items.map((item) => (
                              <div key={item.id} className="flex items-center justify-between text-xs">
                                <span className="text-gray-400 dark:text-gray-500">{item.month}</span>
                                <span className="text-purple-600 dark:text-purple-400">{formatIDR(item.amount)}</span>
                              </div>
                            ))}
                          </div>
                          <div className="flex justify-between border-t border-purple-200/60 pt-1.5 dark:border-purple-700/40">
                            <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">{group.items.length} bulan</span>
                            <span className="text-sm font-bold text-purple-600 dark:text-purple-400">{formatIDR(group.totalAmount)}</span>
                          </div>
                        </>
                      )}
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
