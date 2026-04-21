import { NextResponse } from 'next/server';
import { deleteWifiUsage, listWifiUsage, upsertWifiUsage } from '@/lib/server/repositories/wifi-usage';

// GET: all wifi usage declarations
export async function GET() {
    return NextResponse.json(listWifiUsage());
}

// POST: member declares wifi usage for a month
// body: { memberId, memberName, month, level: "full" | "half" }
export async function POST(request) {
    const body = await request.json();
    const entry = upsertWifiUsage(body);
    return NextResponse.json(entry, { status: 201 });
}

// DELETE
export async function DELETE(request) {
    const { searchParams } = new URL(request.url);
    const id = parseInt(searchParams.get('id'));
    return NextResponse.json(deleteWifiUsage(id));
}
