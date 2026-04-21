import { NextResponse } from 'next/server';
import { createTransaction, deleteTransaction, listTransactions } from '@/lib/server/repositories/transactions';

export async function GET() {
    return NextResponse.json(listTransactions());
}

export async function POST(request) {
    const body = await request.json();
    const transaction = createTransaction(body);
    return NextResponse.json(transaction, { status: 201 });
}

export async function DELETE(request) {
    const { searchParams } = new URL(request.url);
    const id = parseInt(searchParams.get('id'));
    return NextResponse.json(deleteTransaction(id));
}
