import crypto from 'crypto';
import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * Tiny self-contained HS256 JWT implementation. Avoids adding a dependency
 * (jose / jsonwebtoken) for this single use case. Uses Node's built-in crypto
 * which is available in Vercel's Node runtime.
 */

export const SESSION_COOKIE = 'lp_session';
export const NONCE_COOKIE = 'lp_nonce';
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days
const NONCE_MAX_AGE_SECONDS = 60 * 10; // 10 minutes

export interface SessionPayload {
  /** Verified wallet address (checksum or lowercase, kept lowercase). */
  address: string;
  /** Whether this address is on the platform exemption list. */
  exempt: boolean;
  /** Whether this address has completed payment. */
  paid: boolean;
  /** Whether this address is KYC-verified. Re-evaluated on every read so admins
   *  can flip the env without forcing users to re-sign in. */
  kyc: boolean;
  /** Issued-at unix seconds. */
  iat: number;
  /** Expiry unix seconds. */
  exp: number;
}

export interface NoncePayload {
  nonce: string;
  iat: number;
  exp: number;
}

function getSecret(): Buffer {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      'JWT_SECRET env var must be set to a string of at least 16 characters.',
    );
  }
  return Buffer.from(secret, 'utf8');
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64url');
}

function sign<T extends Record<string, unknown>>(payload: T): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const headerB64 = b64url(JSON.stringify(header));
  const payloadB64 = b64url(JSON.stringify(payload));
  const data = `${headerB64}.${payloadB64}`;
  const sig = crypto.createHmac('sha256', getSecret()).update(data).digest();
  return `${data}.${b64url(sig)}`;
}

function verify<T>(token: string): T | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [headerB64, payloadB64, sigB64] = parts;
  const expected = crypto
    .createHmac('sha256', getSecret())
    .update(`${headerB64}.${payloadB64}`)
    .digest();
  let provided: Buffer;
  try {
    provided = Buffer.from(sigB64, 'base64url');
  } catch {
    return null;
  }
  if (provided.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(provided, expected)) return null;

  try {
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString());
    if (
      typeof payload !== 'object' ||
      payload === null ||
      typeof payload.exp !== 'number'
    ) {
      return null;
    }
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload as T;
  } catch {
    return null;
  }
}

/** Build a Set-Cookie header value with sane defaults for a session cookie. */
function buildCookie(
  name: string,
  value: string,
  maxAgeSeconds: number,
): string {
  const parts = [
    `${name}=${value}`,
    'HttpOnly',
    'Path=/',
    'SameSite=Lax',
    `Max-Age=${maxAgeSeconds}`,
  ];
  if (process.env.NODE_ENV === 'production') parts.push('Secure');
  return parts.join('; ');
}

function buildClearCookie(name: string): string {
  const parts = [`${name}=`, 'HttpOnly', 'Path=/', 'SameSite=Lax', 'Max-Age=0'];
  if (process.env.NODE_ENV === 'production') parts.push('Secure');
  return parts.join('; ');
}

/* ── Session helpers ────────────────────────────────────────── */

export function issueSession(
  res: NextApiResponse,
  payload: Omit<SessionPayload, 'iat' | 'exp'>,
): SessionPayload {
  const now = Math.floor(Date.now() / 1000);
  const full: SessionPayload = {
    ...payload,
    address: payload.address.toLowerCase(),
    iat: now,
    exp: now + SESSION_MAX_AGE_SECONDS,
  };
  const token = sign(full);
  res.setHeader(
    'Set-Cookie',
    buildCookie(SESSION_COOKIE, token, SESSION_MAX_AGE_SECONDS),
  );
  return full;
}

export function readSession(req: NextApiRequest): SessionPayload | null {
  const token = req.cookies[SESSION_COOKIE];
  if (!token) return null;
  return verify<SessionPayload>(token);
}

export function clearSession(res: NextApiResponse): void {
  res.setHeader('Set-Cookie', buildClearCookie(SESSION_COOKIE));
}

/* ── Nonce helpers ──────────────────────────────────────────── */

export function issueNonce(res: NextApiResponse): NoncePayload {
  const nonce = crypto.randomBytes(16).toString('hex');
  const now = Math.floor(Date.now() / 1000);
  const payload: NoncePayload = {
    nonce,
    iat: now,
    exp: now + NONCE_MAX_AGE_SECONDS,
  };
  const token = sign(payload);
  res.setHeader(
    'Set-Cookie',
    buildCookie(NONCE_COOKIE, token, NONCE_MAX_AGE_SECONDS),
  );
  return payload;
}

export function readNonce(req: NextApiRequest): NoncePayload | null {
  const token = req.cookies[NONCE_COOKIE];
  if (!token) return null;
  return verify<NoncePayload>(token);
}

export function clearNonce(res: NextApiResponse): void {
  res.setHeader('Set-Cookie', buildClearCookie(NONCE_COOKIE));
}

/* ── Compose multi-cookie responses ─────────────────────────── */

/** Append a Set-Cookie header alongside any already set on the response. */
export function appendSetCookie(res: NextApiResponse, cookie: string): void {
  const existing = res.getHeader('Set-Cookie');
  if (!existing) {
    res.setHeader('Set-Cookie', cookie);
  } else if (Array.isArray(existing)) {
    res.setHeader('Set-Cookie', [...existing, cookie]);
  } else {
    res.setHeader('Set-Cookie', [String(existing), cookie]);
  }
}

export function clearNonceAlongsideSession(res: NextApiResponse): void {
  appendSetCookie(res, buildClearCookie(NONCE_COOKIE));
}
