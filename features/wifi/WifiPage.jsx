"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Field, SelectInput, TextInput } from "@/components/ui/field";
import Modal from "@/components/ui/modal";
import PageHeading from "@/components/ui/page-heading";
import { calculateMemberWifiAmount } from "@/lib/shared/cashflow";
import { formatIDR, formatMonthLabel } from "@/lib/shared/format";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (index = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, delay: index * 0.1, ease: [0.25, 0.46, 0.45, 0.94] },
  }),
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};

export default function WifiPage({ initialData }) {
  const [selectedMember, setSelectedMember] = useState("");
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [level, setLevel] = useState("full");
  const [wifiUsage, setWifiUsage] = useState(initialData.wifiUsage);
  const [popup, setPopup] = useState(null);
  const [pendingUsage, setPendingUsage] = useState(null);
  const [successMsg, setSuccessMsg] = useState("");

  const selectedMemberId = selectedMember ? parseInt(selectedMember, 10) : 0;
  const bill = initialData.wifiBills.find((entry) => entry.month === month);
  const monthUsage = useMemo(() => wifiUsage.filter((entry) => entry.month === month), [month, wifiUsage]);
  const fullUsers = monthUsage.filter((entry) => entry.level === "full").length;
  const halfUsers = monthUsage.filter((entry) => entry.level === "half").length;

  const previewAmount = selectedMemberId
    ? calculateMemberWifiAmount(
        selectedMemberId,
        month,
        initialData.wifiBills,
        monthUsage.find((entry) => entry.memberId === selectedMemberId)
          ? wifiUsage
          : [...wifiUsage, { memberId: selectedMemberId, month, level }],
      )
    : 0;

  const refreshUsage = async () => {
    const nextUsage = await fetch("/api/wifi-usage").then((response) => response.json());
    setWifiUsage(nextUsage);
  };

  const handleSubmit = () => {
    if (!selectedMember) {
      setPopup({ title: "Perhatian", message: "Pilih nama kamu dulu!" });
      return;
    }

    if (!month) {
      setPopup({ title: "Perhatian", message: "Pilih bulan!" });
      return;
    }

    const member = initialData.members.find((entry) => entry.id === selectedMemberId);
    if (!member) {
      return;
    }

    setPendingUsage({
      memberId: selectedMemberId,
      memberName: member.name,
      month,
      level,
      isUpdate: wifiUsage.some((entry) => entry.memberId === selectedMemberId && entry.month === month),
    });
  };

  const confirmSubmit = async () => {
    if (!pendingUsage) {
      return;
    }

    const submission = pendingUsage;
    setPendingUsage(null);

    await fetch("/api/wifi-usage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        memberId: submission.memberId,
        memberName: submission.memberName,
        month: submission.month,
        level: submission.level,
      }),
    });

    setSuccessMsg(
      `Data WiFi kamu untuk ${submission.month} ${submission.isUpdate ? "diubah" : "tersimpan"}: ${
        submission.level === "full" ? "Full" : "Setengah Bulan"
      }`,
    );
    setTimeout(() => setSuccessMsg(""), 4000);
    await refreshUsage();
  };

  const handleDeleteUsage = async (id, name) => {
    if (!confirm(`Hapus data WiFi untuk ${name}?`)) {
      return;
    }

    await fetch(`/api/wifi-usage?id=${id}`, { method: "DELETE" });
    await refreshUsage();
    setSuccessMsg(`Data WiFi ${name} dihapus`);
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  return (
    <div className="mx-auto max-w-lg space-y-5">
      <Modal open={Boolean(popup)} title={popup?.title} description={popup?.message} onClose={() => setPopup(null)}>
        <button onClick={() => setPopup(null)} className="w-full rounded-lg bg-gray-100 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 dark:bg-[#2a2a4a] dark:text-gray-200 dark:hover:bg-[#3a3a5a]">
          Tutup
        </button>
      </Modal>

      <Modal
        open={Boolean(pendingUsage)}
        title={pendingUsage?.isUpdate ? "Konfirmasi Perbarui Pemakaian WiFi" : "Konfirmasi Pemakaian WiFi"}
        onClose={() => setPendingUsage(null)}
      >
        {pendingUsage ? (
          <>
            <div className="mb-4 space-y-2 rounded-lg border border-purple-100 bg-purple-50/60 p-3 text-sm dark:border-purple-800/30 dark:bg-purple-900/20">
              <div className="flex justify-between gap-3">
                <span className="text-gray-500 dark:text-gray-400">Nama</span>
                <span className="text-right font-medium text-gray-800 dark:text-gray-100">{pendingUsage.memberName}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-gray-500 dark:text-gray-400">Bulan</span>
                <span className="text-right font-medium text-gray-800 dark:text-gray-100">{formatMonthLabel(pendingUsage.month)}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-gray-500 dark:text-gray-400">Pemakaian</span>
                <span className="text-right font-medium text-gray-800 dark:text-gray-100">
                  {pendingUsage.level === "full" ? "Full (sebulan penuh)" : "Setengah bulan"}
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setPendingUsage(null)} className="flex-1 rounded-lg bg-gray-100 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 dark:bg-[#2a2a4a] dark:text-gray-200 dark:hover:bg-[#3a3a5a]">
                Batal
              </button>
              <button onClick={confirmSubmit} className="flex-1 rounded-lg bg-[var(--color-wifi)] py-2 text-sm font-medium text-white transition-colors hover:bg-[#6b4fe0]">
                {pendingUsage.isUpdate ? "Perbarui" : "Simpan"}
              </button>
            </div>
          </>
        ) : null}
      </Modal>

      <AnimatePresence>
        {successMsg ? (
          <motion.div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700 dark:border-green-700/50 dark:bg-green-900/20 dark:text-green-400" initial={{ opacity: 0, y: -20, height: 0 }} animate={{ opacity: 1, y: 0, height: "auto" }} exit={{ opacity: 0, y: -20, height: 0 }} transition={{ type: "spring", stiffness: 300, damping: 25 }}>
            ✓ {successMsg}
          </motion.div>
        ) : null}
      </AnimatePresence>

      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <PageHeading centered title="Isi Pemakaian WiFi" description="Isi apakah kamu pakai WiFi bulan ini" />
      </motion.div>

      <motion.div variants={fadeUp} custom={0} initial="hidden" animate="visible">
        <Card className="space-y-4 p-5">
          <Field label="Siapa kamu?">
            <SelectInput value={selectedMember} onChange={(event) => setSelectedMember(event.target.value)}>
              <option value="">Pilih Namamu...</option>
              {initialData.members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </SelectInput>
          </Field>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Bulan">
              <TextInput type="month" value={month} onChange={(event) => setMonth(event.target.value)} />
            </Field>
            <Field label="Pakai WiFi bulan ini?">
              <SelectInput value={level} onChange={(event) => setLevel(event.target.value)}>
                <option value="full">Full (sebulan penuh)</option>
                <option value="half">Setengah bulan</option>
              </SelectInput>
            </Field>
          </div>
          <motion.button onClick={handleSubmit} className="w-full rounded-lg bg-[var(--color-wifi)] py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#6b4fe0]" whileTap={{ scale: 0.97 }}>
            Simpan Pemakaian WiFi
          </motion.button>
        </Card>
      </motion.div>

      {bill && (fullUsers + halfUsers) > 0 && selectedMember ? (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} transition={{ duration: 0.4 }}>
          <Card className="p-5">
            <h3 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-200">Perkiraan Tagihan WiFi</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-500 dark:text-gray-400">
                <span>Total tagihan bulan ini</span>
                <span className="font-medium text-gray-700 dark:text-gray-200">{formatIDR(bill.amount)}</span>
              </div>
              <div className="flex justify-between text-gray-500 dark:text-gray-400">
                <span>Pengguna: {fullUsers} full, {halfUsers} setengah</span>
                <span className="text-xs text-gray-400 dark:text-gray-500">({fullUsers + halfUsers} orang)</span>
              </div>
              <div className="flex justify-between border-t border-gray-100 pt-2 dark:border-gray-700/50">
                <span className="font-medium text-gray-600 dark:text-gray-300">Kamu bayar</span>
                <motion.span className="text-lg font-semibold text-gray-800 dark:text-gray-100" key={previewAmount} initial={{ scale: 1.1, color: "var(--color-wifi)" }} animate={{ scale: 1, color: "var(--foreground)" }} transition={{ duration: 0.3 }}>
                  {formatIDR(previewAmount)}
                </motion.span>
              </div>
            </div>
          </Card>
        </motion.div>
      ) : null}

      {!bill && month ? (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} transition={{ duration: 0.4 }}>
          <Card className="p-5">
            <p className="text-center text-sm text-amber-600 dark:text-amber-400">Tagihan WiFi bulan {month} belum diinput admin</p>
          </Card>
        </motion.div>
      ) : null}

      {monthUsage.length > 0 ? (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} transition={{ duration: 0.4, delay: 0.1 }}>
          <Card className="p-5">
            <h3 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-200">Yang sudah isi ({month})</h3>
            <motion.div className="space-y-1.5" variants={staggerContainer} initial="hidden" animate="visible">
              {monthUsage.map((usage, index) => (
                <motion.div key={usage.id} className="flex items-center justify-between rounded-lg bg-gray-50 p-2.5 text-sm dark:bg-[#1e1e38]" variants={fadeUp} custom={index} whileHover={{ x: 4, backgroundColor: "var(--card-border)" }}>
                  <span className="font-medium text-gray-700 dark:text-gray-200">{usage.memberName}</span>
                  <div className="flex items-center gap-2">
                    <span className={`rounded px-2 py-0.5 text-[10px] font-semibold ${usage.level === "full" ? "border border-blue-200 bg-blue-50 text-[var(--color-brand)] dark:border-blue-700/50 dark:bg-blue-900/30" : "border border-amber-200 bg-amber-50 text-amber-600 dark:border-amber-700/50 dark:bg-amber-900/30 dark:text-amber-400"}`}>
                      {usage.level === "full" ? "FULL" : "SETENGAH"}
                    </span>
                    <button onClick={() => handleDeleteUsage(usage.id, usage.memberName)} className="text-gray-300 transition-colors hover:text-red-400 dark:text-gray-600">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </Card>
        </motion.div>
      ) : null}
    </div>
  );
}
