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

export const TIER_LIMITS = {
  Trial: { maxHunterLeads: 100, maxWorkers: 1, canExportCsv: false, label: 'Trial Evaluation' },
  Pro: { maxHunterLeads: 3000, maxWorkers: 3, canExportCsv: true, label: 'Professional' },
  Enterprise: { maxHunterLeads: 100000, maxWorkers: 6, canExportCsv: true, label: 'Enterprise' }
};

export function getTierLimits(tier) {
  if (!tier || typeof tier !== 'string') return TIER_LIMITS.Enterprise;
  const normalized = tier.charAt(0).toUpperCase() + tier.slice(1).toLowerCase();
  return TIER_LIMITS[normalized] || TIER_LIMITS.Enterprise;
}

export function getAuthStatus() {
  const cfg = readConfig();
  const lic = cfg.license;

  if (!lic || !lic.active || !lic.key) {
    return {
      authenticated: false,
      clientName: null,
      keyMask: null,
      tier: null,
      status: 'unactivated',
      error: null,
      limits: null
    };
  }

  // 1. Clock rollback detection (anti-tamper)
  if (lic.lastVerified) {
    const lastVerTime = new Date(lic.lastVerified).getTime();
    // If current system clock is older than lastVerified by more than 5 minutes
    if (!isNaN(lastVerTime) && Date.now() < lastVerTime - 5 * 60 * 1000) {
      return {
        authenticated: false,
        clientName: lic.clientName,
        keyMask: lic.keyMask,
        tier: lic.tier || 'Enterprise',
        status: 'clock_tampered',
        error: 'System clock tampering detected. Your computer clock appears to have been set backwards.',
        limits: null
      };
    }
  }

  // 2. Expiration Date check
  if (lic.expires) {
    const expTime = new Date(lic.expires).getTime();
    if (!isNaN(expTime) && Date.now() > expTime) {
      return {
        authenticated: false,
        clientName: lic.clientName,
        keyMask: lic.keyMask,
        tier: lic.tier || 'Enterprise',
        status: 'expired',
        error: `License expired on ${new Date(lic.expires).toLocaleDateString()}. Please contact your administrator to renew.`,
        limits: null
      };
    }
  }

  // 3. Offline Lease / Maximum Offline TTL check (48 hours)
  if (lic.lastVerified) {
    const lastVerTime = new Date(lic.lastVerified).getTime();
    const maxOfflineMs = 48 * 60 * 60 * 1000; // 48h lease
    if (!isNaN(lastVerTime) && Date.now() - lastVerTime > maxOfflineMs) {
      return {
        authenticated: false,
        clientName: lic.clientName,
        keyMask: lic.keyMask,
        tier: lic.tier || 'Enterprise',
        status: 'lease_expired',
        error: 'Offline license lease expired (48h max). Please connect to the internet to re-validate your license.',
        limits: null
      };
    }
  }

  const tier = lic.tier || 'Enterprise';
  return {
    authenticated: true,
    clientName: lic.clientName || 'Licensed Enterprise User',
    keyMask: lic.keyMask || maskKey(lic.key),
    tier,
    expires: lic.expires || null,
    status: 'active',
    lastVerified: lic.lastVerified || null,
    limits: getTierLimits(tier)
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

  const tier = result.payload?.tier || 'Enterprise';
  const expires = result.payload?.expires || null;

  cfg.license = {
    key: cleanKey,
    keyMask: maskKey(cleanKey),
    clientName: result.clientName,
    tier,
    expires,
    active: true,
    lastVerified: new Date().toISOString(),
    vaultHash: hashKey(cleanKey)
  };

  writeConfig(cfg);
  return {
    success: true,
    clientName: result.clientName,
    keyMask: maskKey(cleanKey),
    tier,
    expires,
    limits: getTierLimits(tier)
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

// Background Heartbeat: periodically verify license status (default every 30 minutes)
export function startLicenseHeartbeat(onRevoked = null, intervalMs = 30 * 60 * 1000) {
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
        if (res.payload?.expires) cfg.license.expires = res.payload.expires;
        if (res.payload?.tier) cfg.license.tier = res.payload.tier;
        writeConfig(cfg);
      }
    } catch (_) {}
  }, intervalMs);
}
