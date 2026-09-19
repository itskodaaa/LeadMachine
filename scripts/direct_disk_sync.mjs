#!/usr/bin/env node
/**
 * Direct Disk Sync Engine
 * Reads all 572+ scraped .ndjson task result files directly from disk,
 * bypassing HTTP serialization limits, validating website reachability,
 * and batch-inserting into leads.db.
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import readline from 'readline';
import Api from 'botasaurus-desktop-api';
import { checkWebsite } from './verify_websites.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '..', 'data', 'leads.db');
const appSupportDir = path.join(
  process.env.HOME || '/Users/macbookair',
  'Library',
  'Application Support',
  'googlemapsextractor'
);
const tasksDir = path.join(appSupportDir, 'task_results', 'tasks');
const nedbPath = path.join(appSupportDir, 'db.nedb');
const botApi = new Api({ createResponseFiles: false });

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('busy_timeout = 60000');
db.pragma('foreign_keys = ON');

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

// In-memory set of known websites to prevent duplicate DB writes
console.log('Loading existing domains from leads.db...');
const existingWebsites = new Set(
  db.prepare('SELECT website FROM leads WHERE website IS NOT NULL').all().map(r => r.website.toLowerCase())
);
console.log(`Loaded ${existingWebsites.size} existing unique domains.\n`);

const insertStmt = db.prepare(`
  INSERT INTO leads (company_name, website, city, state, phone, email, contact_person, notes, status)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

function insertLeadsBatch(leads) {
  let imported = 0;
  const runTx = db.transaction(() => {
    for (const lead of leads) {
      const { company_name, website, city, state, phone, notes, status } = lead;
      if (!company_name || !website) continue;
      const normalized = normalizeWebsite(website);
      if (!normalized || !normalized.includes('.')) continue;
      if (existingWebsites.has(normalized.toLowerCase())) continue;

      insertStmt.run(
        company_name,
        normalized,
        city || null,
        state ? state.toUpperCase() : null,
        phone || null,
        null,
        null,
        notes || null,
        status || 'not_contacted'
      );
      existingWebsites.add(normalized.toLowerCase());
      imported++;
    }
  });

  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      runTx();
      break;
    } catch (err) {
      if ((err.code === 'SQLITE_BUSY' || err.code === 'SQLITE_BUSY_SNAPSHOT') && attempt < 5) {
        const waitMs = attempt * 200;
        const end = Date.now() + waitMs;
        while (Date.now() < end) {}
      } else {
        throw err;
      }
    }
  }

  return imported;
}

const processedFilesCache = new Map();

async function processAllFiles() {
  const files = fs.readdirSync(tasksDir)
    .filter(f => f.endsWith('.ndjson'))
    .map(f => ({
      name: f,
      id: parseInt(f.replace('.ndjson', ''), 10),
      path: path.join(tasksDir, f)
    }))
    .sort((a, b) => a.id - b.id);

  let totalNewImported = 0;
  let skippedCached = 0;
  let newlyProcessed = 0;

  for (const fileObj of files) {
    let stats;
    try {
      stats = fs.statSync(fileObj.path);
    } catch {
      continue;
    }

    const cached = processedFilesCache.get(fileObj.id);
    if (cached && cached.size === stats.size && cached.mtimeMs === stats.mtimeMs) {
      skippedCached++;
      continue;
    }

    newlyProcessed++;
    const items = [];
    const fileStream = fs.createReadStream(fileObj.path, { encoding: 'utf8' });
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

    for await (const line of rl) {
      if (!line.trim()) continue;
      try {
        items.push(JSON.parse(line));
      } catch {}
    }

    // Cache metadata once read
    processedFilesCache.set(fileObj.id, { size: stats.size, mtimeMs: stats.mtimeMs });

    if (items.length === 0) continue;

    // Filter to only new items
    const newItems = [];
    for (const item of items) {
      if (!item.name || !item.website) continue;
      const domain = normalizeWebsite(item.website);
      if (!domain || !domain.includes('.')) continue;
      if (existingWebsites.has(domain.toLowerCase())) continue;
      newItems.push(item);
    }

    if (newItems.length === 0) continue;

    // Concurrently verify reachability for new domains
    const checkedLeads = [];
    const verifyWorker = async (queue) => {
      while (queue.length > 0) {
        const item = queue.shift();
        if (!item) break;

        const domain = normalizeWebsite(item.website);
        if (!domain || !domain.includes('.')) continue;
        if (existingWebsites.has(domain.toLowerCase())) continue;

        const checkRes = await checkWebsite(domain);
        const isReachable = checkRes.ok;

        const city = extractCity(item);
        const state = extractState(item);
        const phone = item.phone || item.phone_international || null;

        let notes = '';
        if (item.main_category) notes += `${item.main_category}. `;
        if (item.rating) notes += `${item.rating} stars`;
        if (item.reviews) notes += ` (${item.reviews} reviews). `;
        if (item.address) notes += `Address: ${item.address}. `;
        if (!isReachable) notes += `Website unreachable (${checkRes.reason}). `;
        notes += 'Extracted via Google Maps Extractor.';

        checkedLeads.push({
          company_name: item.name.trim(),
          website: domain,
          city: city || null,
          state: state || null,
          phone: phone || null,
          notes: notes.trim(),
          status: isReachable ? 'not_contacted' : 'unable_to_reach'
        });
      }
    };

    const queue = [...newItems];
    await Promise.all(Array.from({ length: 25 }, () => verifyWorker(queue)));

    if (checkedLeads.length > 0) {
      const added = insertLeadsBatch(checkedLeads);
      totalNewImported += added;
      console.log(`[Sync] File #${fileObj.id}: +${added} new leads -> Total DB: ${existingWebsites.size}`);
    }
  }

  if (newlyProcessed > 0 || totalNewImported > 0) {
    console.log(`=== Sync Cycle Complete: scanned ${files.length} files (${skippedCached} unchanged, ${newlyProcessed} read) | +${totalNewImported} new leads | Total: ${existingWebsites.size} ===`);
  }
  return totalNewImported;
}

async function checkAndRecoverStalledTasks() {
  if (!fs.existsSync(nedbPath)) return;
  try {
    const lines = fs.readFileSync(nedbPath, 'utf8').split('\n').filter(Boolean);
    const tasks = {};
    for (const line of lines) {
      try {
        const obj = JSON.parse(line);
        if (obj.id) tasks[obj.id] = obj;
      } catch {}
    }
    const runningSubtasks = Object.values(tasks).filter(t => t.status === 'in_progress' && !t.is_all_task);
    for (const task of runningSubtasks) {
      const startedAt = task.started_at?.$$date || (task.started_at ? new Date(task.started_at).getTime() : null);
      const updatedAt = task.updated_at?.$$date || (task.updated_at ? new Date(task.updated_at).getTime() : null);
      const now = Date.now();
      // If a subtask has been running for > 90s AND has had no update for > 60s:
      if (startedAt && (now - startedAt > 90000) && updatedAt && (now - updatedAt > 60000)) {
        console.log(`[Watchdog] Stalled task detected: #${task.id} "${task.task_name}" (idle ${Math.round((now - updatedAt) / 1000)}s). Aborting to advance queue...`);
        try {
          await botApi.abortTask(task.id);
          console.log(`[Watchdog] Successfully recovered: Task #${task.id} aborted; next task will auto-dispatch.`);
        } catch (abortErr) {
          console.error(`[Watchdog] Failed to abort task #${task.id}:`, abortErr.message);
        }
      }
    }

    const all = Object.values(tasks);
    const running = all.filter(t => t.status === 'in_progress' && !t.is_all_task);
    const completed = all.filter(t => t.status === 'completed' && !t.is_all_task).length;
    const pending = all.filter(t => t.status === 'pending' && !t.is_all_task).length;
    const activeInfo = running.map(t => `#${t.id} "${t.task_name?.slice(0, 32)}" (${t.result_count || 0} leads)`).join(', ') || 'none';
    const nowStr = new Date().toLocaleTimeString();
    console.log(`[Heartbeat ${nowStr}] Active: [${activeInfo}] | Queue: ${completed} done, ${pending} pending | DB: ${existingWebsites.size} leads`);
  } catch (err) {
    console.error('[Watchdog] Error during check:', err.message);
  }
}

const isWatch = process.argv.includes('--watch');

async function main() {
  if (isWatch) {
    console.log('=== Direct Disk Sync & Anti-Stall Watchdog Active (Scanning every 30s) ===\n');
    while (true) {
      try {
        await checkAndRecoverStalledTasks();
        await processAllFiles();
      } catch (err) {
        console.error('Disk sync cycle error:', err.message);
      }
      await new Promise(r => setTimeout(r, 30000));
    }
  } else {
    await processAllFiles();
    db.close();
  }
}

main();
