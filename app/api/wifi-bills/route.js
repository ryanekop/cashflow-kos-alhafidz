import { NextResponse } from 'next/server';
import { readJSON, writeJSON } from '@/lib/db';

export async function GET() {
    const bills = readJSON('wifi-bills.json');
    return NextResponse.json(bills);
}

export async function POST(request) {
    const body = await request.json();
    let bills = readJSON('wifi-bills.json');

    const existing = bills.findIndex(b => b.month === body.month);
    if (existing >= 0) {
        bills[existing].amount = body.amount;
    } else {
        bills.push({ month: body.month, amount: body.amount });
    }

    // Sort by month
    bills.sort((a, b) => a.month.localeCompare(b.month));
    writeJSON('wifi-bills.json', bills);
    return NextResponse.json({ success: true });
}

export async function PUT(request) {
    const bills = await request.json();
    writeJSON('wifi-bills.json', bills);
    return NextResponse.json({ success: true });
}
