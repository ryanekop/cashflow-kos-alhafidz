import { NextResponse } from 'next/server';
import { readJSON, writeJSON } from '@/lib/db';

// GET: all wifi usage declarations
export async function GET() {
    const usage = readJSON('wifi-usage.json');
    return NextResponse.json(usage);
}

// POST: member declares wifi usage for a month
// body: { memberId, memberName, month, level: "full" | "half" }
export async function POST(request) {
    const body = await request.json();
    let usage = readJSON('wifi-usage.json');

    // Upsert: replace if same member+month exists
    const idx = usage.findIndex(u => u.memberId === body.memberId && u.month === body.month);
    const entry = {
        id: idx >= 0 ? usage[idx].id : Date.now(),
        memberId: body.memberId,
        memberName: body.memberName,
        month: body.month,
        level: body.level, // "full" or "half"
        date: new Date().toISOString(),
    };

    if (idx >= 0) {
        usage[idx] = entry;
    } else {
        usage.push(entry);
    }

    writeJSON('wifi-usage.json', usage);
    return NextResponse.json(entry, { status: 201 });
}

// DELETE
export async function DELETE(request) {
    const { searchParams } = new URL(request.url);
    const id = parseInt(searchParams.get('id'));
    let usage = readJSON('wifi-usage.json');
    usage = usage.filter(u => u.id !== id);
    writeJSON('wifi-usage.json', usage);
    return NextResponse.json({ success: true });
}
