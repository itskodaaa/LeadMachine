import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const exportDir = path.resolve(rootDir, 'LeadMachine');
const zipFile = path.resolve(rootDir, 'LeadMachine.zip');
const altZipFile = path.resolve(rootDir, 'lead-machine.zip');
const installerZipFile = path.resolve(rootDir, 'leadmachine.zip');

console.log('======================================================================');
console.log('📦 PACKAGING LEAD MACHINE — PRODUCTION STANDALONE RELEASE');
console.log('======================================================================\n');

// 1. Clean existing export dir and zip files
if (fs.existsSync(exportDir)) {
  fs.rmSync(exportDir, { recursive: true, force: true });
}
fs.mkdirSync(exportDir, { recursive: true });

if (fs.existsSync(zipFile)) {
  fs.unlinkSync(zipFile);
}
if (fs.existsSync(altZipFile)) {
  fs.unlinkSync(altZipFile);
}

// 2. Copy lead-machine directory (runtime files only)
console.log('1/4 Copying application runtime code...');
const targetLmDir = path.join(exportDir, 'lead-machine');
fs.mkdirSync(targetLmDir, { recursive: true });

const lmFilesToCopy = [
  'server.mjs',
  'paths.mjs',
  'migration.mjs',
  'orchestrator.mjs',
  'resource_governor.mjs',
  'worker.mjs',
  'reachability.mjs',
  'hunter.mjs',
  'extractor_sync.mjs',
  'auth.mjs',
  'url_importer.mjs',
  'db_migration.mjs',
  'config.json',
  'launch.ps1'
];

for (const file of lmFilesToCopy) {
  const src = path.join(__dirname, file);
  if (fs.existsSync(src)) {
    if (file === 'config.json') {
      try {
        const raw = JSON.parse(fs.readFileSync(src, 'utf8'));
        delete raw.license;
        fs.writeFileSync(path.join(targetLmDir, file), JSON.stringify(raw, null, 2), 'utf8');
      } catch (_) {
        fs.copyFileSync(src, path.join(targetLmDir, file));
      }
    } else {
      fs.copyFileSync(src, path.join(targetLmDir, file));
    }
  }
}

// Copy public/ assets
function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src)) {
    const s = path.join(src, entry);
    const d = path.join(dest, entry);
    if (fs.statSync(s).isDirectory()) {
      copyDir(s, d);
    } else {
      fs.copyFileSync(s, d);
    }
  }
}
copyDir(path.join(__dirname, 'public'), path.join(targetLmDir, 'public'));

// 3. Copy launchers & installers
console.log('2/4 Copying 1-click launchers & installers...');
const launchers = [
  'Launch_LeadMachine.bat',
  'Launch_LeadMachine.command',
  'start_lead_machine.sh',
  'install.ps1',
  'install.sh',
  'HOW_TO_RUN.txt'
];

for (const f of launchers) {
  const p = path.join(rootDir, f);
  if (fs.existsSync(p)) {
    fs.copyFileSync(p, path.join(exportDir, f));
  }
}

// Write streamlined, bloat-free package.json (fast npm install)
const cleanPkg = {
  name: 'lead-machine',
  version: '2.5.2',
  private: true,
  type: 'module',
  dependencies: {
    'better-sqlite3': '^13.0.3',
    'puppeteer': '^25.9.0',
    'puppeteer-extra': '^3.3.6',
    'puppeteer-extra-plugin-stealth': '^2.11.2'
  }
};
fs.writeFileSync(path.join(exportDir, 'package.json'), JSON.stringify(cleanPkg, null, 2), 'utf8');

// 4. Initializing clean, blank database (0 personal leads)
console.log('3/4 Initializing a 100% clean SQLite database (0 personal leads)...');
const dataDir = path.join(exportDir, 'data');
fs.mkdirSync(dataDir, { recursive: true });
const cleanDbPath = path.join(dataDir, 'leads.db');

const cleanDb = new Database(cleanDbPath);
cleanDb.pragma('journal_mode = WAL');
cleanDb.exec(`
  CREATE TABLE leads (
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

  CREATE TABLE contact_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lead_id INTEGER NOT NULL,
    action TEXT NOT NULL,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
  );
`);

const leadCount = cleanDb.prepare('SELECT count(*) as c FROM leads').get().c;
cleanDb.close();
console.log(`✓ Clean database initialized: ${leadCount} leads (Your personal leads are completely omitted)`);

// 5. Instruction files
console.log('4/4 Creating instructions file...');
const readmeText = `======================================================================
⚡ LEAD MACHINE — AUTONOMOUS OUTREACH SYSTEM
======================================================================

QUICK START:
1. Extract all files from this ZIP to a folder on your computer.
2. Double-click "Launch_LeadMachine.bat" (on Windows) or "Launch_LeadMachine.command" (on Mac).
3. The dashboard will automatically open in your browser at:
   http://localhost:3333

HOW TO GET YOUR LEADS:
Your database starts completely clean (0 leads). To add leads:

Option A: Google Maps Extractor (Scrape thousands of local businesses)
1. Download free Google Maps Extractor:
   https://www.omkar.cloud/l/win
2. Run any search (e.g. "Roofing Dallas", "Machine shops Chicago", "Dentists Miami")
3. In Lead Machine, click "Sync Extractor" — all your leads will automatically verify and load!

Option B: Import CSV / Spreadsheets
- In the dashboard, click "Import CSV" and paste your company names and websites.

Reachability Protection:
Lead Machine automatically verifies websites and filters out dead domains or 404 links so you only reach active businesses.
`;

fs.writeFileSync(path.join(exportDir, 'HOW_TO_RUN.txt'), readmeText, 'utf8');

// 6. Create ZIP
try {
  execSync(`cd "${exportDir}" && zip -r "${zipFile}" . > /dev/null 2>&1`);
  fs.copyFileSync(zipFile, altZipFile);
  fs.copyFileSync(zipFile, installerZipFile);
} catch (err) {
  console.error('Error creating ZIP:', err.message);
}

const stat = fs.statSync(zipFile);
const sizeKb = (stat.size / 1024).toFixed(1);

console.log('\n======================================================================');
console.log('🎉 STANDALONE RELEASE READY!');
console.log(`📦 File: ${zipFile} (${sizeKb} KB)`);
console.log(`📦 Alt : ${altZipFile}`);
console.log(`🔒 Verification: 0 personal leads included. Personal data is 100% private.`);
console.log('======================================================================\n');
