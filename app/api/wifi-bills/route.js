import { NextResponse } from 'next/server';
import { listWifiBills, replaceWifiBills, upsertWifiBill } from '@/lib/server/repositories/wifi-bills';

export async function GET() {
    return NextResponse.json(listWifiBills());
}

export async function POST(request) {
    const body = await request.json();
    return NextResponse.json(upsertWifiBill(body));
}

export async function PUT(request) {
    const bills = await request.json();
    return NextResponse.json(replaceWifiBills(bills));
}
