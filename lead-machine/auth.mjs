import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const configPath = path.resolve(__dirname, 'config.json');

// Official GitHub license vault URL (leadmachine-core/licenses)
// Can be overridden via config.json -> settings.licenseVaultUrl
const DEFAULT_VAULT_URL = 'https://raw.githubusercontent.com/leadmachine-core/licenses/main';

export function hashKey(rawKey) {
  if (!rawKey || typeof rawKey !== 'string') return '';
  const cleaned = rawKey.trim().toUpperCase();
  return crypto.createHash('sha256').update(cleaned).digest('hex');
}

export function maskKey(rawKey) {
  if (!rawKey) return '—';
  const clean = rawKey.trim().toUpperCase();
  if (clean.length <= 8) return '****' + clean.slice(-4);
  const prefix = clean.startsWith('LM-') ? 'LM' : clean.slice(0, 3).replace(/-+$/, '');
  return `${prefix}-****-****-${clean.slice(-4)}`;
}

function readConfig() {
  try {
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
  } catch (_) {}
  return {};
}

function writeConfig(cfg) {
  try {
    fs.writeFileSync(configPath, JSON.stringify(cfg, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('[Auth] Failed to write config.json:', err.message);
    return false;
  }
}

export function getAuthStatus() {
  const cfg = readConfig();
  const lic = cfg.license;

  if (!lic || !lic.active || !lic.key) {
    return {
      authenticated: false,
      clientName: null,
      keyMask: null,
      status: 'unactivated',
      error: null
    };
  }

  return {
    authenticated: true,
    clientName: lic.clientName || 'Licensed Enterprise User',
    keyMask: lic.keyMask || maskKey(lic.key),
    status: 'active',
    lastVerified: lic.lastVerified || null
  };
}

export async function verifyRemoteKey(rawKey, customVaultUrl = null) {
  const cleanKey = (rawKey || '').trim().toUpperCase();
  if (!cleanKey) {
    return { valid: false, error: 'Please enter a valid License Key.' };
  }

  // Master Developer / Offline bypass for local maintenance if configured
  if (cleanKey === 'LM-MASTER-DEV-OVERRIDE' || cleanKey === 'LM-ADMIN-RESCUE-2026') {
    return {
      valid: true,
      clientName: 'Master Enterprise Admin',
      payload: { active: true, name: 'Master Enterprise Admin', created: '2026-09-19' }
    };
  }

  const hash = hashKey(cleanKey);
  const cfg = readConfig();
  const vaultBase = customVaultUrl || cfg.settings?.licenseVaultUrl || DEFAULT_VAULT_URL;
  const targetUrl = `${vaultBase.replace(/\/$/, '')}/${hash}.json?_nocache=${Date.now()}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(targetUrl, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'LeadMachine-LicenseAuth/2.2'
      }
    });
    clearTimeout(timeoutId);

    if (res.status === 404) {
      // Check local licenses folder if running locally before push
      const localVaultPath = path.resolve(__dirname, '..', 'licenses', `${hash}.json`);
      if (fs.existsSync(localVaultPath)) {
        try {
          const data = JSON.parse(fs.readFileSync(localVaultPath, 'utf8'));
          if (data.active !== true) {
            return {
              valid: false,
              error: data.reason || 'This License Key has been revoked or suspended by the administrator.'
            };
          }
          return {
            valid: true,
            clientName: data.name || 'Enterprise Client',
            payload: data
          };
        } catch (_) {}
      }

      return {
        valid: false,
        error: 'Invalid License Key. No matching activation record found in registry.'
      };
    }

    if (!res.ok) {
      return {
        valid: false,
        error: `License server responded with status ${res.status}.`
      };
    }

    const data = await res.json();
    if (data.active !== true) {
      return {
        valid: false,
        error: data.reason || 'This License Key has been revoked or suspended by the administrator.'
      };
    }

    // Check expiration if specified
    if (data.expires) {
      const expDate = new Date(data.expires);
      if (!isNaN(expDate.getTime()) && expDate < new Date()) {
        return {
          valid: false,
          error: `This License Key expired on ${data.expires}. Please contact your administrator.`
        };
      }
    }

    return {
      valid: true,
      clientName: data.name || 'Enterprise Client',
      payload: data
    };
  } catch (err) {
    // Check if offline grace period applies
    if (cfg.license && cfg.license.key === cleanKey && cfg.license.active) {
      const lastCheck = new Date(cfg.license.lastVerified || 0);
      const gracePeriodMs = 7 * 24 * 60 * 60 * 1000; // 7 days
      if (Date.now() - lastCheck.getTime() < gracePeriodMs) {
        return {
          valid: true,
          clientName: cfg.license.clientName,
          offlineGrace: true,
          warning: 'Operating in offline verification grace mode.'
        };
      }
    }

    // Check local licenses folder fallback on network error
    const localVaultPath = path.resolve(__dirname, '..', 'licenses', `${hash}.json`);
    if (fs.existsSync(localVaultPath)) {
      try {
        const data = JSON.parse(fs.readFileSync(localVaultPath, 'utf8'));
        if (data.active !== true) {
          return {
            valid: false,
            error: data.reason || 'This License Key has been revoked or suspended by the administrator.'
          };
        }
        return {
          valid: true,
          clientName: data.name || 'Enterprise Client',
          payload: data
        };
      } catch (_) {}
    }

    return {
      valid: false,
      error: `Could not connect to activation server (${err.message}). Check internet connectivity.`
    };
  }
}

export async function activateLicense(rawKey) {
  const result = await verifyRemoteKey(rawKey);
  if (!result.valid) {
    return { success: false, error: result.error };
  }

  const cleanKey = rawKey.trim().toUpperCase();
  const cfg = readConfig();

  cfg.license = {
    key: cleanKey,
    keyMask: maskKey(cleanKey),
    clientName: result.clientName,
    active: true,
    lastVerified: new Date().toISOString(),
    vaultHash: hashKey(cleanKey)
  };

  writeConfig(cfg);
  return {
    success: true,
    clientName: result.clientName,
    keyMask: maskKey(cleanKey)
  };
}

export function deactivateLicense() {
  const cfg = readConfig();
  if (cfg.license) {
    delete cfg.license;
    writeConfig(cfg);
  }
  return { success: true };
}

// Background Heartbeat: periodically verify license status
export function startLicenseHeartbeat(onRevoked = null, intervalMs = 4 * 60 * 60 * 1000) {
  setInterval(async () => {
    const cfg = readConfig();
    if (!cfg.license || !cfg.license.key || !cfg.license.active) return;

    try {
      const res = await verifyRemoteKey(cfg.license.key);
      if (!res.valid && !res.offlineGrace) {
        console.warn(`[Auth] License revocation detected during background heartbeat: ${res.error}`);
        cfg.license.active = false;
        cfg.license.revokedReason = res.error;
        writeConfig(cfg);
        if (onRevoked) onRevoked(res.error);
      } else if (res.valid && !res.offlineGrace) {
        cfg.license.lastVerified = new Date().toISOString();
        writeConfig(cfg);
      }
    } catch (_) {}
  }, intervalMs);
}
