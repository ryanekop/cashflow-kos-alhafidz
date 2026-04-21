import type { MemberStatus, WifiBill, WifiUsage } from "@/lib/types/domain";

export function calculateKas(monthStr: string, status: MemberStatus) {
  const date = new Date(`${monthStr}-01`);
  const july2025 = new Date("2025-07-01");

  if (status === "none") {
    return 10000;
  }

  if (date >= july2025) {
    return status === "full" ? 30000 : 15000;
  }

  return status === "full" ? 25000 : 12500;
}

export function calculateWifiShares(totalBill: number, fullUsers: number, halfUsers: number) {
  if (!totalBill || (!fullUsers && !halfUsers)) {
    return { fullShare: 0, halfShare: 0 };
  }

  const totalUnits = fullUsers + halfUsers * 0.75;
  const unitCost = totalBill / totalUnits;

  return {
    fullShare: Math.round(unitCost),
    halfShare: Math.round(unitCost * 0.75),
  };
}

export function calculateMemberWifiAmount(
  memberId: number,
  month: string,
  wifiBills: WifiBill[],
  wifiUsage: WifiUsage[],
) {
  const bill = wifiBills.find((entry) => entry.month === month);
  const monthUsage = wifiUsage.filter((entry) => entry.month === month);
  const fullUsers = monthUsage.filter((entry) => entry.level === "full").length;
  const halfUsers = monthUsage.filter((entry) => entry.level === "half").length;
  const usage = monthUsage.find((entry) => entry.memberId === memberId);

  if (!bill || !usage) {
    return 0;
  }

  const shares = calculateWifiShares(bill.amount, fullUsers, halfUsers);
  return usage.level === "half" ? shares.halfShare : shares.fullShare;
}
