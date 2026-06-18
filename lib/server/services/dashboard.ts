import "server-only";

import { listMembers } from "@/lib/server/repositories/members";
import { listTransactions } from "@/lib/server/repositories/transactions";
import { listWifiBills } from "@/lib/server/repositories/wifi-bills";
import { listWifiDebts } from "@/lib/server/repositories/wifi-debts";
import { listWifiUsage } from "@/lib/server/repositories/wifi-usage";
import { calculateKas, calculateMemberWifiAmount } from "@/lib/shared/cashflow";
import { getCurrentMonth, enumerateMonths } from "@/lib/shared/date";
import { getExitMonth, getMemberKasStatusForMonth, isMemberActive, isMemberActiveForMonth } from "@/lib/shared/members";
import { MONTH_LABELS } from "@/lib/shared/constants";
import type { Member, SummaryData } from "@/lib/types/domain";

export function getSummaryData(): SummaryData {
  const members = listMembers();
  const activeMembers = members.filter(isMemberActive);
  const transactions = listTransactions();
  const wifiBills = listWifiBills();

  const totalPemasukan = transactions
    .filter((transaction) => transaction.type === "kas")
    .reduce((sum, transaction) => sum + transaction.amount, 0);

  const totalPengeluaran = transactions
    .filter((transaction) => transaction.type === "pengeluaran")
    .reduce((sum, transaction) => sum + Math.abs(transaction.amount), 0);

  const kasBalance = totalPemasukan - totalPengeluaran;
  const currentMonth = getCurrentMonth();
  const currentWifiBill = wifiBills.find((bill) => bill.month === currentMonth)?.amount ?? 0;

  const memberStatus = activeMembers.map((member) => {
    const kasTransaction = transactions.find(
      (transaction) =>
        transaction.memberId === member.id &&
        transaction.type === "kas" &&
        transaction.month === currentMonth,
    );
    const wifiTransaction = transactions.find(
      (transaction) =>
        transaction.memberId === member.id &&
        transaction.type === "wifi" &&
        transaction.month === currentMonth,
    );

    return {
      ...member,
      hasPaidKas: Boolean(kasTransaction),
      hasPaidWifi: Boolean(wifiTransaction),
      kasAmount: kasTransaction?.amount ?? 0,
      wifiAmount: wifiTransaction?.amount ?? 0,
    };
  });

  const monthlyData: Record<string, SummaryData["chartData"][number]> = {};

  transactions.forEach((transaction) => {
    if (!monthlyData[transaction.month]) {
      monthlyData[transaction.month] = {
        name: transaction.month,
        kas: 0,
        wifi: 0,
        pengeluaran: 0,
      };
    }

    if (transaction.type === "kas") {
      monthlyData[transaction.month].kas += transaction.amount;
    }

    if (transaction.type === "wifi") {
      monthlyData[transaction.month].wifi += transaction.amount;
    }

    if (transaction.type === "pengeluaran") {
      monthlyData[transaction.month].pengeluaran += Math.abs(transaction.amount);
    }
  });

  return {
    kasBalance,
    totalPemasukan,
    totalPengeluaran,
    currentWifiBill,
    currentMonth,
    memberStatus,
    chartData: Object.values(monthlyData).sort((left, right) => left.name.localeCompare(right.name)),
    totalMembers: activeMembers.length,
    totalTransactions: transactions.length,
  };
}

function buildArrears() {
  const members = listMembers();
  const transactions = listTransactions();
  const wifiBills = listWifiBills();
  const wifiUsage = listWifiUsage();
  const wifiDebts = listWifiDebts();
  const currentMonth = getCurrentMonth();
  const arrears: Array<{
    member: Pick<Member, "id" | "name" | "status"> | { id: string; name: string; status: "none" };
    unpaidKas: Array<{ month: string; amount: number }>;
    unpaidWifi: Array<{ month: string; amount: number }>;
    totalKas: number;
    totalWifi: number;
  }> = [];

  members.forEach((member) => {
    const kasTransactions = transactions.filter(
      (transaction) => transaction.memberId === member.id && transaction.type === "kas",
    );
    let unpaidKas: Array<{ month: string; amount: number }> = [];

    if (kasTransactions.length > 0) {
      const firstMonth = kasTransactions.map((transaction) => transaction.month).sort()[0];
      const exitMonth = getExitMonth(member);
      const lastMonth = exitMonth && exitMonth < currentMonth ? exitMonth : currentMonth;
      const allMonths = enumerateMonths(firstMonth, lastMonth);
      const paidKasMonths = new Set(kasTransactions.map((transaction) => transaction.month));

      unpaidKas = allMonths
        .filter((month) => !paidKasMonths.has(month))
        .map((month) => ({
          month,
          amount: calculateKas(month, getMemberKasStatusForMonth(member, month)),
        }));
    }

    const unpaidWifi = wifiDebts
      .filter((entry) => entry.memberId === member.id && isMemberActiveForMonth(member, entry.month))
      .map((entry) => ({ month: entry.month, amount: entry.amount }));

    const paidWifiMonths = new Set([
      ...transactions
        .filter((transaction) => transaction.memberId === member.id && transaction.type === "wifi")
        .map((transaction) => transaction.month),
      ...unpaidWifi.map((entry) => entry.month),
    ]);

    wifiBills.forEach((bill) => {
      if (!isMemberActiveForMonth(member, bill.month)) {
        return;
      }

      if (paidWifiMonths.has(bill.month)) {
        return;
      }

      const memberUsage = wifiUsage.find(
        (entry) => entry.memberId === member.id && entry.month === bill.month,
      );

      if (!memberUsage) {
        return;
      }

      unpaidWifi.push({
        month: bill.month,
        amount: calculateMemberWifiAmount(member.id, bill.month, wifiBills, wifiUsage),
      });
    });

    if (unpaidKas.length > 0 || unpaidWifi.length > 0) {
      arrears.push({
        member,
        unpaidKas,
        unpaidWifi,
        totalKas: unpaidKas.reduce((sum, entry) => sum + entry.amount, 0),
        totalWifi: unpaidWifi.reduce((sum, entry) => sum + entry.amount, 0),
      });
    }
  });

  const nonMemberDebts = wifiDebts.filter(
    (entry) => entry.memberId === 0 || !members.find((member) => member.id === entry.memberId),
  );
  const groupedDebts = new Map<string, Array<{ month: string; amount: number }>>();

  nonMemberDebts.forEach((entry) => {
    const items = groupedDebts.get(entry.memberName) ?? [];
    items.push({ month: entry.month, amount: entry.amount });
    groupedDebts.set(entry.memberName, items);
  });

  groupedDebts.forEach((debts, name) => {
    arrears.push({
      member: { id: name, name, status: "none" },
      unpaidKas: [],
      unpaidWifi: debts,
      totalKas: 0,
      totalWifi: debts.reduce((sum, entry) => sum + entry.amount, 0),
    });
  });

  return arrears.sort(
    (left, right) => right.totalKas + right.totalWifi - (left.totalKas + left.totalWifi),
  );
}

function buildRekap(year: number, type: "kas" | "wifi") {
  const members = listMembers().filter(isMemberActive);
  const transactions = listTransactions();
  const monthKeys = MONTH_LABELS.map((_, index) => `${year}-${String(index + 1).padStart(2, "0")}`);

  return members.map((member) => {
    const months = monthKeys.map((month) => {
      const transaction = transactions.find(
        (entry) => entry.memberId === member.id && entry.type === type && entry.month === month,
      );
      return transaction?.amount ?? null;
    });

    return {
      member,
      months,
    };
  });
}

export function getDashboardPageData() {
  const summary = getSummaryData();
  const members = listMembers().filter(isMemberActive);
  const transactions = listTransactions();
  const wifiBills = listWifiBills();
  const wifiUsage = listWifiUsage();
  const wifiDebts = listWifiDebts();

  return {
    summary,
    members,
    transactions,
    wifiBills,
    wifiUsage,
    wifiDebts,
    arrears: buildArrears(),
    year: new Date().getFullYear(),
    kasRekap: buildRekap(new Date().getFullYear(), "kas"),
    wifiRekap: buildRekap(new Date().getFullYear(), "wifi"),
  };
}
