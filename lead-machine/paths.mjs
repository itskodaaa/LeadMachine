import path from 'path';
import os from 'os';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP_ROOT = path.resolve(__dirname, '..');

/**
 * Returns the root directory of the application repository/installation.
 */
export function getAppRoot() {
  return APP_ROOT;
}

/**
 * Determines the isolated data directory for the current operating system user.
 * Priority:
 * 1. LEADMACHINE_DATA_DIR environment variable (used for testing or custom deployments)
 * 2. Windows: %LOCALAPPDATA%\LeadMachine (e.g. C:\Users\<Username>\AppData\Local\LeadMachine)
 * 3. macOS: ~/Library/Application Support/LeadMachine
 * 4. Linux: ~/.config/leadmachine
 */
export function getUserDataDir() {
  if (process.env.LEADMACHINE_DATA_DIR) {
    const customDir = path.resolve(process.env.LEADMACHINE_DATA_DIR);
    if (!fs.existsSync(customDir)) {
      try { fs.mkdirSync(customDir, { recursive: true }); } catch (_) {}
    }
    return customDir;
  }

  const platform = process.platform;
  let userDir;

  if (platform === 'win32') {
    const localAppData = process.env.LOCALAPPDATA 
      || (process.env.USERPROFILE ? path.join(process.env.USERPROFILE, 'AppData', 'Local') : null)
      || process.env.APPDATA
      || os.homedir();
    userDir = path.join(localAppData, 'LeadMachine');
  } else if (platform === 'darwin') {
    userDir = path.join(os.homedir(), 'Library', 'Application Support', 'LeadMachine');
  } else {
    userDir = path.join(os.homedir(), '.config', 'leadmachine');
  }

  if (!fs.existsSync(userDir)) {
    try { fs.mkdirSync(userDir, { recursive: true }); } catch (_) {}
  }

  return userDir;
}

/**
 * Returns the path to the current user's SQLite database.
 * Default: <userDataDir>/data/leads.db
 */
export function getDbPath() {
  const userDir = getUserDataDir();
  const dataDir = path.join(userDir, 'data');
  if (!fs.existsSync(dataDir)) {
    try { fs.mkdirSync(dataDir, { recursive: true }); } catch (_) {}
  }
  return path.join(dataDir, 'leads.db');
}

/**
 * Returns the path to the current user's private config.json.
 * Default: <userDataDir>/config.json
 */
export function getConfigPath() {
  return path.join(getUserDataDir(), 'config.json');
}

/**
 * Returns the path to the current user's debug screenshots directory.
 * Default: <userDataDir>/data/debug_screenshots
 */
export function getScreenshotsDir() {
  const shotsDir = path.join(getUserDataDir(), 'data', 'debug_screenshots');
  if (!fs.existsSync(shotsDir)) {
    try { fs.mkdirSync(shotsDir, { recursive: true }); } catch (_) {}
  }
  return shotsDir;
}

/**
 * Returns the path to the current user's port recording file.
 * Default: <userDataDir>/leadmachine.port
 */
export function getPortFilePath() {
  return path.join(getUserDataDir(), 'leadmachine.port');
}

/**
 * Returns the legacy shared database path in the application directory.
 * Default: <APP_ROOT>/data/leads.db
 */
export function getLegacyDbPath() {
  return path.join(APP_ROOT, 'data', 'leads.db');
}

/**
 * Returns the legacy shared config path in the application directory.
 * Default: <APP_ROOT>/lead-machine/config.json
 */
export function getLegacyConfigPath() {
  return path.join(APP_ROOT, 'lead-machine', 'config.json');
}

/**
 * Returns the path to the marker indicating the legacy database was claimed.
 * Default: <APP_ROOT>/data/.legacy_claimed
 */
export function getLegacyClaimedMarkerPath() {
  return path.join(APP_ROOT, 'data', '.legacy_claimed');
}

/**
 * Returns the legacy backup path after migration.
 * Default: <APP_ROOT>/data/leads.db.migrated_bak
 */
export function getLegacyMigratedBakPath() {
  return path.join(APP_ROOT, 'data', 'leads.db.migrated_bak');
}
