import "server-only";

import { readDataFile, writeDataFile } from "@/lib/server/json-store";
import type { WifiDebt } from "@/lib/types/domain";

const FILENAME = "wifi-debts.json";

export function listWifiDebts() {
  return readDataFile<WifiDebt[]>(FILENAME, []);
}

export function createWifiDebt(input: Omit<WifiDebt, "id">) {
  const debts = listWifiDebts();
  const debt: WifiDebt = {
    id: Date.now(),
    ...input,
  };

  debts.push(debt);
  writeDataFile(FILENAME, debts);
  return debt;
}

export function deleteWifiDebtById(id: number) {
  const debts = listWifiDebts().filter((entry) => entry.id !== id);
  writeDataFile(FILENAME, debts);
  return { success: true };
}

export function deleteWifiDebtByMemberMonth(memberId: number, month: string) {
  const debts = listWifiDebts().filter(
    (entry) => !(entry.memberId === memberId && entry.month === month),
  );
  writeDataFile(FILENAME, debts);
  return { success: true };
}
