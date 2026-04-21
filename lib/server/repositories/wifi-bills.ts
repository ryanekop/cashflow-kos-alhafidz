import "server-only";

import { readDataFile, writeDataFile } from "@/lib/server/json-store";
import type { WifiBill } from "@/lib/types/domain";

const FILENAME = "wifi-bills.json";

export function listWifiBills() {
  return readDataFile<WifiBill[]>(FILENAME, []);
}

export function upsertWifiBill(input: WifiBill) {
  const bills = listWifiBills();
  const index = bills.findIndex((bill) => bill.month === input.month);

  if (index >= 0) {
    bills[index].amount = input.amount;
  } else {
    bills.push(input);
  }

  bills.sort((left, right) => left.month.localeCompare(right.month));
  writeDataFile(FILENAME, bills);
  return { success: true };
}

export function replaceWifiBills(bills: WifiBill[]) {
  writeDataFile(FILENAME, bills);
  return { success: true };
}
