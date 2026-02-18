import { NextResponse } from 'next/server';
import { readJSON, writeJSON } from '@/lib/db';

export async function GET() {
    const members = readJSON('members.json');
    return NextResponse.json(members);
}

export async function POST(request) {
    const body = await request.json();
    const members = readJSON('members.json');

    const newMember = {
        id: Date.now(),
        name: body.name,
        status: body.status || 'full', // full, half, none
    };

    members.push(newMember);
    writeJSON('members.json', members);
    return NextResponse.json(newMember, { status: 201 });
}

export async function PUT(request) {
    const body = await request.json();
    let members = readJSON('members.json');

    members = members.map(m =>
        m.id === body.id ? { ...m, ...body } : m
    );

    writeJSON('members.json', members);
    return NextResponse.json({ success: true });
}

export async function DELETE(request) {
    const { searchParams } = new URL(request.url);
    const id = parseInt(searchParams.get('id'));
    let members = readJSON('members.json');

    members = members.filter(m => m.id !== id);
    writeJSON('members.json', members);
    return NextResponse.json({ success: true });
}
