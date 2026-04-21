import "server-only";

import { readDataFile, writeDataFile } from "@/lib/server/json-store";
import type { Transaction, TransactionType } from "@/lib/types/domain";

const FILENAME = "transactions.json";

export function listTransactions() {
  return readDataFile<Transaction[]>(FILENAME, []);
}

export function createTransaction(input: {
  memberId: number;
  memberName: string;
  type: TransactionType;
  month: string;
  amount: number;
  status?: string;
  notes?: string;
  date?: string;
}) {
  const transactions = listTransactions();
  const transaction: Transaction = {
    id: Date.now(),
    memberId: input.memberId,
    memberName: input.memberName,
    type: input.type,
    month: input.month,
    amount: input.amount,
    status: input.status ?? "",
    date: input.date ?? new Date().toISOString(),
    notes: input.notes ?? "",
  };

  transactions.push(transaction);
  writeDataFile(FILENAME, transactions);
  return transaction;
}

export function deleteTransaction(id: number) {
  const transactions = listTransactions().filter((transaction) => transaction.id !== id);
  writeDataFile(FILENAME, transactions);
  return { success: true };
}
