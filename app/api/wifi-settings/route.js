import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/admin-auth";
import { getWifiSettings, updateWifiSettings } from "@/lib/server/repositories/wifi-settings";

export async function GET() {
  return NextResponse.json(getWifiSettings());
}

export async function PUT(request) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) {
    return unauthorized;
  }

  const body = await request.json();
  if (!Array.isArray(body.openMonths)) {
    return NextResponse.json({ error: "Daftar bulan terbuka tidak valid." }, { status: 400 });
  }

  return NextResponse.json(updateWifiSettings({ openMonths: body.openMonths }));
}
