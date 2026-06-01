// Device Auth Module for uPharma Desktop
// Handles device registration, JWT token management, and token rotation
// Uses Node.js built-in crypto for HMAC-SHA256 tokens (no external dependencies)

const crypto = require('crypto');

const SYNC_API_KEY = 'upharma-sync-2026';
const TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

class DeviceAuth {
  constructor(options = {}) {
    this.apiBase = options.apiBase || 'https://upharma.vercel.app';
    this.apiKey = options.syncApiKey || SYNC_API_KEY;
    this.deviceId = options.deviceId || 'desktop-unknown';
    this.deviceName = options.deviceName || 'uPharma Desktop';
    this.appVersion = options.appVersion || '1.0.0';
    this.token = null;
    this.tokenExpiresAt = null;
    this.tokenSecret = options.tokenSecret || 'upharma-sync-jwt-secret-2026';
  }

  // Register device with server and get JWT token
  async register() {
    const url = `${this.apiBase}/api/sync/register`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-sync-api-key': this.apiKey,
        },
        body: JSON.stringify({
          deviceId: this.deviceId,
          deviceName: this.deviceName,
          appVersion: this.appVersion,
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Registration failed: ${response.status} - ${text}`);
      }

      const result = await response.json();
      if (result.success && result.token) {
        this.token = result.token;
        this.tokenExpiresAt = result.expiresAt;
        return result;
      }
      throw new Error(result.error || 'Registration returned no token');
    } catch (err) {
      console.error('[DeviceAuth] Registration failed:', err.message);
      throw err;
    }
  }

  // Check if current token is valid and not expired
  isTokenValid() {
    if (!this.token) return false;
    if (!this.tokenExpiresAt) return false;
    return new Date(this.tokenExpiresAt) > new Date();
  }

  // Get the auth headers for API requests
  getAuthHeaders() {
    const headers = {};
    if (this.isTokenValid()) {
      headers['Authorization'] = `Bearer ${this.token}`;
    } else {
      // Fallback to API key if no valid token
      headers['x-sync-api-key'] = this.apiKey;
    }
    return headers;
  }

  // Rotate token from server response header
  rotateToken(newToken, newExpiresAt) {
    if (newToken) {
      this.token = newToken;
      this.tokenExpiresAt = newExpiresAt;
      console.log('[DeviceAuth] Token rotated successfully');
    }
  }

  // Auto-register if no valid token
  async ensureRegistered() {
    if (!this.isTokenValid()) {
      await this.register();
    }
    return this.isTokenValid();
  }

  // Create a simple HMAC-SHA256 token locally (for verification/testing)
  static createToken(payload, secret) {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = crypto
      .createHmac('sha256', secret)
      .update(`${header}.${body}`)
      .digest('base64url');
    return `${header}.${body}.${signature}`;
  }

  // Verify a token
  static verifyToken(token, secret) {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      
      const [header, body, signature] = parts;
      const expectedSig = crypto
        .createHmac('sha256', secret)
        .update(`${header}.${body}`)
        .digest('base64url');
      
      if (signature !== expectedSig) return null;
      
      const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
      if (payload.exp && new Date(payload.exp) < new Date()) return null;
      
      return payload;
    } catch {
      return null;
    }
  }
}

module.exports = { DeviceAuth };
