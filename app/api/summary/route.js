import { NextResponse } from 'next/server';
import { readJSON } from '@/lib/db';

export async function GET() {
    const members = readJSON('members.json');
    const transactions = readJSON('transactions.json');
    const wifiBills = readJSON('wifi-bills.json');

    // Total pemasukan (kas payments)
    const totalPemasukan = transactions
        .filter(t => t.type === 'kas')
        .reduce((sum, t) => sum + t.amount, 0);

    // Total pengeluaran (expenses, stored as negative)
    const totalPengeluaran = transactions
        .filter(t => t.type === 'pengeluaran')
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    // kas saldo = pemasukan - pengeluaran
    const kasBalance = totalPemasukan - totalPengeluaran;

    // Current month
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // WiFi bill for current month
    const currentWifiBill = wifiBills.find(b => b.month === currentMonth)?.amount || 0;

    // Payment status per member for current month
    const memberStatus = members.map(m => {
        const kasTx = transactions.find(
            t => t.memberId === m.id && t.type === 'kas' && t.month === currentMonth
        );
        const wifiTx = transactions.find(
            t => t.memberId === m.id && t.type === 'wifi' && t.month === currentMonth
        );
        return { ...m, hasPaidKas: !!kasTx, hasPaidWifi: !!wifiTx, kasAmount: kasTx?.amount || 0, wifiAmount: wifiTx?.amount || 0 };
    });

    // Monthly aggregates for chart
    const monthlyData = {};
    transactions.forEach(t => {
        if (!monthlyData[t.month]) {
            monthlyData[t.month] = { name: t.month, kas: 0, wifi: 0, pengeluaran: 0 };
        }
        if (t.type === 'kas') monthlyData[t.month].kas += t.amount;
        if (t.type === 'wifi') monthlyData[t.month].wifi += t.amount;
        if (t.type === 'pengeluaran') monthlyData[t.month].pengeluaran += Math.abs(t.amount);
    });

    const chartData = Object.values(monthlyData).sort((a, b) =>
        a.name.localeCompare(b.name)
    );

    return NextResponse.json({
        kasBalance,
        totalPemasukan,
        totalPengeluaran,
        currentWifiBill,
        currentMonth,
        memberStatus,
        chartData,
        totalMembers: members.length,
        totalTransactions: transactions.length,
    });
}
