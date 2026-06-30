import { NextResponse } from "next/server";
import {
  ADMIN_PASSWORD_MIN_LENGTH,
  ADMIN_SESSION_COOKIE,
  requireAdmin,
  updateAdminPassword,
} from "@/lib/server/admin-auth";

export async function POST(request) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) {
    return unauthorized;
  }

  const body = await request.json().catch(() => ({}));
  const newPassword = String(body.newPassword ?? "");
  const confirmPassword = String(body.confirmPassword ?? "");

  if (!newPassword || !confirmPassword) {
    return NextResponse.json({ error: "Password baru dan konfirmasi wajib diisi." }, { status: 400 });
  }

  if (newPassword.length < ADMIN_PASSWORD_MIN_LENGTH) {
    return NextResponse.json({ error: `Password baru minimal ${ADMIN_PASSWORD_MIN_LENGTH} karakter.` }, { status: 400 });
  }

  if (newPassword !== confirmPassword) {
    return NextResponse.json({ error: "Konfirmasi password baru tidak sama." }, { status: 400 });
  }

  updateAdminPassword(newPassword);

  const response = NextResponse.json({ authenticated: false });
  response.cookies.set(ADMIN_SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return response;
}
