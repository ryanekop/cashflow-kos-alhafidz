import { NextResponse } from 'next/server';
import { readJSON, writeJSON } from '@/lib/db';

export async function GET() {
    const transactions = readJSON('transactions.json');
    return NextResponse.json(transactions);
}

export async function POST(request) {
    const body = await request.json();
    const transactions = readJSON('transactions.json');

    const newTransaction = {
        id: Date.now(),
        memberId: body.memberId,
        memberName: body.memberName,
        type: body.type, // 'kas' or 'wifi'
        month: body.month,
        amount: body.amount,
        status: body.status || '',
        date: new Date().toISOString(),
        notes: body.notes || '',
    };

    transactions.push(newTransaction);
    writeJSON('transactions.json', transactions);
    return NextResponse.json(newTransaction, { status: 201 });
}

export async function DELETE(request) {
    const { searchParams } = new URL(request.url);
    const id = parseInt(searchParams.get('id'));
    let transactions = readJSON('transactions.json');

    transactions = transactions.filter(t => t.id !== id);
    writeJSON('transactions.json', transactions);
    return NextResponse.json({ success: true });
}
