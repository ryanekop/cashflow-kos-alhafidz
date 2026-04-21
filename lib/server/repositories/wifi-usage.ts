import "server-only";

import { readDataFile, writeDataFile } from "@/lib/server/json-store";
import type { WifiUsage, WifiUsageLevel } from "@/lib/types/domain";

const FILENAME = "wifi-usage.json";

export function listWifiUsage() {
  return readDataFile<WifiUsage[]>(FILENAME, []);
}

export function upsertWifiUsage(input: {
  memberId: number;
  memberName: string;
  month: string;
  level: WifiUsageLevel;
}) {
  const usage = listWifiUsage();
  const index = usage.findIndex(
    (entry) => entry.memberId === input.memberId && entry.month === input.month,
  );

  const nextEntry: WifiUsage = {
    id: index >= 0 ? usage[index].id : Date.now(),
    memberId: input.memberId,
    memberName: input.memberName,
    month: input.month,
    level: input.level,
    date: new Date().toISOString(),
  };

  if (index >= 0) {
    usage[index] = nextEntry;
  } else {
    usage.push(nextEntry);
  }

  writeDataFile(FILENAME, usage);
  return nextEntry;
}

export function deleteWifiUsage(id: number) {
  const usage = listWifiUsage().filter((entry) => entry.id !== id);
  writeDataFile(FILENAME, usage);
  return { success: true };
}
