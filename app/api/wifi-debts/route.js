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
    const { id } = await request.json();
    let debts = readJSON('wifi-debts.json');
    debts = debts.filter(d => d.id !== id);
    writeJSON('wifi-debts.json', debts);
    return NextResponse.json({ success: true });
}
