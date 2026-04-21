export type MemberStatus = "full" | "half" | "none";
export type TransactionType = "kas" | "wifi" | "pengeluaran";
export type WifiUsageLevel = "full" | "half";

export interface Member {
  id: number;
  name: string;
  status: MemberStatus;
}

export interface Transaction {
  id: number;
  memberId: number;
  memberName: string;
  type: TransactionType;
  month: string;
  amount: number;
  status?: string;
  date: string;
  notes?: string;
}

export interface WifiBill {
  month: string;
  amount: number;
}

export interface WifiUsage {
  id: number;
  memberId: number;
  memberName: string;
  month: string;
  level: WifiUsageLevel;
  date: string;
}

export interface WifiDebt {
  id: number;
  memberId: number;
  memberName: string;
  month: string;
  amount: number;
}

export interface SummaryData {
  kasBalance: number;
  totalPemasukan: number;
  totalPengeluaran: number;
  currentWifiBill: number;
  currentMonth: string;
  memberStatus: Array<
    Member & {
      hasPaidKas: boolean;
      hasPaidWifi: boolean;
      kasAmount: number;
      wifiAmount: number;
    }
  >;
  chartData: Array<{
    name: string;
    kas: number;
    wifi: number;
    pengeluaran: number;
  }>;
  totalMembers: number;
  totalTransactions: number;
}

export interface PaymentMethod {
  id: string;
  label: string;
  color: string;
  desc: string;
  logo: string;
  account: string;
  accountName: string;
}
