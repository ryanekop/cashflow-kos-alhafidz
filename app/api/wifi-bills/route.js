import { NextResponse } from 'next/server';
import { listWifiBills, replaceWifiBills, upsertWifiBill } from '@/lib/server/repositories/wifi-bills';
import { requireAdmin } from '@/lib/server/admin-auth';

export async function GET() {
    return NextResponse.json(listWifiBills());
}

export async function POST(request) {
    const unauthorized = requireAdmin(request);
    if (unauthorized) return unauthorized;
    const body = await request.json();
    return NextResponse.json(upsertWifiBill(body));
}

export async function PUT(request) {
    const unauthorized = requireAdmin(request);
    if (unauthorized) return unauthorized;
    const bills = await request.json();
    return NextResponse.json(replaceWifiBills(bills));
}
