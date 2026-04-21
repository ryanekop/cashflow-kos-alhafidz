"use client";

import { startTransition, useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import * as XLSX from "xlsx";
import { ADMIN_PASSWORD, MONTH_LABELS } from "@/lib/shared/constants";
import { calculateKas, calculateMemberWifiAmount } from "@/lib/shared/cashflow";
import { formatIDR } from "@/lib/shared/format";

const inputCls = "form-control";

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [pwError, setPwError] = useState(false);
  const [members, setMembers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [wifiBills, setWifiBills] = useState([]);
  const [wifiUsage, setWifiUsage] = useState([]);
  const [wifiDebts, setWifiDebts] = useState([]);
  const [activeTab, setActiveTab] = useState("status");
  const [toast, setToast] = useState("");
  const [kasPicker, setKasPicker] = useState({});
  const [statusMonth, setStatusMonth] = useState(new Date().toISOString().slice(0, 7));
  const [memberForm, setMemberForm] = useState({ name: "", status: "full" });
  const [txType, setTxType] = useState("pengeluaran");
  const [expenseForm, setExpenseForm] = useState({
    amount: "",
    date: new Date().toISOString().slice(0, 10),
    notes: "",
  });
  const [kasForm, setKasForm] = useState({
    memberId: "",
    month: new Date().toISOString().slice(0, 7),
    status: "full",
  });
  const [wifiForm, setWifiForm] = useState({
    month: new Date().toISOString().slice(0, 7),
    amount: "",
  });

  const fetchAll = useCallback(async () => {
    const [nextMembers, nextTransactions, nextWifiBills, nextWifiUsage, nextWifiDebts] = await Promise.all([
      fetch("/api/members").then((response) => response.json()),
      fetch("/api/transactions").then((response) => response.json()),
      fetch("/api/wifi-bills").then((response) => response.json()),
      fetch("/api/wifi-usage").then((response) => response.json()),
      fetch("/api/wifi-debts").then((response) => response.json()),
    ]);

    setMembers(nextMembers);
    setTransactions(nextTransactions);
    setWifiBills(nextWifiBills);
    setWifiUsage(nextWifiUsage);
    setWifiDebts(nextWifiDebts);
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (sessionStorage.getItem("admin_auth") === "true") {
        setAuthenticated(true);
      }
    }, 0);

    return () => clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    if (authenticated) {
      const timeoutId = setTimeout(() => {
        startTransition(() => {
          void fetchAll();
        });
      }, 0);

      return () => clearTimeout(timeoutId);
    }
  }, [authenticated, fetchAll]);

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(""), 3000);
  };

  const handleLogin = (event) => {
    event.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setAuthenticated(true);
      sessionStorage.setItem("admin_auth", "true");
      return;
    }

    setPwError(true);
    setTimeout(() => setPwError(false), 2000);
  };

  const calcWifiForMember = (memberId, month) =>
    calculateMemberWifiAmount(memberId, month, wifiBills, wifiUsage);

  const togglePaymentStatus = async (memberId, memberName, type, month, currentlyPaid) => {
    if (currentlyPaid) {
      const tx = transactions.find(
        (transaction) =>
          transaction.memberId === memberId &&
          transaction.type === type &&
          transaction.month === month,
      );

      if (tx) {
        if (type === "wifi") {
          await fetch("/api/wifi-debts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ memberId, memberName, month, amount: tx.amount }),
          });
        }

        await fetch(`/api/transactions?id=${tx.id}`, { method: "DELETE" });
        showToast(`${type.toUpperCase()} ${memberName} (${month}): BELUM BAYAR`);
      }

      fetchAll();
      return;
    }

    if (type === "kas") {
      setKasPicker((prev) => ({ ...prev, [memberId]: true }));
      return;
    }

    const debt = wifiDebts.find((entry) => entry.memberId === memberId && entry.month === month);
    let amount;

    if (debt) {
      amount = debt.amount;
      await fetch(`/api/wifi-debts?memberId=${memberId}&month=${month}`, { method: "DELETE" });
    } else {
      amount = calcWifiForMember(memberId, month);
    }

    await fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        memberId,
        memberName,
        type,
        month,
        amount,
        status: "admin-set",
        notes: "Diset oleh admin",
      }),
    });
    showToast(`WIFI ${memberName} (${month}): SUDAH BAYAR — ${formatIDR(amount)}`);
    fetchAll();
  };

  const confirmKasPayment = async (memberId, memberName, month, status) => {
    const amount = calculateKas(month, status);
    await fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        memberId,
        memberName,
        type: "kas",
        month,
        amount,
        status,
        notes: "Diset oleh admin",
      }),
    });
    setKasPicker((prev) => ({ ...prev, [memberId]: false }));
    showToast(`KAS ${memberName} (${month}): SUDAH BAYAR — ${formatIDR(amount)}`);
    fetchAll();
  };

  const handleAddMember = async (event) => {
    event.preventDefault();
    if (!memberForm.name) {
      return;
    }

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
    if (!confirm(`Hapus member "${name}"?`)) {
      return;
    }

    await fetch(`/api/members?id=${id}`, { method: "DELETE" });
    showToast(`Member ${name} dihapus`);
    fetchAll();
  };

  const handleWifi = async (event) => {
    event.preventDefault();
    if (!wifiForm.amount) {
      return;
    }

    await fetch("/api/wifi-bills", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ month: wifiForm.month, amount: parseInt(wifiForm.amount, 10) }),
    });
    showToast("Tagihan WiFi disimpan");
    fetchAll();
  };

  const handleDeleteTx = async (id) => {
    if (!confirm("Hapus transaksi ini?")) {
      return;
    }

    await fetch(`/api/transactions?id=${id}`, { method: "DELETE" });
    showToast("Transaksi dihapus");
    fetchAll();
  };

  const handleDeleteWifiBill = async (month) => {
    if (!confirm(`Hapus tagihan WiFi bulan ${month}?`)) {
      return;
    }

    const bills = wifiBills.filter((bill) => bill.month !== month);
    await fetch("/api/wifi-bills", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bills),
    });
    showToast(`Tagihan WiFi ${month} dihapus`);
    fetchAll();
  };

  const handleDeleteWifiUsage = async (id) => {
    if (!confirm("Hapus data WiFi usage ini?")) {
      return;
    }

    await fetch(`/api/wifi-usage?id=${id}`, { method: "DELETE" });
    showToast("WiFi usage dihapus");
    fetchAll();
  };

  const handleAddExpense = async (event) => {
    event.preventDefault();
    if (!expenseForm.amount || !expenseForm.notes) {
      return;
    }

    await fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        memberId: 0,
        memberName: "Pengeluaran",
        type: "pengeluaran",
        month: expenseForm.date.slice(0, 7),
        amount: -Math.abs(parseInt(expenseForm.amount, 10)),
        status: "expense",
        notes: expenseForm.notes,
        date: new Date(expenseForm.date).toISOString(),
      }),
    });

    showToast(`Pengeluaran ${formatIDR(parseInt(expenseForm.amount, 10))} ditambahkan`);
    setExpenseForm({ amount: "", date: new Date().toISOString().slice(0, 10), notes: "" });
    fetchAll();
  };

  const handleAddKasManual = async (event) => {
    event.preventDefault();
    if (!kasForm.memberId || !kasForm.month) {
      return;
    }

    const member = members.find((entry) => entry.id === parseInt(kasForm.memberId, 10));
    if (!member) {
      return;
    }

    const amount = calculateKas(kasForm.month, kasForm.status);
    await fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        memberId: member.id,
        memberName: member.name,
        type: "kas",
        month: kasForm.month,
        amount,
        status: kasForm.status,
        notes: "Ditambahkan manual oleh admin",
      }),
    });
    showToast(`Kas ${member.name} (${kasForm.month}) ${formatIDR(amount)} ditambahkan`);
    setKasForm((prev) => ({ ...prev, memberId: "" }));
    fetchAll();
  };

  const handleExportExcel = () => {
    const workbook = XLSX.utils.book_new();
    const now = new Date();
    const exportYear = now.getFullYear();

    const totalIn = transactions.filter((transaction) => transaction.type === "kas").reduce((sum, transaction) => sum + transaction.amount, 0);
    const totalOut = transactions.filter((transaction) => transaction.type === "pengeluaran").reduce((sum, transaction) => sum + Math.abs(transaction.amount), 0);
    const saldo = totalIn - totalOut;

    const summaryData = [
      ["Ringkasan Kas Kos Alhafidz"],
      ["Tanggal Export", now.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })],
      [],
      ["Keterangan", "Jumlah"],
      ["Total Pemasukan", totalIn],
      ["Total Pengeluaran", totalOut],
      ["Saldo Kas", saldo],
    ];
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    summarySheet["!cols"] = [{ wch: 25 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(workbook, summarySheet, "Ringkasan");

    const monthKeys = MONTH_LABELS.map((_, index) => `${exportYear}-${String(index + 1).padStart(2, "0")}`);
    const rekapHeader = ["No", "Nama", ...MONTH_LABELS, "Total"];
    const rekapRows = members.map((member, index) => {
      let total = 0;
      const row = [index + 1, member.name];
      monthKeys.forEach((month) => {
        const tx = transactions.find(
          (transaction) =>
            transaction.memberId === member.id &&
            transaction.type === "kas" &&
            transaction.month === month,
        );
        const value = tx ? tx.amount : 0;
        total += value;
        row.push(value || "");
      });
      row.push(total);
      return row;
    });
    const rekapSheet = XLSX.utils.aoa_to_sheet([rekapHeader, ...rekapRows]);
    rekapSheet["!cols"] = [{ wch: 4 }, { wch: 18 }, ...MONTH_LABELS.map(() => ({ wch: 10 })), { wch: 12 }];
    XLSX.utils.book_append_sheet(workbook, rekapSheet, "Rekap Kas");

    const expenseHeader = ["No", "Tanggal", "Keterangan", "Jumlah"];
    const expenses = transactions.filter((transaction) => transaction.type === "pengeluaran").sort((left, right) => new Date(left.date) - new Date(right.date));
    const expenseRows = expenses.map((transaction, index) => [
      index + 1,
      new Date(transaction.date).toLocaleDateString("id-ID"),
      transaction.notes || "-",
      Math.abs(transaction.amount),
    ]);
    expenseRows.push(["", "", "TOTAL", totalOut]);
    const expenseSheet = XLSX.utils.aoa_to_sheet([expenseHeader, ...expenseRows]);
    expenseSheet["!cols"] = [{ wch: 4 }, { wch: 15 }, { wch: 40 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(workbook, expenseSheet, "Pengeluaran");

    const allHeader = ["No", "Tipe", "Nama", "Bulan", "Nominal", "Status", "Tanggal", "Catatan"];
    const sortedTransactions = [...transactions].sort((left, right) => new Date(left.date) - new Date(right.date));
    const allRows = sortedTransactions.map((transaction, index) => [
      index + 1,
      transaction.type,
      transaction.memberName,
      transaction.month,
      transaction.amount,
      transaction.status || "-",
      new Date(transaction.date).toLocaleDateString("id-ID"),
      transaction.notes || "-",
    ]);
    const allSheet = XLSX.utils.aoa_to_sheet([allHeader, ...allRows]);
    allSheet["!cols"] = [{ wch: 4 }, { wch: 12 }, { wch: 18 }, { wch: 10 }, { wch: 12 }, { wch: 10 }, { wch: 15 }, { wch: 40 }];
    XLSX.utils.book_append_sheet(workbook, allSheet, "Semua Transaksi");

    XLSX.writeFile(workbook, `Kas_Alhafidz_${exportYear}.xlsx`);
    showToast("File Excel berhasil didownload!");
  };

  if (!authenticated) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="surface-card w-full max-w-sm p-6">
          <div className="mb-5 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--color-brand-soft)]">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-brand)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Admin Panel</h2>
            <p className="mt-1 text-xs text-gray-400">Masukkan password untuk melanjutkan</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-3">
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Password"
              className={`${inputCls} ${pwError ? "border-red-300 focus:border-red-400 focus:ring-red-400" : ""}`}
              autoFocus
            />
            {pwError ? <p className="text-xs text-red-500">Password salah</p> : null}
            <button type="submit" className="btn-primary w-full rounded-lg py-2.5 text-sm font-medium transition-colors">
              Masuk
            </button>
          </form>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: "status", label: "Status Bayar" },
    { id: "tambah", label: "Tambah Transaksi" },
    { id: "member", label: "Kelola Member" },
    { id: "wifi", label: "Tagihan WiFi" },
    { id: "wifi-usage", label: "Isi WiFi" },
    { id: "history", label: "Riwayat" },
    { id: "export", label: "Export" },
  ];

  const prevMonth = () => {
    const date = new Date(`${statusMonth}-01`);
    date.setMonth(date.getMonth() - 1);
    setStatusMonth(date.toISOString().slice(0, 7));
  };

  const nextMonth = () => {
    const date = new Date(`${statusMonth}-01`);
    date.setMonth(date.getMonth() + 1);
    setStatusMonth(date.toISOString().slice(0, 7));
  };

  const formatMonth = (month) =>
    new Date(`${month}-01`).toLocaleDateString("id-ID", { month: "long", year: "numeric" });

  const historyGroups = (() => {
    const groups = [];
    const sorted = transactions.slice().sort((left, right) => new Date(right.date) - new Date(left.date));

    sorted.forEach((transaction) => {
      const dateStr = new Date(transaction.date).toLocaleDateString("id-ID");
      const existing = groups.find(
        (group) =>
          group.memberId === transaction.memberId &&
          group.dateStr === dateStr &&
          group.type === transaction.type,
      );

      if (existing) {
        existing.items.push(transaction);
        existing.total += transaction.amount;
        return;
      }

      groups.push({
        memberId: transaction.memberId,
        memberName: transaction.memberName,
        type: transaction.type,
        dateStr,
        items: [transaction],
        total: transaction.amount,
      });
    });

    return groups;
  })();

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Admin Panel</h1>
        <button
          onClick={() => {
            sessionStorage.removeItem("admin_auth");
            setAuthenticated(false);
          }}
          className="text-xs text-gray-400 transition-colors hover:text-red-500"
        >
          Logout
        </button>
      </div>

      {toast ? (
        <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700 dark:border-green-800/30 dark:bg-green-900/20 dark:text-green-400">
          ✓ {toast}
        </div>
      ) : null}

      <div className="surface-card flex gap-1.5 overflow-x-auto p-1 no-scrollbar">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`whitespace-nowrap rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
              activeTab === tab.id
                ? "bg-[var(--color-brand)] text-white"
                : "text-gray-500 hover:bg-gray-50 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-[#2a2a4a] dark:hover:text-gray-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "status" ? (
        <div className="surface-card p-5">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Status Pembayaran</h2>
              <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">Klik untuk mengubah status</p>
            </div>
            <div className="flex items-center gap-1.5">
              <button onClick={prevMonth} className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-100 text-xs text-gray-500 transition-colors hover:bg-gray-200 dark:bg-[#1e1e38] dark:text-gray-400 dark:hover:bg-[#2a2a4a]">←</button>
              <span className="w-32 text-center text-xs font-medium text-gray-600 dark:text-gray-400">{formatMonth(statusMonth)}</span>
              <button onClick={nextMonth} className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-100 text-xs text-gray-500 transition-colors hover:bg-gray-200 dark:bg-[#1e1e38] dark:text-gray-400 dark:hover:bg-[#2a2a4a]">→</button>
            </div>
          </div>
          <div className="space-y-2">
            {members.map((member) => {
              const kasTx = transactions.find((entry) => entry.memberId === member.id && entry.type === "kas" && entry.month === statusMonth);
              const wifiTx = transactions.find((entry) => entry.memberId === member.id && entry.type === "wifi" && entry.month === statusMonth);
              const hasPaidKas = Boolean(kasTx);
              const hasPaidWifi = Boolean(wifiTx);
              const showPicker = kasPicker[member.id] && !hasPaidKas;

              return (
                <div key={member.id} className="rounded-lg bg-gray-50 p-3 dark:bg-[#1e1e38]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-full text-[10px] font-bold text-white ${member.status === "full" ? "bg-[var(--color-success)]" : member.status === "half" ? "bg-[#e8a500]" : "bg-gray-400"}`}>
                        {member.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-200">{member.name}</p>
                        {hasPaidKas || hasPaidWifi ? (
                          <p className="text-[10px] text-gray-400">
                            {hasPaidKas && kasTx.amount > 0 ? `Kas: ${formatIDR(kasTx.amount)}` : ""}
                            {hasPaidKas && kasTx.amount > 0 && hasPaidWifi && wifiTx.amount > 0 ? " · " : ""}
                            {hasPaidWifi && wifiTx.amount > 0 ? `WiFi: ${formatIDR(wifiTx.amount)}` : ""}
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex gap-1.5">
                      <button onClick={() => togglePaymentStatus(member.id, member.name, "kas", statusMonth, hasPaidKas)} className={`rounded border px-3 py-1 text-[11px] font-semibold transition-colors ${hasPaidKas ? "border-green-200 bg-green-50 text-green-600 dark:border-green-800/40 dark:bg-green-900/30" : "border-red-200 bg-red-50 text-red-500 dark:border-red-800/40 dark:bg-red-900/30"}`}>
                        KAS {hasPaidKas ? "✓" : "✗"}
                      </button>
                      <button onClick={() => togglePaymentStatus(member.id, member.name, "wifi", statusMonth, hasPaidWifi)} className={`rounded border px-3 py-1 text-[11px] font-semibold transition-colors ${hasPaidWifi ? "border-green-200 bg-green-50 text-green-600 dark:border-green-800/40 dark:bg-green-900/30" : "border-red-200 bg-red-50 text-red-500 dark:border-red-800/40 dark:bg-red-900/30"}`}>
                        WIFI {hasPaidWifi ? "✓" : "✗"}
                      </button>
                    </div>
                  </div>
                  {showPicker ? (
                    <div className="mt-2.5 border-t border-gray-100 pt-2.5 dark:border-gray-700/50">
                      <p className="mb-2 text-[11px] text-gray-400">Pilih status untuk hitung nominal Kas:</p>
                      <div className="flex gap-1.5">
                        <button onClick={() => confirmKasPayment(member.id, member.name, statusMonth, "full")} className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-[11px] font-medium text-[var(--color-brand)] transition-colors dark:border-blue-800/40 dark:bg-blue-900/25">
                          Full ({formatIDR(calculateKas(statusMonth, "full"))})
                        </button>
                        <button onClick={() => confirmKasPayment(member.id, member.name, statusMonth, "half")} className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-[11px] font-medium text-amber-600 transition-colors dark:border-amber-800/40 dark:bg-amber-900/25 dark:text-amber-400">
                          Half ({formatIDR(calculateKas(statusMonth, "half"))})
                        </button>
                        <button onClick={() => confirmKasPayment(member.id, member.name, statusMonth, "none")} className="rounded-lg border border-gray-200 bg-gray-100 px-3 py-1.5 text-[11px] font-medium text-gray-500 transition-colors dark:border-gray-600 dark:bg-[#2a2a4a] dark:text-gray-400">
                          None ({formatIDR(calculateKas(statusMonth, "none"))})
                        </button>
                        <button onClick={() => setKasPicker((prev) => ({ ...prev, [member.id]: false }))} className="rounded-lg px-2 py-1.5 text-[11px] text-gray-300 transition-colors hover:text-gray-500">
                          ✕
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {activeTab === "member" ? (
        <div className="surface-card p-5">
          <h2 className="mb-4 text-sm font-semibold text-gray-700 dark:text-gray-200">Kelola Member</h2>
          <form onSubmit={handleAddMember} className="mb-5 space-y-3 border-b border-gray-100 pb-5 dark:border-gray-700/50">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs text-gray-500 dark:text-gray-400">Nama</label>
                <input type="text" value={memberForm.name} onChange={(event) => setMemberForm({ ...memberForm, name: event.target.value })} placeholder="Nama member" className={inputCls} />
              </div>
              <div>
                <label className="mb-1.5 block text-xs text-gray-500 dark:text-gray-400">Status</label>
                <select value={memberForm.status} onChange={(event) => setMemberForm({ ...memberForm, status: event.target.value })} className={inputCls}>
                  <option value="full">Di kos (Full)</option>
                  <option value="half">Setengah bulan</option>
                  <option value="none">Tidak di kos</option>
                </select>
              </div>
            </div>
            <button type="submit" className="btn-primary w-full rounded-lg py-2.5 text-sm font-medium transition-colors">Tambah Member</button>
          </form>
          <div className="space-y-1.5">
            {members.map((member) => (
              <div key={member.id} className="flex items-center justify-between rounded-lg bg-gray-50 p-2.5 dark:bg-[#1e1e38]">
                <div className="flex items-center gap-3">
                  <div className={`flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold text-white ${member.status === "full" ? "bg-[var(--color-success)]" : member.status === "half" ? "bg-[#e8a500]" : "bg-gray-400"}`}>
                    {member.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-200">{member.name}</p>
                    <p className="text-[11px] text-gray-400">{member.status === "full" ? "Di kos" : member.status === "half" ? "Setengah bulan" : "Tidak di kos"}</p>
                  </div>
                </div>
                <button onClick={() => handleDeleteMember(member.id, member.name)} className="text-gray-300 transition-colors hover:text-red-400">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {activeTab === "wifi" ? (
        <div className="surface-card p-5">
          <h2 className="mb-4 text-sm font-semibold text-gray-700 dark:text-gray-200">Input Tagihan WiFi Bulanan</h2>
          <form onSubmit={handleWifi} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs text-gray-500 dark:text-gray-400">Bulan</label>
              <input type="month" value={wifiForm.month} onChange={(event) => setWifiForm({ ...wifiForm, month: event.target.value })} className={inputCls} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs text-gray-500 dark:text-gray-400">Total Tagihan (Rp)</label>
              <input type="number" value={wifiForm.amount} onChange={(event) => setWifiForm({ ...wifiForm, amount: event.target.value })} placeholder="305250" className={inputCls} />
            </div>
            <button type="submit" className="btn-primary w-full rounded-lg py-2.5 text-sm font-medium transition-colors">Simpan Tagihan</button>
          </form>
          <div className="mt-5">
            <h3 className="mb-2.5 text-xs text-gray-400 dark:text-gray-500">Tagihan Tersimpan</h3>
            <div className="space-y-1.5">
              {wifiBills.map((bill) => (
                <div key={bill.month} className="flex items-center justify-between rounded-lg bg-gray-50 p-2.5 text-sm dark:bg-[#1e1e38]">
                  <span className="text-gray-500 dark:text-gray-400">{bill.month}</span>
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-gray-700 dark:text-gray-200">{formatIDR(bill.amount)}</span>
                    <button onClick={() => handleDeleteWifiBill(bill.month)} className="text-gray-300 transition-colors hover:text-red-400">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
              {wifiBills.length === 0 ? <p className="py-4 text-center text-sm text-gray-400 dark:text-gray-500">Belum ada tagihan.</p> : null}
            </div>
          </div>
        </div>
      ) : null}

      {activeTab === "wifi-usage" ? (
        <div className="surface-card p-5">
          <h2 className="mb-1 text-sm font-semibold text-gray-700 dark:text-gray-200">Data Isi WiFi</h2>
          <p className="mb-4 text-xs text-gray-400">List member yang mengisi WiFi per bulan</p>
          <div className="space-y-3">
            {(() => {
              const grouped = {};
              wifiUsage.forEach((entry) => {
                if (!grouped[entry.month]) {
                  grouped[entry.month] = [];
                }
                grouped[entry.month].push(entry);
              });
              const months = Object.keys(grouped).sort().reverse();
              if (months.length === 0) {
                return <p className="py-4 text-center text-sm text-gray-400 dark:text-gray-500">Belum ada data WiFi usage.</p>;
              }

              return months.map((month) => (
                <div key={month} className="rounded-lg bg-gray-50 p-3 dark:bg-[#1e1e38]">
                  <h4 className="mb-2 text-xs font-semibold text-gray-600 dark:text-gray-400">{month}</h4>
                  <div className="space-y-1">
                    {grouped[month].map((entry) => {
                      const member = members.find((memberItem) => memberItem.id === entry.memberId);
                      return (
                        <div key={entry.id} className="flex items-center justify-between rounded bg-white px-2 py-1.5 dark:bg-[#1a1a2e]">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-700 dark:text-gray-200">{member?.name || entry.memberId}</span>
                            <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${entry.level === "full" ? "bg-blue-50 text-[var(--color-brand)] dark:bg-blue-900/25" : "bg-amber-50 text-amber-600 dark:bg-amber-900/25 dark:text-amber-400"}`}>
                              {entry.level}
                            </span>
                          </div>
                          <button onClick={() => handleDeleteWifiUsage(entry.id)} className="text-gray-300 transition-colors hover:text-red-400">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
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
      ) : null}

      {activeTab === "history" ? (
        <div className="surface-card p-5">
          <h2 className="mb-4 text-sm font-semibold text-gray-700 dark:text-gray-200">Riwayat Transaksi</h2>
          <div className="space-y-2">
            {historyGroups.map((group, index) => (
              <div key={index} className="rounded-lg bg-gray-50 p-3 transition-colors hover:bg-gray-100/70 dark:bg-[#1e1e38] dark:hover:bg-[#252545]">
                <div className="mb-1.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`rounded px-2 py-0.5 text-[10px] font-semibold ${group.type === "kas" ? "bg-blue-50 text-[var(--color-brand)] dark:bg-blue-900/25" : group.type === "pengeluaran" ? "bg-red-50 text-red-500 dark:bg-red-900/25" : "bg-purple-50 text-purple-500 dark:bg-purple-900/25"}`}>
                      {group.type.toUpperCase()}
                    </span>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{group.memberName}</span>
                  </div>
                  <span className="text-xs text-gray-400 dark:text-gray-500">{group.dateStr}</span>
                </div>
                {group.items.length === 1 ? (
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-gray-400 dark:text-gray-500">
                      {group.items[0].month}
                      {group.items[0].notes && group.items[0].notes !== `Import dari Excel (${group.items[0].status})` ? <span className="ml-1.5 text-gray-300">· {group.items[0].notes}</span> : null}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-semibold ${group.type === "pengeluaran" ? "text-red-500" : "text-gray-700 dark:text-gray-200"}`}>{formatIDR(Math.abs(group.total))}</span>
                      <button onClick={() => handleDeleteTx(group.items[0].id)} className="text-gray-300 transition-colors hover:text-red-400">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="mb-1.5 space-y-0.5">
                      {group.items.map((transaction) => (
                        <div key={transaction.id} className="flex items-center justify-between text-xs">
                          <span className="text-gray-400">{transaction.month}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-600 dark:text-gray-400">{formatIDR(Math.abs(transaction.amount))}</span>
                            <button onClick={() => handleDeleteTx(transaction.id)} className="text-gray-200 transition-colors hover:text-red-400">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between border-t border-gray-200/60 pt-1.5 dark:border-gray-700/40">
                      <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">{group.items.length} bulan</span>
                      <span className={`text-sm font-bold ${group.type === "pengeluaran" ? "text-red-500" : "text-gray-700 dark:text-gray-200"}`}>{formatIDR(Math.abs(group.total))}</span>
                    </div>
                  </>
                )}
              </div>
            ))}
            {transactions.length === 0 ? <p className="py-10 text-center text-sm text-gray-400">Belum ada transaksi.</p> : null}
          </div>
        </div>
      ) : null}

      {activeTab === "tambah" ? (
        <motion.div className="surface-card space-y-5 p-5" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
          <div>
            <h2 className="mb-1 text-sm font-semibold text-gray-700 dark:text-gray-200">Tambah Transaksi</h2>
            <p className="text-xs text-gray-400 dark:text-gray-500">Tambah pengeluaran atau pemasukan kas manual</p>
          </div>
          <div className="flex gap-1 rounded-lg bg-gray-100 p-0.5 dark:bg-[#1e1e38]">
            <button onClick={() => setTxType("pengeluaran")} className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${txType === "pengeluaran" ? "bg-white text-red-500 shadow-sm dark:bg-[#2a2a4a]" : "text-gray-500 hover:text-gray-700"}`}>
              Pengeluaran
            </button>
            <button onClick={() => setTxType("kas")} className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${txType === "kas" ? "bg-white text-[var(--color-brand)] shadow-sm dark:bg-[#2a2a4a]" : "text-gray-500 hover:text-gray-700"}`}>
              Pemasukan Kas
            </button>
          </div>

          {txType === "pengeluaran" ? (
            <motion.form key="expense" onSubmit={handleAddExpense} className="space-y-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div>
                <label className="mb-1.5 block text-xs text-gray-500 dark:text-gray-400">Nominal (Rp)</label>
                <input type="number" value={expenseForm.amount} onChange={(event) => setExpenseForm({ ...expenseForm, amount: event.target.value })} placeholder="50000" className={inputCls} required />
              </div>
              <div>
                <label className="mb-1.5 block text-xs text-gray-500 dark:text-gray-400">Tanggal</label>
                <input type="date" value={expenseForm.date} onChange={(event) => setExpenseForm({ ...expenseForm, date: event.target.value })} className={inputCls} required />
              </div>
              <div>
                <label className="mb-1.5 block text-xs text-gray-500 dark:text-gray-400">Keterangan</label>
                <input type="text" value={expenseForm.notes} onChange={(event) => setExpenseForm({ ...expenseForm, notes: event.target.value })} placeholder="Beli Listrik, Sapu, dll..." className={inputCls} required />
              </div>
              {expenseForm.amount ? (
                <div className="flex items-center justify-between rounded-lg border border-red-100 bg-red-50/60 p-2.5 dark:border-red-800/30 dark:bg-red-900/20">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Akan dicatat</span>
                  <span className="text-sm font-semibold text-red-500">-{formatIDR(Math.abs(parseInt(expenseForm.amount || "0", 10)))}</span>
                </div>
              ) : null}
              <button type="submit" className="w-full rounded-lg bg-red-500 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-600">
                Tambah Pengeluaran
              </button>
            </motion.form>
          ) : (
            <motion.form key="kas" onSubmit={handleAddKasManual} className="space-y-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div>
                <label className="mb-1.5 block text-xs text-gray-500 dark:text-gray-400">Member</label>
                <select value={kasForm.memberId} onChange={(event) => setKasForm({ ...kasForm, memberId: event.target.value })} className={inputCls} required>
                  <option value="">Pilih Member...</option>
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs text-gray-500 dark:text-gray-400">Bulan</label>
                  <input type="month" value={kasForm.month} onChange={(event) => setKasForm({ ...kasForm, month: event.target.value })} className={inputCls} required />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs text-gray-500 dark:text-gray-400">Status</label>
                  <select value={kasForm.status} onChange={(event) => setKasForm({ ...kasForm, status: event.target.value })} className={inputCls}>
                    <option value="full">Full ({formatIDR(calculateKas(kasForm.month, "full"))})</option>
                    <option value="half">Half ({formatIDR(calculateKas(kasForm.month, "half"))})</option>
                    <option value="none">None ({formatIDR(calculateKas(kasForm.month, "none"))})</option>
                  </select>
                </div>
              </div>
              {kasForm.memberId && kasForm.month ? (
                <div className="flex items-center justify-between rounded-lg border border-blue-100 bg-blue-50/60 p-2.5 dark:border-blue-800/30 dark:bg-blue-900/20">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Akan dicatat</span>
                  <span className="text-sm font-semibold text-[var(--color-brand)]">+{formatIDR(calculateKas(kasForm.month, kasForm.status))}</span>
                </div>
              ) : null}
              <button type="submit" className="btn-primary w-full rounded-lg py-2.5 text-sm font-medium transition-colors">Tambah Kas</button>
            </motion.form>
          )}

          {transactions.length > 0 ? (
            <div className="border-t border-gray-100 pt-4 dark:border-gray-700/50">
              <h3 className="mb-2 text-xs text-gray-400 dark:text-gray-500">5 Transaksi Terakhir</h3>
              <div className="space-y-1.5">
                {[...transactions].sort((left, right) => new Date(right.date) - new Date(left.date)).slice(0, 5).map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between rounded-lg bg-gray-50 p-2 text-xs dark:bg-[#1e1e38]">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold ${transaction.type === "pengeluaran" ? "bg-red-50 text-red-500 dark:bg-red-900/25" : transaction.type === "wifi" ? "bg-purple-50 text-purple-500 dark:bg-purple-900/25" : "bg-blue-50 text-[var(--color-brand)] dark:bg-blue-900/25"}`}>
                        {transaction.type === "pengeluaran" ? "OUT" : transaction.type.toUpperCase()}
                      </span>
                      <span className="truncate text-gray-600 dark:text-gray-400">{transaction.memberName} · {transaction.notes || transaction.month}</span>
                    </div>
                    <div className="ml-2 flex shrink-0 items-center gap-2">
                      <span className={`font-medium ${transaction.type === "pengeluaran" ? "text-red-500" : "text-gray-700 dark:text-gray-200"}`}>{formatIDR(Math.abs(transaction.amount))}</span>
                      <button onClick={() => handleDeleteTx(transaction.id)} className="text-gray-300 transition-colors hover:text-red-400">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </motion.div>
      ) : null}

      {activeTab === "export" ? (
        <motion.div className="surface-card space-y-5 p-5" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
          <div>
            <h2 className="mb-1 text-sm font-semibold text-gray-700 dark:text-gray-200">Export Data ke Excel</h2>
            <p className="text-xs text-gray-400 dark:text-gray-500">Download semua data kas dalam format .xlsx</p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              {
                label: "Total Pemasukan",
                value: formatIDR(transactions.filter((transaction) => transaction.type === "kas").reduce((sum, transaction) => sum + transaction.amount, 0)),
                color: "text-green-600",
                bg: "bg-green-50 dark:bg-green-900/20",
              },
              {
                label: "Total Pengeluaran",
                value: formatIDR(transactions.filter((transaction) => transaction.type === "pengeluaran").reduce((sum, transaction) => sum + Math.abs(transaction.amount), 0)),
                color: "text-red-500",
                bg: "bg-red-50 dark:bg-red-900/20",
              },
              {
                label: "Saldo Kas",
                value: formatIDR(
                  transactions.filter((transaction) => transaction.type === "kas").reduce((sum, transaction) => sum + transaction.amount, 0) -
                    transactions.filter((transaction) => transaction.type === "pengeluaran").reduce((sum, transaction) => sum + Math.abs(transaction.amount), 0),
                ),
                color: "text-[var(--color-brand)]",
                bg: "bg-[var(--color-brand-soft)] dark:bg-[#1e1e38]",
              },
            ].map((item) => (
              <div key={item.label} className={`rounded-lg p-3 ${item.bg}`}>
                <p className="mb-1 text-[11px] text-gray-500 dark:text-gray-400">{item.label}</p>
                <p className={`text-sm font-semibold ${item.color}`}>{item.value}</p>
              </div>
            ))}
          </div>
          <div className="space-y-1.5 rounded-lg bg-gray-50 p-3 text-xs text-gray-500 dark:bg-[#1e1e38] dark:text-gray-400">
            <p className="font-medium text-gray-600 dark:text-gray-300">File Excel akan berisi:</p>
            <ul className="space-y-0.5 pl-3">
              <li>Sheet &quot;Ringkasan&quot; — saldo, pemasukan, pengeluaran</li>
              <li>Sheet &quot;Rekap Kas&quot; — tabel member × bulan</li>
              <li>Sheet &quot;Pengeluaran&quot; — daftar semua pengeluaran</li>
              <li>Sheet &quot;Semua Transaksi&quot; — seluruh data</li>
            </ul>
            <p className="text-gray-400">Total {transactions.length} transaksi</p>
          </div>
          <button onClick={handleExportExcel} className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--color-success)] py-3 text-sm font-medium text-white transition-colors hover:bg-[#2d9249]">
            Download Excel
          </button>
        </motion.div>
      ) : null}
    </div>
  );
}
