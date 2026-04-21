import "server-only";

import { listMembers } from "@/lib/server/repositories/members";
import { listTransactions } from "@/lib/server/repositories/transactions";

export function getHistoryPageData() {
  const transactions = listTransactions();
  const members = listMembers();
  const kasTimeline = [...transactions]
    .filter((transaction) => transaction.type !== "wifi")
    .sort((left, right) => new Date(left.date).getTime() - new Date(right.date).getTime());

  let runningBalance = 0;

  const timeline = kasTimeline.map((transaction) => {
    const isExpense = transaction.type === "pengeluaran";
    const debit = isExpense ? 0 : transaction.amount;
    const kredit = isExpense ? Math.abs(transaction.amount) : 0;
    runningBalance += debit - kredit;

    return {
      ...transaction,
      debit,
      kredit,
      saldo: runningBalance,
    };
  });

  return {
    members,
    timeline,
    wifiTransactions: transactions.filter((transaction) => transaction.type === "wifi"),
  };
}
