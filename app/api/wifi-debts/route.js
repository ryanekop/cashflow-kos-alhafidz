import { NextResponse } from 'next/server';
import { createWifiDebt, deleteWifiDebtById, deleteWifiDebtByMemberMonth, listWifiDebts } from '@/lib/server/repositories/wifi-debts';
import { requireAdmin } from '@/lib/server/admin-auth';

export async function GET() {
    return NextResponse.json(listWifiDebts());
}

export async function POST(request) {
    const unauthorized = requireAdmin(request);
    if (unauthorized) return unauthorized;
    const body = await request.json();
    const debt = createWifiDebt(body);
    return NextResponse.json(debt, { status: 201 });
}

export async function DELETE(request) {
    const unauthorized = requireAdmin(request);
    if (unauthorized) return unauthorized;
    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('memberId');
    const month = searchParams.get('month');

    if (memberId && month) {
        return NextResponse.json(deleteWifiDebtByMemberMonth(parseInt(memberId), month));
    } else {
        const body = await request.json();
        return NextResponse.json(deleteWifiDebtById(body.id));
    }
}
