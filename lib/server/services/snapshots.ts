import "server-only";

import { listMembers } from "@/lib/server/repositories/members";
import { listTransactions } from "@/lib/server/repositories/transactions";
import { listWifiBills } from "@/lib/server/repositories/wifi-bills";
import { listWifiUsage } from "@/lib/server/repositories/wifi-usage";
import { getWifiSettings } from "@/lib/server/repositories/wifi-settings";
import { isMemberActive } from "@/lib/shared/members";

export function getPaymentSnapshot() {
  return {
    members: listMembers().filter(isMemberActive),
    wifiBills: listWifiBills(),
    wifiUsage: listWifiUsage(),
    transactions: listTransactions(),
  };
}

export function getWifiSnapshot() {
  return {
    members: listMembers().filter(isMemberActive),
    wifiBills: listWifiBills(),
    wifiUsage: listWifiUsage(),
    wifiSettings: getWifiSettings(),
  };
}
