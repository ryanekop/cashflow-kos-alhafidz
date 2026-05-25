import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

export const ADMIN_SESSION_COOKIE = "alhafidz_admin_session";
export const ADMIN_SESSION_MAX_AGE = 60 * 60 * 12;

function getSecret() {
  return process.env.ADMIN_SESSION_SECRET ?? "";
}

function sign(value: string) {
  return createHmac("sha256", getSecret()).update(value).digest("hex");
}

function securelyEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export function isAdminConfigured() {
  return Boolean(process.env.ADMIN_PASSWORD && getSecret());
}

export function verifyAdminPassword(password: string) {
  const expected = process.env.ADMIN_PASSWORD;
  return Boolean(expected && securelyEqual(password, expected));
}

export function createAdminSessionToken() {
  const expiresAt = Date.now() + ADMIN_SESSION_MAX_AGE * 1000;
  const payload = String(expiresAt);
  return `${payload}.${sign(payload)}`;
}

export function isValidAdminSession(token?: string) {
  if (!token || !getSecret()) {
    return false;
  }

  const [expiresAt, signature] = token.split(".");
  if (!expiresAt || !signature || Number(expiresAt) <= Date.now()) {
    return false;
  }

  return securelyEqual(signature, sign(expiresAt));
}

export function isAdminRequest(request: Request & { cookies: { get: (name: string) => { value: string } | undefined } }) {
  return isValidAdminSession(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
}

export function requireAdmin(request: Request & { cookies: { get: (name: string) => { value: string } | undefined } }) {
  if (isAdminRequest(request)) {
    return null;
  }

  return NextResponse.json({ error: "Sesi admin tidak valid. Silakan login kembali." }, { status: 401 });
}
