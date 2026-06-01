import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

// ================================================================
// JWT Token Constants
// ================================================================

const SYNC_JWT_SECRET = process.env.SYNC_JWT_SECRET || 'upharma-sync-jwt-secret-2026';
const SYNC_API_KEY = process.env.SYNC_API_KEY || 'upharma-sync-2026';
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// ================================================================
// In-Memory Device Registry & Active Token Store
// ================================================================

/**
 * Registry of registered devices: deviceId -> device metadata.
 * In production, this would be a Prisma Device model.
 */
const deviceRegistry = new Map<
  string,
  {
    deviceId: string;
    deviceName: string;
    appVersion: string;
    registeredAt: string;
  }
>();

/**
 * Active tokens store: token -> decoded payload + metadata.
 * Used for fast server-side validation without re-decoding.
 */
export const activeTokens = new Map<
  string,
  {
    deviceId: string;
    deviceName: string;
    issuedAt: number;
    expiresAt: number;
    token: string;
  }
>();

// ================================================================
// Token Utilities (HMAC-SHA256 based, no external JWT library)
// ================================================================

/**
 * Base64url encode a string (RFC 4648 §5).
 */
function base64urlEncode(data: string): string {
  return Buffer.from(data, 'utf-8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Create an HMAC-SHA256 signature for the given payload.
 */
function createTokenSignature(payloadBase64: string): string {
  return crypto
    .createHmac('sha256', SYNC_JWT_SECRET)
    .update(payloadBase64)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Generate a new sync token for a device.
 * Token format: base64url(payload) + '.' + hmac-sha256(base64url(payload))
 */
export function generateSyncToken(deviceId: string, deviceName: string): string {
  const now = Date.now();
  const payload = {
    deviceId,
    deviceName,
    iat: now,
    exp: now + TOKEN_TTL_MS,
  };

  const payloadBase64 = base64urlEncode(JSON.stringify(payload));
  const signature = createTokenSignature(payloadBase64);
  const token = `${payloadBase64}.${signature}`;

  // Store in active tokens map
  activeTokens.set(token, {
    deviceId,
    deviceName,
    issuedAt: payload.iat,
    expiresAt: payload.exp,
    token,
  });

  return token;
}

/**
 * Verify and decode a sync token. Returns the payload if valid, null otherwise.
 * Also cleans up expired tokens from the store as a side effect.
 */
export function verifySyncToken(token: string): {
  deviceId: string;
  deviceName: string;
  issuedAt: number;
  expiresAt: number;
} | null {
  // Quick lookup in active tokens store
  const stored = activeTokens.get(token);

  if (!stored) {
    // Token not found — could be expired or never issued
    return null;
  }

  const now = Date.now();

  if (stored.expiresAt < now) {
    // Token expired — remove from store
    activeTokens.delete(token);
    return null;
  }

  // Verify signature integrity
  const [payloadBase64, signature] = token.split('.');
  if (!payloadBase64 || !signature) return null;

  const expectedSignature = createTokenSignature(payloadBase64);
  if (signature !== expectedSignature) {
    // Signature mismatch — possible tampering
    activeTokens.delete(token);
    return null;
  }

  return {
    deviceId: stored.deviceId,
    deviceName: stored.deviceName,
    issuedAt: stored.issuedAt,
    expiresAt: stored.expiresAt,
  };
}

// ================================================================
// POST /api/sync/register — Device Registration
// ================================================================

interface RegisterRequestBody {
  deviceId?: string;
  deviceName?: string;
  appVersion?: string;
}

export async function POST(request: NextRequest) {
  try {
    // Step 1: Validate the initial SYNC_API_KEY
    const apiKey = request.headers.get('x-sync-api-key');
    if (!apiKey || apiKey !== SYNC_API_KEY) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid or missing sync API key. Provide x-sync-api-key header.',
        },
        { status: 401 }
      );
    }

    // Step 2: Parse request body
    const body: RegisterRequestBody = await request.json();
    const { deviceId, deviceName, appVersion } = body;

    if (!deviceId || !deviceName || !appVersion) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: deviceId, deviceName, appVersion',
        },
        { status: 400 }
      );
    }

    // Step 3: Register device (or update existing record)
    const now = new Date().toISOString();
    deviceRegistry.set(deviceId, {
      deviceId,
      deviceName,
      appVersion,
      registeredAt: now,
    });

    console.log(
      `[SYNC-REGISTER] Device registered: ${deviceId} (${deviceName} v${appVersion})`
    );

    // Step 4: Issue a JWT token
    const token = generateSyncToken(deviceId, deviceName);
    const tokenPayload = verifySyncToken(token)!;
    const expiresAt = new Date(tokenPayload.expiresAt).toISOString();

    return NextResponse.json({
      success: true,
      token,
      deviceId,
      expiresAt,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[SYNC-REGISTER] Error:', msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
