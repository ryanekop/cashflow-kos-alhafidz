"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { Card } from "@/components/ui/card";
import { Field, SelectInput, TextInput } from "@/components/ui/field";
import Modal from "@/components/ui/modal";
import PageHeading from "@/components/ui/page-heading";
import { useToast } from "@/components/ui/toast";
import { calculateKas, calculateMemberWifiAmount } from "@/lib/shared/cashflow";
import { PAYMENT_METHODS, WHATSAPP_NUMBER } from "@/lib/shared/constants";
import { formatIDR, formatMonthLabel } from "@/lib/shared/format";
import { buildWhatsAppPaymentText, getPaymentMethod } from "@/lib/shared/payment";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (index = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, delay: index * 0.1, ease: [0.25, 0.46, 0.45, 0.94] },
  }),
};

export default function PaymentPage({ initialData }) {
  const { showToast } = useToast();
  const [selectedMember, setSelectedMember] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [whatsAppConfirmation, setWhatsAppConfirmation] = useState(null);
  const [kasEntries, setKasEntries] = useState([{ month: "", status: "full" }]);
  const [wifiEntries, setWifiEntries] = useState([{ month: "" }]);
  const didRestoreRef = useRef(false);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      try {
        const saved = localStorage.getItem("payment_calc");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.selectedMember) setSelectedMember(parsed.selectedMember);
          if (parsed.paymentMethod) setPaymentMethod(parsed.paymentMethod);
          if (parsed.kasEntries?.length) setKasEntries(parsed.kasEntries);
          if (parsed.wifiEntries?.length) setWifiEntries(parsed.wifiEntries);
        }
      } catch {}

      didRestoreRef.current = true;
    }, 0);

    return () => clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    if (!didRestoreRef.current) {
      return;
    }

    localStorage.setItem(
      "payment_calc",
      JSON.stringify({ selectedMember, paymentMethod, kasEntries, wifiEntries }),
    );
  }, [kasEntries, paymentMethod, selectedMember, wifiEntries]);

  const clearSavedData = () => localStorage.removeItem("payment_calc");
  const selectedMemberValue = selectedMember ? parseInt(selectedMember, 10) : 0;
  const selectedMemberIsActive = initialData.members.some((member) => member.id === selectedMemberValue);
  const selectedMemberId = selectedMemberIsActive ? selectedMemberValue : 0;

  const getKasAmount = (entry) => {
    if (!entry.month || !entry.status) {
      return 0;
    }

    return calculateKas(entry.month, entry.status);
  };

  const getWifiStatus = (entry) => {
    if (!entry.month || !selectedMemberId) {
      return null;
    }

    return initialData.wifiUsage.find(
      (usage) => usage.memberId === selectedMemberId && usage.month === entry.month,
    );
  };

  const getWifiAmount = (entry) => {
    if (!entry.month || !selectedMemberId) {
      return 0;
    }

    return calculateMemberWifiAmount(
      selectedMemberId,
      entry.month,
      initialData.wifiBills,
      initialData.wifiUsage,
    );
  };

  const checkPaid = (type, month) =>
    Boolean(
      selectedMemberId &&
        initialData.transactions.some(
          (transaction) =>
            transaction.memberId === selectedMemberId &&
            transaction.type === type &&
            transaction.month === month,
        ),
    );

  const selectedMemberName =
    initialData.members.find((member) => member.id === selectedMemberId)?.name ?? "";

  const totalKas = kasEntries.reduce((sum, entry) => sum + getKasAmount(entry), 0);
  const totalWifi = wifiEntries.reduce((sum, entry) => sum + getWifiAmount(entry), 0);
  const totalPayment = totalKas + totalWifi;

  const addKasEntry = () => setKasEntries((entries) => [...entries, { month: "", status: "full" }]);
  const addWifiEntry = () => setWifiEntries((entries) => [...entries, { month: "" }]);

  const updateKasEntry = (index, field, value) => {
    setKasEntries((entries) => entries.map((entry, entryIndex) => (entryIndex === index ? { ...entry, [field]: value } : entry)));
  };
  const updateWifiEntry = (index, field, value) => {
    setWifiEntries((entries) => entries.map((entry, entryIndex) => (entryIndex === index ? { ...entry, [field]: value } : entry)));
  };

  const removeKasEntry = (index) => {
    setKasEntries((entries) => (entries.length <= 1 ? [{ month: "", status: "full" }] : entries.filter((_, entryIndex) => entryIndex !== index)));
  };
  const removeWifiEntry = (index) => {
    setWifiEntries((entries) => (entries.length <= 1 ? [{ month: "" }] : entries.filter((_, entryIndex) => entryIndex !== index)));
  };

  const handleWhatsApp = () => {
    if (!selectedMemberId) {
      showToast("Pilih nama kamu dulu!", "warning");
      return;
    }

    if (!paymentMethod) {
      showToast("Pilih metode pembayaran dulu!", "warning");
      return;
    }

    const activeKas = kasEntries.filter((entry) => entry.month && getKasAmount(entry) > 0);
    const activeWifi = wifiEntries.filter((entry) => entry.month && getWifiAmount(entry) > 0);

    if (!activeKas.length && !activeWifi.length) {
      showToast("Pilih minimal satu bulan untuk kas atau WiFi!", "warning");
      return;
    }

    const issues = [];
    activeKas.forEach((entry) => {
      if (checkPaid("kas", entry.month)) {
        issues.push(`Kas ${entry.month}`);
      }
    });
    activeWifi.forEach((entry) => {
      if (checkPaid("wifi", entry.month)) {
        issues.push(`WiFi ${entry.month}`);
      }
    });

    if (issues.length > 0) {
      showToast(`${issues.join(", ")} sudah dibayar.`, "info");
      return;
    }

    for (const entry of activeWifi) {
      if (!getWifiStatus(entry)) {
        showToast(`Kamu belum mengisi pemakaian WiFi bulan ${entry.month}. Isi dulu di halaman Isi WiFi.`, "warning");
        return;
      }
    }

    const url = buildWhatsAppPaymentText({
      memberName: selectedMemberName,
      paymentMethodId: paymentMethod,
      totalKas,
      totalWifi,
      totalPayment,
      kasMonths: activeKas.map((entry) => entry.month),
      wifiMonths: activeWifi.map((entry) => entry.month),
    });

    setWhatsAppConfirmation({
      memberName: selectedMemberName,
      paymentMethod: getPaymentMethod(paymentMethod)?.label ?? "",
      kasMonths: activeKas.map((entry) => entry.month),
      wifiMonths: activeWifi.map((entry) => entry.month),
      totalKas,
      totalWifi,
      totalPayment,
      url: `https://wa.me/${WHATSAPP_NUMBER}?text=${url}`,
    });
  };

  const confirmWhatsApp = () => {
    if (!whatsAppConfirmation) {
      return;
    }

    window.open(whatsAppConfirmation.url, "_blank");
    clearSavedData();
    setWhatsAppConfirmation(null);
    showToast("Membuka WhatsApp untuk mengirim bukti pembayaran.", "success");
  };

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <Modal open={Boolean(whatsAppConfirmation)} title="Konfirmasi Kirim Bukti" onClose={() => setWhatsAppConfirmation(null)}>
        {whatsAppConfirmation ? (
          <>
            <div className="mb-4 space-y-2 rounded-lg border border-green-100 bg-green-50/60 p-3 text-sm dark:border-green-800/30 dark:bg-green-900/20">
              <div className="flex justify-between gap-3">
                <span className="text-gray-500 dark:text-gray-400">Nama</span>
                <span className="text-right font-medium text-gray-800 dark:text-gray-100">{whatsAppConfirmation.memberName}</span>
              </div>
              {whatsAppConfirmation.totalKas > 0 ? (
                <div className="flex justify-between gap-3">
                  <span className="text-gray-500 dark:text-gray-400">
                    Kas ({whatsAppConfirmation.kasMonths.map((entry) => formatMonthLabel(entry)).join(", ")})
                  </span>
                  <span className="shrink-0 font-medium text-gray-800 dark:text-gray-100">{formatIDR(whatsAppConfirmation.totalKas)}</span>
                </div>
              ) : null}
              {whatsAppConfirmation.totalWifi > 0 ? (
                <div className="flex justify-between gap-3">
                  <span className="text-gray-500 dark:text-gray-400">
                    WiFi ({whatsAppConfirmation.wifiMonths.map((entry) => formatMonthLabel(entry)).join(", ")})
                  </span>
                  <span className="shrink-0 font-medium text-gray-800 dark:text-gray-100">{formatIDR(whatsAppConfirmation.totalWifi)}</span>
                </div>
              ) : null}
              <div className="flex justify-between gap-3">
                <span className="text-gray-500 dark:text-gray-400">Metode</span>
                <span className="text-right font-medium text-gray-800 dark:text-gray-100">{whatsAppConfirmation.paymentMethod}</span>
              </div>
              <div className="flex justify-between gap-3 border-t border-green-200 pt-2 dark:border-green-800/40">
                <span className="font-medium text-gray-600 dark:text-gray-300">Total</span>
                <span className="text-base font-semibold text-gray-800 dark:text-gray-100">{formatIDR(whatsAppConfirmation.totalPayment)}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setWhatsAppConfirmation(null)} className="flex-1 rounded-lg bg-gray-100 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 dark:bg-[#2a2a4a] dark:text-gray-300 dark:hover:bg-[#3a3a5a]">
                Batal
              </button>
              <button onClick={confirmWhatsApp} className="flex-1 rounded-lg bg-[#25D366] py-2 text-sm font-medium text-white transition-colors hover:bg-[#1fb855]">
                Kirim via WhatsApp
              </button>
            </div>
          </>
        ) : null}
      </Modal>

      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <PageHeading centered title="Kalkulator Pembayaran" description="Hitung tagihan lalu hubungi via WhatsApp" />
      </motion.div>

      <motion.div variants={fadeUp} custom={0} initial="hidden" animate="visible">
        <Card className="p-5">
          <Field label="Siapa kamu?">
            <SelectInput value={selectedMemberIsActive ? selectedMember : ""} onChange={(event) => setSelectedMember(event.target.value)}>
              <option value="">Pilih Namamu...</option>
              {initialData.members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </SelectInput>
          </Field>
        </Card>
      </motion.div>

      <motion.div variants={fadeUp} custom={1} initial="hidden" animate="visible">
        <Card className="space-y-4 p-5">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-brand)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
                <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
                <path d="M18 12a2 2 0 0 0 0 4h4v-4z" />
              </svg>
              Kas Kos
            </h2>
            <button onClick={addKasEntry} className="flex items-center gap-1 text-xs font-medium text-[var(--color-brand)] transition-colors hover:text-[#4060e0]">
              Tambah Bulan
            </button>
          </div>

          <AnimatePresence mode="popLayout">
            {kasEntries.map((entry, index) => (
              <motion.div key={`kas-${index}-${kasEntries.length}`} className="space-y-2" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3 }}>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-gray-400">{kasEntries.length > 1 ? `Kas #${index + 1}` : ""}</span>
                  {entry.month ? (
                    <button onClick={() => removeKasEntry(index)} className="flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-500 transition-colors hover:bg-red-100">
                      Hapus
                    </button>
                  ) : null}
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label="Bulan">
                    <TextInput type="month" value={entry.month} onChange={(event) => updateKasEntry(index, "month", event.target.value)} />
                  </Field>
                  <Field label="Status">
                    <SelectInput value={entry.status} onChange={(event) => updateKasEntry(index, "status", event.target.value)}>
                      <option value="full">Di kos (Full)</option>
                      <option value="half">Setengah bulan</option>
                      <option value="none">Tidak di kos</option>
                    </SelectInput>
                  </Field>
                </div>
                {entry.month ? (
                  <motion.div className="flex items-center justify-between rounded-lg border border-blue-100 bg-blue-50/60 p-2.5 dark:border-blue-800/30 dark:bg-blue-900/20" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                    <span className="text-xs text-gray-500 dark:text-gray-400">Subtotal</span>
                    <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">{formatIDR(getKasAmount(entry))}</span>
                  </motion.div>
                ) : null}
              </motion.div>
            ))}
          </AnimatePresence>

          {totalKas > 0 && kasEntries.length > 1 ? (
            <motion.div className="flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800/30 dark:bg-blue-900/20" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}>
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Kas</span>
              <span className="text-lg font-semibold text-gray-800 dark:text-gray-100">{formatIDR(totalKas)}</span>
            </motion.div>
          ) : null}
        </Card>
      </motion.div>

      <motion.div variants={fadeUp} custom={2} initial="hidden" animate="visible">
        <Card className="space-y-4 p-5">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-wifi)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12.55a11 11 0 0 1 14.08 0" />
                <path d="M1.42 9a16 16 0 0 1 21.16 0" />
                <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
                <line x1="12" y1="20" x2="12.01" y2="20" />
              </svg>
              WiFi
            </h2>
            <button onClick={addWifiEntry} className="flex items-center gap-1 text-xs font-medium text-[var(--color-wifi)] transition-colors hover:text-[#6b4fe0]">
              Tambah Bulan
            </button>
          </div>

          <AnimatePresence mode="popLayout">
            {wifiEntries.map((entry, index) => (
              <motion.div key={`wifi-${index}-${wifiEntries.length}`} className="space-y-2" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3 }}>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-gray-400">{wifiEntries.length > 1 ? `WiFi #${index + 1}` : ""}</span>
                  {entry.month ? (
                    <button onClick={() => removeWifiEntry(index)} className="flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-500 transition-colors hover:bg-red-100">
                      Hapus
                    </button>
                  ) : null}
                </div>
                <Field label="Bulan">
                  <TextInput type="month" value={entry.month} onChange={(event) => updateWifiEntry(index, "month", event.target.value)} />
                </Field>
                {entry.month && selectedMemberId ? (
                  (() => {
                    const usage = getWifiStatus(entry);
                    const amount = getWifiAmount(entry);

                    if (usage) {
                      return (
                        <motion.div className="flex items-center justify-between rounded-lg border border-purple-100 bg-purple-50/60 p-2.5 dark:border-purple-800/30 dark:bg-purple-900/20" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
                          <div>
                            <span className="text-xs text-gray-500 dark:text-gray-400">Subtotal</span>
                            <p className="text-[10px] text-gray-400">{usage.level === "full" ? "Full" : "Setengah"}</p>
                          </div>
                          {amount > 0 ? (
                            <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">{formatIDR(amount)}</span>
                          ) : (
                            <span className="text-[11px] text-amber-600">Tagihan belum diinput admin</span>
                          )}
                        </motion.div>
                      );
                    }

                    return (
                      <motion.div className="rounded-lg border border-amber-100 bg-amber-50 p-2.5 text-xs text-amber-700" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
                        Belum isi pemakaian WiFi bulan ini. <a href="/wifi" className="font-medium underline hover:text-amber-800">Isi di sini →</a>
                      </motion.div>
                    );
                  })()
                ) : null}
              </motion.div>
            ))}
          </AnimatePresence>

          {totalWifi > 0 && wifiEntries.length > 1 ? (
            <motion.div className="flex items-center justify-between rounded-lg border border-purple-200 bg-purple-50 p-3 dark:border-purple-800/30 dark:bg-purple-900/20" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}>
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Total WiFi</span>
              <span className="text-lg font-semibold text-gray-800 dark:text-gray-100">{formatIDR(totalWifi)}</span>
            </motion.div>
          ) : null}
        </Card>
      </motion.div>

      <motion.div variants={fadeUp} custom={3} initial="hidden" animate="visible">
        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Total Pembayaran</span>
            <motion.span className="text-2xl font-bold text-gray-800 dark:text-gray-100" key={totalPayment} initial={{ scale: 1.15, color: "var(--color-brand)" }} animate={{ scale: 1, color: "var(--foreground)" }} transition={{ duration: 0.4 }}>
              {formatIDR(totalPayment)}
            </motion.span>
          </div>
          {totalKas > 0 ? (
            <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400">
              <span>Kas ({kasEntries.filter((entry) => entry.month).map((entry) => entry.month).join(", ")})</span>
              <span>{formatIDR(totalKas)}</span>
            </div>
          ) : null}
          {totalWifi > 0 ? (
            <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400">
              <span>WiFi ({wifiEntries.filter((entry) => entry.month).map((entry) => entry.month).join(", ")})</span>
              <span>{formatIDR(totalWifi)}</span>
            </div>
          ) : null}
        </Card>
      </motion.div>

      <motion.div variants={fadeUp} custom={4} initial="hidden" animate="visible">
        <Card className="space-y-4 p-5">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Metode Pembayaran</h3>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-2">
            {PAYMENT_METHODS.map((method) => (
              <motion.button
                key={method.id}
                onClick={() => setPaymentMethod((current) => (current === method.id ? "" : method.id))}
                className={`rounded-lg border p-3 text-left transition-all ${
                  paymentMethod === method.id
                    ? "border-[var(--color-brand)] bg-white ring-1 ring-[var(--color-brand)] shadow-sm dark:bg-[#1e1e38]"
                    : "border-gray-100 bg-gray-50 hover:border-gray-200 dark:border-gray-600 dark:bg-[#1e1e38] dark:hover:border-gray-500"
                }`}
                whileTap={{ scale: 0.95 }}
                whileHover={{ y: -2 }}
              >
                <div className="mb-1 flex items-center gap-2">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-md">
                    <Image src={method.logo} alt={method.label} width={32} height={32} className="h-full w-full object-contain" />
                  </div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{method.label}</span>
                  {paymentMethod === method.id ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-brand)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="ml-auto">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : null}
                </div>
                <p className="text-[11px] text-gray-400">{method.desc}</p>
              </motion.button>
            ))}
          </div>

          {paymentMethod ? (
            (() => {
              const selected = getPaymentMethod(paymentMethod);
              if (!selected) {
                return null;
              }

              return (
                <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-4 dark:border-blue-900/30 dark:bg-blue-900/15">
                  <div className="mb-3 flex items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-md">
                      <Image src={selected.logo} alt={selected.label} width={32} height={32} className="h-full w-full object-contain" />
                    </div>
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                      {selected.id === "bni" ? "Transfer via BNI" : `Via ${selected.label}`}
                    </p>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-gray-100 bg-white px-3.5 py-2.5 dark:border-gray-600 dark:bg-[#1e1e38]">
                    <div>
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{selected.account}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">A.n {selected.accountName}</p>
                    </div>
                    <button
                      onClick={async (event) => {
                        event.stopPropagation();
                        try {
                          await navigator.clipboard.writeText(selected.account);
                          showToast(`Nomor ${selected.id === "bni" ? "rekening" : selected.label} berhasil disalin.`, "success");
                        } catch {
                          showToast("Nomor gagal disalin. Silakan salin secara manual.", "error");
                        }
                      }}
                      className="flex shrink-0 items-center gap-1.5 rounded-lg bg-[var(--color-brand)] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#4060e0]"
                    >
                      Salin
                    </button>
                  </div>
                </div>
              );
            })()
          ) : null}

          <button onClick={handleWhatsApp} className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#25D366] py-3 text-sm font-medium text-white transition-colors hover:bg-[#1fb855]">
            Kirim Bukti via WhatsApp
          </button>
        </Card>
      </motion.div>

      <motion.div variants={fadeUp} custom={5} initial="hidden" animate="visible">
        <Card className="p-5">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200">Informasi Tarif Kas</h3>
          <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <div className="rounded-lg bg-gray-50 p-3 dark:bg-[#1e1e38]">
              <p className="mb-2 text-xs font-medium text-gray-400 dark:text-gray-500">Sebelum Juli 2025</p>
              <ul className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
                <li>Di kos (Full): <span className="font-medium text-gray-700 dark:text-gray-200">Rp25.000</span></li>
                <li>Setengah bulan: <span className="font-medium text-gray-700 dark:text-gray-200">Rp12.500</span></li>
                <li>Tidak di kos: <span className="font-medium text-gray-700 dark:text-gray-200">Rp10.000</span></li>
              </ul>
            </div>
            <div className="rounded-lg bg-gray-50 p-3 dark:bg-[#1e1e38]">
              <p className="mb-2 text-xs font-medium text-gray-400 dark:text-gray-500">Mulai Juli 2025</p>
              <ul className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
                <li>Di kos (Full): <span className="font-medium text-gray-700 dark:text-gray-200">Rp30.000</span></li>
                <li>Setengah bulan: <span className="font-medium text-gray-700 dark:text-gray-200">Rp15.000</span></li>
                <li>Tidak di kos: <span className="font-medium text-gray-700 dark:text-gray-200">Rp10.000</span></li>
              </ul>
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
