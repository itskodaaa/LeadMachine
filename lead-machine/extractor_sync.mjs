import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import os from 'os';
import readline from 'readline';
import { fileURLToPath } from 'url';
import { batchCheckWebsites } from './reachability.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.resolve(__dirname, '../data/leads.db');

const usStates = {
  alabama: 'AL', alaska: 'AK', arizona: 'AZ', arkansas: 'AR', california: 'CA',
  colorado: 'CO', connecticut: 'CT', delaware: 'DE', florida: 'FL', georgia: 'GA',
  hawaii: 'HI', idaho: 'ID', illinois: 'IL', indiana: 'IN', iowa: 'IA',
  kansas: 'KS', kentucky: 'KY', louisiana: 'LA', maine: 'ME', maryland: 'MD',
  massachusetts: 'MA', michigan: 'MI', minnesota: 'MN', mississippi: 'MS', missouri: 'MO',
  montana: 'MT', nebraska: 'NE', nevada: 'NV', 'new hampshire': 'NH', 'new jersey': 'NJ',
  'new mexico': 'NM', 'new york': 'NY', 'north carolina': 'NC', 'north dakota': 'ND',
  ohio: 'OH', oklahoma: 'OK', oregon: 'OR', pennsylvania: 'PA', 'rhode island': 'RI',
  'south carolina': 'SC', 'south dakota': 'SD', tennessee: 'TN', texas: 'TX',
  utah: 'UT', vermont: 'VT', virginia: 'VA', washington: 'WA', 'west virginia': 'WV',
  wisconsin: 'WI', wyoming: 'WY'
};

export function getExtractorDir() {
  const platform = process.platform;
  if (platform === 'win32') {
    const appData = process.env.APPDATA || (process.env.USERPROFILE ? path.join(process.env.USERPROFILE, 'AppData', 'Roaming') : null);
    if (appData) return path.join(appData, 'googlemapsextractor');
  } else if (platform === 'darwin') {
    const home = os.homedir();
    return path.join(home, 'Library', 'Application Support', 'googlemapsextractor');
  } else {
    const home = os.homedir();
    return path.join(home, '.config', 'googlemapsextractor');
  }
  return null;
}

export function checkExtractorStatus() {
  const extDir = getExtractorDir();
  const installed = !!(extDir && fs.existsSync(extDir));
  let taskCount = 0;
  let tasksDir = null;

  if (installed) {
    tasksDir = path.join(extDir, 'task_results', 'tasks');
    if (fs.existsSync(tasksDir)) {
      try {
        const files = fs.readdirSync(tasksDir).filter(f => f.endsWith('.ndjson'));
        taskCount = files.length;
      } catch (_) {}
    }
  }

  return {
    installed,
    path: extDir,
    tasksDir,
    taskCount,
    downloadUrl: process.platform === 'win32'
      ? 'https://www.omkar.cloud/l/win'
      : 'https://www.omkar.cloud/l/mac'
  };
}

function normalizeWebsite(url) {
  if (!url) return '';
  let s = String(url).trim().toLowerCase();
  s = s.replace(/^https?:\/\//, '').replace(/^www\./, '');
  s = s.replace(/\/+$/, '');
  s = s.split('/')[0].split('?')[0].split('#')[0];
  return s;
}

function extractState(item) {
  if (item.detailed_address?.state) {
    const st = item.detailed_address.state.trim().toLowerCase();
    if (usStates[st]) return usStates[st];
    if (st.length === 2) return st.toUpperCase();
  }
  if (item.address) {
    const m = item.address.match(/,\s*([A-Z]{2})\s+\d{5}/);
    if (m) return m[1];
  }
  return null;
}

function extractCity(item) {
  if (item.detailed_address?.city) return item.detailed_address.city.trim();
  if (item.address) {
    const parts = item.address.split(',').map(s => s.trim());
    if (parts.length >= 3) return parts[parts.length - 3];
  }
  return null;
}

export async function syncExtractorLeads(progressCb) {
  const status = checkExtractorStatus();
  if (!status.installed || !status.tasksDir || !fs.existsSync(status.tasksDir)) {
    return {
      success: false,
      error: 'Google Maps Extractor folder not found on this machine.',
      downloadUrl: status.downloadUrl
    };
  }

  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('busy_timeout = 10000');

  // Ensure table exists
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
      status TEXT DEFAULT 'not_contacted' CHECK(status IN ('not_contacted', 'pending', 'contacted', 'responded', 'unable_to_reach', 'won', 'closed')),
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const existingWebsites = new Set(
    db.prepare('SELECT website FROM leads WHERE website IS NOT NULL').all().map(r => r.website.toLowerCase())
  );

  const insertStmt = db.prepare(`
    INSERT INTO leads (company_name, website, city, state, phone, notes, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const files = fs.readdirSync(status.tasksDir)
    .filter(f => f.endsWith('.ndjson'))
    .map(f => path.join(status.tasksDir, f));

  let imported = 0;
  let importedReachable = 0;
  let importedUnreachable = 0;
  let skipped = 0;
  let totalRead = 0;

  for (const file of files) {
    try {
      const fileStream = fs.createReadStream(file);
      const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

      const batch = [];
      for await (const line of rl) {
        if (!line.trim()) continue;
        totalRead++;
        try {
          const item = JSON.parse(line);
          const website = item.website || item.site || item.url;
          const companyName = item.title || item.name || item.company_name;
          if (!website || !companyName) {
            skipped++;
            continue;
          }

          const norm = normalizeWebsite(website);
          if (!norm || !norm.includes('.')) {
            skipped++;
            continue;
          }

          if (existingWebsites.has(norm.toLowerCase())) {
            skipped++;
            continue;
          }

          const city = extractCity(item);
          const state = extractState(item);
          const phone = item.phone || item.phone_number || null;
          const notes = `Google Maps: ${item.category || item.main_category || 'B2B'}`;

          batch.push({ companyName: companyName.trim(), norm, city, state, phone, notes });
          existingWebsites.add(norm.toLowerCase());
        } catch (_) {}
      }

      if (batch.length > 0) {
        // Pre-verify website reachability before assigning status
        const itemsWithWebsite = batch.map(b => ({ ...b, website: b.norm }));
        const verified = await batchCheckWebsites(itemsWithWebsite, 15);

        const tx = db.transaction((items) => {
          for (const it of items) {
            const isAlive = it.reachability?.ok;
            const targetStatus = isAlive ? 'not_contacted' : 'unable_to_reach';
            const finalNotes = isAlive ? it.notes : `${it.notes} (Unreachable: ${it.reachability?.reason || 'Dead site'})`;
            insertStmt.run(it.companyName, it.norm, it.city, it.state, it.phone, finalNotes, targetStatus);
            if (isAlive) importedReachable++;
            else importedUnreachable++;
            imported++;
          }
        });
        tx(verified);
      }
    } catch (_) {}

    if (progressCb) progressCb({ imported, importedReachable, importedUnreachable, skipped, totalRead });
  }

  const finalTotal = db.prepare("SELECT count(*) as c FROM leads WHERE status = 'not_contacted'").get().c;
  db.close();

  return {
    success: true,
    imported,
    importedReachable,
    importedUnreachable,
    skipped,
    totalRead,
    totalNotContacted: finalTotal
  };
}
