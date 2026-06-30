import "server-only";

import { createHmac, pbkdf2Sync, randomBytes, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { readDataFile, writeDataFile } from "@/lib/server/json-store";

export const ADMIN_SESSION_COOKIE = "alhafidz_admin_session";
export const ADMIN_SESSION_MAX_AGE = 60 * 60 * 12;
export const ADMIN_PASSWORD_MIN_LENGTH = 6;

const ADMIN_SETTINGS_FILE = "admin-settings.json";
const PASSWORD_DIGEST = "sha256";
const PASSWORD_ITERATIONS = 310000;
const PASSWORD_KEY_LENGTH = 32;

type AdminSettings = {
  passwordHash?: string;
  sessionVersion?: number;
  updatedAt?: string;
};

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

function securelyEqualBuffers(left: Buffer, right: Buffer) {
  return left.length === right.length && timingSafeEqual(left, right);
}

function getAdminSettings() {
  return readDataFile<AdminSettings>(ADMIN_SETTINGS_FILE, { sessionVersion: 1 });
}

function getAdminSessionVersion(settings = getAdminSettings()) {
  const version = Number(settings.sessionVersion);
  return Number.isInteger(version) && version > 0 ? version : 1;
}

function hasStoredPassword(settings = getAdminSettings()) {
  return Boolean(settings.passwordHash?.startsWith("pbkdf2:"));
}

function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = pbkdf2Sync(password, salt, PASSWORD_ITERATIONS, PASSWORD_KEY_LENGTH, PASSWORD_DIGEST).toString("hex");
  return `pbkdf2:${PASSWORD_DIGEST}:${PASSWORD_ITERATIONS}:${salt}:${hash}`;
}

function verifyPasswordHash(password: string, passwordHash: string) {
  const [scheme, digest, iterationsText, salt, expectedHash] = passwordHash.split(":");
  const iterations = Number(iterationsText);

  if (
    scheme !== "pbkdf2" ||
    digest !== PASSWORD_DIGEST ||
    !Number.isInteger(iterations) ||
    iterations <= 0 ||
    !salt ||
    !expectedHash ||
    expectedHash.length % 2 !== 0 ||
    !/^[\da-f]+$/i.test(expectedHash)
  ) {
    return false;
  }

  const expectedBuffer = Buffer.from(expectedHash, "hex");
  const actualBuffer = pbkdf2Sync(password, salt, iterations, expectedBuffer.length, digest);
  return securelyEqualBuffers(actualBuffer, expectedBuffer);
}

export function isAdminConfigured() {
  const settings = getAdminSettings();
  return Boolean(getSecret() && (hasStoredPassword(settings) || process.env.ADMIN_PASSWORD));
}

export function verifyAdminPassword(password: string) {
  const settings = getAdminSettings();

  if (settings.passwordHash && hasStoredPassword(settings)) {
    return verifyPasswordHash(password, settings.passwordHash);
  }

  const expected = process.env.ADMIN_PASSWORD;
  return Boolean(expected && securelyEqual(password, expected));
}

export function createAdminSessionToken() {
  const expiresAt = Date.now() + ADMIN_SESSION_MAX_AGE * 1000;
  const payload = `${expiresAt}:${getAdminSessionVersion()}`;
  return `${payload}.${sign(payload)}`;
}

export function isValidAdminSession(token?: string) {
  if (!token || !getSecret()) {
    return false;
  }

  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra) {
    return false;
  }

  const [expiresAtText, sessionVersionText = "1"] = payload.split(":");
  const expiresAt = Number(expiresAtText);
  const sessionVersion = Number(sessionVersionText);

  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now() || !Number.isInteger(sessionVersion)) {
    return false;
  }

  return securelyEqual(signature, sign(payload)) && sessionVersion === getAdminSessionVersion();
}

export function updateAdminPassword(password: string) {
  const settings = getAdminSettings();
  const nextSettings = {
    ...settings,
    passwordHash: hashPassword(password),
    sessionVersion: getAdminSessionVersion(settings) + 1,
    updatedAt: new Date().toISOString(),
  };

  writeDataFile(ADMIN_SETTINGS_FILE, nextSettings);
  return nextSettings;
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
