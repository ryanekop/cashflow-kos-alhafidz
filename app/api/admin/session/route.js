import { NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_MAX_AGE,
  createAdminSessionToken,
  isAdminConfigured,
  isAdminRequest,
  verifyAdminPassword,
} from "@/lib/server/admin-auth";

export async function GET(request) {
  return NextResponse.json({ authenticated: isAdminRequest(request) });
}

export async function POST(request) {
  if (!isAdminConfigured()) {
    return NextResponse.json(
      { error: "Login admin belum dikonfigurasi di server." },
      { status: 503 },
    );
  }

  const body = await request.json();
  if (!verifyAdminPassword(body.password ?? "")) {
    return NextResponse.json({ error: "Password admin salah." }, { status: 401 });
  }

  const response = NextResponse.json({ authenticated: true });
  response.cookies.set(ADMIN_SESSION_COOKIE, createAdminSessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ADMIN_SESSION_MAX_AGE,
  });
  return response;
}

export async function DELETE() {
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
