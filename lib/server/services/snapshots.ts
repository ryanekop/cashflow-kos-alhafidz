import "server-only";

import { listMembers } from "@/lib/server/repositories/members";
import { listTransactions } from "@/lib/server/repositories/transactions";
import { listWifiBills } from "@/lib/server/repositories/wifi-bills";
import { listWifiUsage } from "@/lib/server/repositories/wifi-usage";

export function getPaymentSnapshot() {
  return {
    members: listMembers(),
    wifiBills: listWifiBills(),
    wifiUsage: listWifiUsage(),
    transactions: listTransactions(),
  };
}

export function getWifiSnapshot() {
  return {
    members: listMembers(),
    wifiBills: listWifiBills(),
    wifiUsage: listWifiUsage(),
  };
}
