import "server-only";

import { readDataFile, writeDataFile } from "@/lib/server/json-store";
import type { WifiSettings } from "@/lib/types/domain";

const FILENAME = "wifi-settings.json";
const DEFAULT_SETTINGS: WifiSettings = { openMonths: [] };

export function getWifiSettings() {
  return readDataFile<WifiSettings>(FILENAME, DEFAULT_SETTINGS);
}

export function updateWifiSettings(input: WifiSettings) {
  const settings: WifiSettings = {
    openMonths: [...new Set(input.openMonths)]
      .filter((month) => typeof month === "string" && /^\d{4}-\d{2}$/.test(month))
      .sort()
      .reverse(),
  };

  writeDataFile(FILENAME, settings);
  return settings;
}

export function isWifiMonthOpen(month: string) {
  return getWifiSettings().openMonths.includes(month);
}
