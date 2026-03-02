import { NextResponse } from 'next/server';
import { readJSON, writeJSON } from '@/lib/db';

export async function GET() {
    return NextResponse.json(readJSON('wifi-debts.json'));
}

export async function POST(request) {
    const body = await request.json();
    const debts = readJSON('wifi-debts.json');
    const newDebt = { id: Date.now(), ...body };
    debts.push(newDebt);
    writeJSON('wifi-debts.json', debts);
    return NextResponse.json(newDebt, { status: 201 });
}

export async function DELETE(request) {
    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('memberId');
    const month = searchParams.get('month');
    let debts = readJSON('wifi-debts.json');

    if (memberId && month) {
        // Delete by memberId + month (used by admin when checking WiFi payment)
        debts = debts.filter(d => !(d.memberId === parseInt(memberId) && d.month === month));
    } else {
        // Delete by id (legacy)
        const body = await request.json();
        debts = debts.filter(d => d.id !== body.id);
    }

    writeJSON('wifi-debts.json', debts);
    return NextResponse.json({ success: true });
}
