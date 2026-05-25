import { NextResponse } from 'next/server';
import { deleteWifiUsage, listWifiUsage, upsertWifiUsage } from '@/lib/server/repositories/wifi-usage';
import { isAdminRequest } from '@/lib/server/admin-auth';
import { isWifiMonthOpen } from '@/lib/server/repositories/wifi-settings';

// GET: all wifi usage declarations
export async function GET() {
    return NextResponse.json(listWifiUsage());
}

// POST: member declares wifi usage for a month
// body: { memberId, memberName, month, level: "full" | "half" }
export async function POST(request) {
    const body = await request.json();
    if (!isAdminRequest(request) && !isWifiMonthOpen(body.month)) {
        return NextResponse.json({ error: 'Bulan WiFi ini sudah ditutup oleh admin.' }, { status: 403 });
    }
    const entry = upsertWifiUsage(body);
    return NextResponse.json(entry, { status: 201 });
}

// DELETE
export async function DELETE(request) {
    const { searchParams } = new URL(request.url);
    const id = parseInt(searchParams.get('id'));
    const entry = listWifiUsage().find((usage) => usage.id === id);
    if (!entry) {
        return NextResponse.json({ error: 'Data WiFi tidak ditemukan.' }, { status: 404 });
    }
    if (!isAdminRequest(request) && !isWifiMonthOpen(entry.month)) {
        return NextResponse.json({ error: 'Bulan WiFi ini sudah ditutup oleh admin.' }, { status: 403 });
    }
    return NextResponse.json(deleteWifiUsage(id));
}
