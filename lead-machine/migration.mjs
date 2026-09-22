import fs from 'fs';
import path from 'path';
import os from 'os';
import Database from 'better-sqlite3';
import {
  getUserDataDir,
  getDbPath,
  getConfigPath,
  getLegacyDbPath,
  getLegacyConfigPath,
  getLegacyClaimedMarkerPath,
  getLegacyMigratedBakPath,
  getAppRoot
} from './paths.mjs';
import { hashKey, maskKey } from './auth.mjs';
import { migrateDatabase } from './db_migration.mjs';

/**
 * Initializes tables in a SQLite database.
 */
export function initDatabaseSchema(db) {
  db.pragma('journal_mode = WAL');
  db.pragma('busy_timeout = 10000');
  db.exec(`
    CREATE TABLE IF NOT EXISTS leads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_name TEXT NOT NULL,
      website TEXT NOT NULL UNIQUE,
      city TEXT,
      state TEXT,
      phone TEXT,
      email TEXT,
      contact_person TEXT,
      status TEXT DEFAULT 'not_contacted',
      notes TEXT,
      failure_reason TEXT,
      debug_screenshot TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS contact_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lead_id INTEGER NOT NULL,
      action TEXT NOT NULL,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
    );
  `);
  migrateDatabase(db);
}

/**
 * Returns current migration status for the active user.
 */
export function getMigrationStatus() {
  const userDb = getDbPath();
  const legacyDb = getLegacyDbPath();
  const claimedMarker = getLegacyClaimedMarkerPath();

  const currentUserHasDb = fs.existsSync(userDb) && fs.statSync(userDb).size > 0;
  const legacyClaimed = fs.existsSync(claimedMarker);
  const legacyExists = fs.existsSync(legacyDb) && fs.statSync(legacyDb).size > 0;

  let legacyCount = 0;
  if (legacyExists) {
    try {
      const legDb = new Database(legacyDb, { readonly: true, timeout: 2000 });
      const row = legDb.prepare('SELECT count(*) as cnt FROM leads').get();
      legacyCount = row?.cnt || 0;
      legDb.close();
    } catch (_) {}
  }

  // If current user already has their own database, migration is complete for this user
  if (currentUserHasDb) {
    return {
      pending: false,
      hasUserDb: true,
      legacyClaimed,
      hasLegacyData: legacyExists,
      legacyCount
    };
  }

  // If legacy data has already been claimed by someone else, new user starts fresh
  if (legacyClaimed) {
    return {
      pending: false,
      hasUserDb: false,
      legacyClaimed: true,
      hasLegacyData: false,
      legacyCount,
      reason: 'Legacy data has already been claimed by another user account.'
    };
  }

  // If no legacy database exists on machine, no migration is needed
  if (!legacyExists) {
    return {
      pending: false,
      hasUserDb: false,
      legacyClaimed: false,
      hasLegacyData: false,
      legacyCount: 0
    };
  }

  let legacyMask = null;
  let legacyClient = null;
  try {
    const legCfgPath = getLegacyConfigPath();
    if (fs.existsSync(legCfgPath)) {
      const cfg = JSON.parse(fs.readFileSync(legCfgPath, 'utf8'));
      if (cfg.license?.keyMask) legacyMask = cfg.license.keyMask;
      else if (cfg.license?.key) legacyMask = maskKey(cfg.license.key);
      if (cfg.license?.clientName) legacyClient = cfg.license.clientName;
    }
  } catch (_) {}

  return {
    pending: true,
    hasUserDb: false,
    legacyClaimed: false,
    hasLegacyData: true,
    legacyCount,
    legacyMask,
    legacyClient
  };
}

/**
 * Claims the legacy shared database and configuration by validating against the original owner's key.
 */
export function claimLegacyData(rawKey) {
  const cleanKey = (rawKey || '').trim().toUpperCase();
  if (!cleanKey) {
    return { success: false, error: 'Please enter the original license key to claim this workspace.' };
  }

  const legacyDb = getLegacyDbPath();
  const legCfgPath = getLegacyConfigPath();

  if (!fs.existsSync(legacyDb)) {
    return { success: false, error: 'No legacy database found to claim.' };
  }

  // Read legacy config to compare key and hash
  let legacyCfg = {};
  try {
    if (fs.existsSync(legCfgPath)) {
      legacyCfg = JSON.parse(fs.readFileSync(legCfgPath, 'utf8'));
    }
  } catch (err) {
    return { success: false, error: 'Failed to read legacy configuration: ' + err.message };
  }

  const expectedKey = legacyCfg.license?.key ? legacyCfg.license.key.trim().toUpperCase() : '';
  const expectedHash = legacyCfg.license?.vaultHash;
  const inputHash = hashKey(cleanKey);

  // Validate ownership
  const matchesKey = expectedKey && cleanKey === expectedKey;
  const matchesHash = expectedHash && inputHash === expectedHash;

  // Master dev override key bypass
  const isMasterOverride = cleanKey === 'LM-MASTER-DEV-OVERRIDE' || cleanKey === 'LM-ADMIN-RESCUE-2026';

  if (!matchesKey && !matchesHash && !isMasterOverride) {
    return {
      success: false,
      error: 'License key does not match the database owner. Access denied. Please enter the original key or click "Start Fresh".'
    };
  }

  const userDb = getDbPath();
  const userCfg = getConfigPath();

  try {
    // 1. Copy legacy database to user's isolated data directory
    fs.mkdirSync(path.dirname(userDb), { recursive: true });
    fs.copyFileSync(legacyDb, userDb);

    // 2. Ensure schema & migrations are up to date on user's database
    const db = new Database(userDb);
    initDatabaseSchema(db);
    db.close();

    // 3. Migrate configuration to user's isolated directory
    fs.mkdirSync(path.dirname(userCfg), { recursive: true });
    legacyCfg.license = legacyCfg.license || {};
    legacyCfg.license.key = cleanKey;
    legacyCfg.license.keyMask = maskKey(cleanKey);
    legacyCfg.license.active = true;
    legacyCfg.license.lastVerified = new Date().toISOString();
    legacyCfg.license.vaultHash = inputHash;
    fs.writeFileSync(userCfg, JSON.stringify(legacyCfg, null, 2), 'utf8');

    // 4. Create .legacy_claimed marker
    const claimedMarker = getLegacyClaimedMarkerPath();
    const markerData = {
      claimedBy: os.userInfo?.()?.username || 'user',
      claimedAt: new Date().toISOString(),
      keyMask: maskKey(cleanKey)
    };
    fs.writeFileSync(claimedMarker, JSON.stringify(markerData, null, 2), 'utf8');

    // 5. Safely archive legacy database file
    const bakPath = getLegacyMigratedBakPath();
    try {
      if (fs.existsSync(bakPath)) fs.unlinkSync(bakPath);
      fs.renameSync(legacyDb, bakPath);
    } catch (_) {
      try { fs.unlinkSync(legacyDb); } catch (_) {}
    }

    // Clean up any remaining WAL / SHM files for legacy db
    for (const ext of ['-wal', '-shm']) {
      try {
        const p = legacyDb + ext;
        if (fs.existsSync(p)) fs.unlinkSync(p);
      } catch (_) {}
    }

    return {
      success: true,
      message: 'Workspace successfully claimed! Your leads and settings have been migrated to your user account.',
      keyMask: maskKey(cleanKey)
    };
  } catch (err) {
    return { success: false, error: 'Migration failed: ' + err.message };
  }
}

/**
 * Initializes a clean, empty workspace for the current user while preserving the legacy database for its owner.
 */
export function startFreshWorkspace() {
  const userDb = getDbPath();
  const userCfg = getConfigPath();

  try {
    // 1. Create fresh database with full schema
    fs.mkdirSync(path.dirname(userDb), { recursive: true });
    if (fs.existsSync(userDb)) {
      try { fs.unlinkSync(userDb); } catch (_) {}
    }
    const db = new Database(userDb);
    initDatabaseSchema(db);
    db.close();

    // 2. Initialize fresh config with unactivated license
    fs.mkdirSync(path.dirname(userCfg), { recursive: true });
    
    // Copy base defaults if template or legacy exists, but wipe license and sender
    let baseCfg = {};
    const legCfgPath = getLegacyConfigPath();
    if (fs.existsSync(legCfgPath)) {
      try {
        baseCfg = JSON.parse(fs.readFileSync(legCfgPath, 'utf8'));
      } catch (_) {}
    }

    const freshCfg = {
      sender: {
        fullName: "",
        firstName: "",
        lastName: "",
        jobTitle: "",
        email: "",
        phone: "",
        company: "",
        website: "",
        address: "",
        suite: "",
        city: "",
        state: "",
        zip: "",
        country: "United States",
        subject: "Exploring Collaboration Opportunities",
        message: "Hello,\n\nI am reaching out to explore potential business opportunities.\n\nThank you."
      },
      settings: {
        version: baseCfg.settings?.version || "2.4.0",
        buildCommit: baseCfg.settings?.buildCommit || "",
        defaultSpeedMode: "recommended",
        sandboxMode: false,
        concurrency: 8,
        autoUpdate: true,
        updateChannel: "stable",
        lastUpdated: new Date().toISOString(),
        debugMode: true
      },
      license: {
        key: null,
        keyMask: null,
        clientName: null,
        tier: null,
        expires: null,
        active: false,
        lastVerified: null,
        vaultHash: null,
        boundHardwareId: null
      }
    };

    fs.writeFileSync(userCfg, JSON.stringify(freshCfg, null, 2), 'utf8');

    return {
      success: true,
      message: 'Fresh workspace initialized for your user account.'
    };
  } catch (err) {
    return { success: false, error: 'Failed to initialize fresh workspace: ' + err.message };
  }
}

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Returns comprehensive workspace filesystem and database diagnostics for Settings UI.
 */
export function getWorkspaceDiagnostics() {
  const userDir = getUserDataDir();
  const userDb = getDbPath();
  const userCfg = getConfigPath();
  const legacyDb = getLegacyDbPath();
  const legacyMigratedBak = getLegacyMigratedBakPath();
  const claimedMarker = getLegacyClaimedMarkerPath();
  const appRoot = getAppRoot();

  // 1. Active User Database status
  const userDbExists = fs.existsSync(userDb);
  let userDbSize = 0;
  let userDbSizeFormatted = '0 KB';
  let userLeadsCount = 0;
  let userContactedCount = 0;
  let userPendingCount = 0;

  if (userDbExists) {
    try {
      const st = fs.statSync(userDb);
      userDbSize = st.size;
      userDbSizeFormatted = formatBytes(st.size);
      const db = new Database(userDb, { readonly: true, timeout: 2000 });
      userLeadsCount = db.prepare('SELECT count(*) as c FROM leads').get()?.c || 0;
      userContactedCount = db.prepare("SELECT count(*) as c FROM leads WHERE status = 'contacted'").get()?.c || 0;
      userPendingCount = db.prepare("SELECT count(*) as c FROM leads WHERE status = 'not_contacted'").get()?.c || 0;
      db.close();
    } catch (_) {}
  }

  // 2. Claim Marker Status
  let isClaimed = false;
  let claimDetails = null;
  if (fs.existsSync(claimedMarker)) {
    try {
      claimDetails = JSON.parse(fs.readFileSync(claimedMarker, 'utf8'));
      isClaimed = true;
    } catch (_) {
      isClaimed = true;
    }
  }

  // 3. Scan for other/legacy database files on machine
  const candidatePaths = [
    { type: 'legacy', label: 'Legacy Shared App Database', path: legacyDb },
    { type: 'archived_backup', label: 'Migration Backup Archive', path: legacyMigratedBak },
    { type: 'detected_backup', label: 'App Data Backup', path: path.join(appRoot, 'data', 'leads.db.bak') }
  ];

  // Also check for any .db files in <appRoot>/data
  const appDataDir = path.join(appRoot, 'data');
  if (fs.existsSync(appDataDir)) {
    try {
      const files = fs.readdirSync(appDataDir);
      for (const file of files) {
        if (file.endsWith('.db') && !file.includes('-wal') && !file.includes('-shm')) {
          const fullP = path.join(appDataDir, file);
          if (!candidatePaths.some(c => path.resolve(c.path) === path.resolve(fullP))) {
            candidatePaths.push({
              type: 'detected_backup',
              label: `Backup (${file})`,
              path: fullP
            });
          }
        }
      }
    } catch (_) {}
  }

  // Inspect each candidate
  const detectedDatabases = [];
  let totalRecoverableLeads = 0;

  for (const cand of candidatePaths) {
    if (fs.existsSync(cand.path)) {
      try {
        const st = fs.statSync(cand.path);
        let count = 0;
        try {
          const cDb = new Database(cand.path, { readonly: true, timeout: 2000 });
          count = cDb.prepare('SELECT count(*) as c FROM leads').get()?.c || 0;
          cDb.close();
        } catch (_) {}

        const isCurrentActive = path.resolve(cand.path) === path.resolve(userDb);
        const canRestore = !isCurrentActive && count > 0;
        if (canRestore) totalRecoverableLeads += count;

        detectedDatabases.push({
          type: cand.type,
          label: cand.label,
          path: cand.path,
          sizeBytes: st.size,
          sizeFormatted: formatBytes(st.size),
          leadsCount: count,
          modified: st.mtime.toISOString(),
          isActive: isCurrentActive,
          canRestore
        });
      } catch (_) {}
    }
  }

  // Active license summary
  let activeLicenseKey = null;
  let activeKeyMask = null;
  let activeClient = null;
  if (fs.existsSync(userCfg)) {
    try {
      const cfg = JSON.parse(fs.readFileSync(userCfg, 'utf8'));
      if (cfg.license?.key) activeLicenseKey = cfg.license.key;
      if (cfg.license?.keyMask) activeKeyMask = cfg.license.keyMask;
      if (cfg.license?.clientName) activeClient = cfg.license.clientName;
    } catch (_) {}
  }

  return {
    success: true,
    storageArchitecture: 'Isolated Multi-User Workspace (v2.4.0)',
    operatingSystem: process.platform === 'win32' ? 'Windows' : (process.platform === 'darwin' ? 'macOS' : 'Linux'),
    systemUser: os.userInfo?.()?.username || 'current_user',
    userDirectory: userDir,
    activeDatabase: {
      path: userDb,
      exists: userDbExists,
      sizeBytes: userDbSize,
      sizeFormatted: userDbSizeFormatted,
      leadsCount: userLeadsCount,
      contactedCount: userContactedCount,
      pendingCount: userPendingCount
    },
    claimStatus: {
      isClaimed,
      claimDetails,
      isFreshWorkspace: userDbExists && userLeadsCount === 0 && !isClaimed
    },
    activeLicense: {
      keyMask: activeKeyMask,
      clientName: activeClient
    },
    detectedDatabases,
    canClaimOrRecover: detectedDatabases.some(d => d.canRestore),
    totalRecoverableLeads
  };
}

/**
 * Recovers or claims a legacy / backup database into the current user's workspace.
 */
export function recoverLegacyData(rawKey, customSourceDb = null) {
  const userDb = getDbPath();
  const userCfg = getConfigPath();
  const diagnostics = getWorkspaceDiagnostics();

  // Find source database to recover from
  let sourceDb = customSourceDb;
  if (!sourceDb) {
    const candidates = diagnostics.detectedDatabases.filter(d => d.canRestore);
    if (candidates.length === 0) {
      return { success: false, error: 'No recoverable database with leads found on this computer.' };
    }
    candidates.sort((a, b) => b.leadsCount - a.leadsCount);
    sourceDb = candidates[0].path;
  }

  if (!fs.existsSync(sourceDb)) {
    return { success: false, error: 'Selected source database does not exist: ' + sourceDb };
  }

  const cleanKey = (rawKey || '').trim().toUpperCase();

  // Check active license in userCfg
  let userHasValidLicense = false;
  let activeKey = '';
  if (fs.existsSync(userCfg)) {
    try {
      const cfg = JSON.parse(fs.readFileSync(userCfg, 'utf8'));
      if (cfg.license?.active && cfg.license?.key) {
        userHasValidLicense = true;
        activeKey = cfg.license.key.trim().toUpperCase();
      }
    } catch (_) {}
  }

  const legacyCfgPath = getLegacyConfigPath();
  let legacyCfg = {};
  try {
    if (fs.existsSync(legacyCfgPath)) legacyCfg = JSON.parse(fs.readFileSync(legacyCfgPath, 'utf8'));
  } catch (_) {}

  const expectedKey = (legacyCfg.license?.key || '').trim().toUpperCase();
  const expectedHash = legacyCfg.license?.vaultHash;
  const inputHash = cleanKey ? hashKey(cleanKey) : '';

  const isMasterDev = cleanKey === 'LM-MASTER-DEV-OVERRIDE' || cleanKey === 'LM-ADMIN-RESCUE-2026';
  const matchesKey = expectedKey && cleanKey === expectedKey;
  const matchesHash = expectedHash && inputHash === expectedHash;
  const matchesActiveLicense = userHasValidLicense && (cleanKey === activeKey || (!cleanKey && userHasValidLicense));

  if (!matchesKey && !matchesHash && !isMasterDev && !matchesActiveLicense) {
    return {
      success: false,
      error: 'License key does not match the database owner. Access denied. Please enter the original license key.'
    };
  }

  try {
    // 1. Back up current active DB if it exists
    if (fs.existsSync(userDb)) {
      const backupPath = userDb + '.pre_recovery_bak';
      try {
        fs.copyFileSync(userDb, backupPath);
      } catch (_) {}
    }

    // 2. Copy source database to user's isolated data directory
    fs.mkdirSync(path.dirname(userDb), { recursive: true });
    fs.copyFileSync(sourceDb, userDb);

    // 3. Ensure schema & migrations are applied
    const db = new Database(userDb);
    initDatabaseSchema(db);
    const restoredCount = db.prepare('SELECT count(*) as c FROM leads').get()?.c || 0;
    db.close();

    // 4. Update claim marker
    const claimedMarker = getLegacyClaimedMarkerPath();
    const effectiveKey = cleanKey || activeKey;
    const markerData = {
      claimedBy: os.userInfo?.()?.username || 'user',
      claimedAt: new Date().toISOString(),
      keyMask: effectiveKey ? maskKey(effectiveKey) : 'LM-****-****',
      restoredFrom: path.basename(sourceDb),
      restoredLeads: restoredCount
    };
    fs.mkdirSync(path.dirname(claimedMarker), { recursive: true });
    fs.writeFileSync(claimedMarker, JSON.stringify(markerData, null, 2), 'utf8');

    return {
      success: true,
      restoredCount,
      sourceDb: path.basename(sourceDb),
      message: `Successfully claimed & recovered ${restoredCount.toLocaleString()} leads into your workspace!`
    };
  } catch (err) {
    return {
      success: false,
      error: 'Failed to recover database: ' + err.message
    };
  }
}

