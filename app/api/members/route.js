import { NextResponse } from 'next/server';
import { createMember, deleteMember, listMembers, updateMember } from '@/lib/server/repositories/members';
import { requireAdmin } from '@/lib/server/admin-auth';

export async function GET() {
    return NextResponse.json(listMembers());
}

export async function POST(request) {
    const unauthorized = requireAdmin(request);
    if (unauthorized) return unauthorized;
    const body = await request.json();
    const member = createMember(body);
    return NextResponse.json(member, { status: 201 });
}

export async function PUT(request) {
    const unauthorized = requireAdmin(request);
    if (unauthorized) return unauthorized;
    const body = await request.json();
    return NextResponse.json(updateMember(body));
}

export async function DELETE(request) {
    const unauthorized = requireAdmin(request);
    if (unauthorized) return unauthorized;
    const { searchParams } = new URL(request.url);
    const id = parseInt(searchParams.get('id'));
    return NextResponse.json(deleteMember(id));
}
