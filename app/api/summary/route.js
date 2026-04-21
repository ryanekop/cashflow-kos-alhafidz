import { NextResponse } from 'next/server';
import { getSummaryData } from '@/lib/server/services/dashboard';

export async function GET() {
    return NextResponse.json(getSummaryData());
}
