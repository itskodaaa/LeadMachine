#!/usr/bin/env node
/**
 * Autonomous 10K Sync Pipeline
 * Continuously monitors Google Maps Extractor tasks, performs fast in-memory
 * deduplication, validates website reachability, and ingests leads into leads.db.
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import Api from 'botasaurus-desktop-api';
import { checkWebsite } from './verify_websites.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '..', 'data', 'leads.db');
const tasksDir = path.join(
  process.env.HOME || '/Users/macbookair',
  'Library',
  'Application Support',
  'googlemapsextractor',
  'task_results',
  'tasks'
);

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('busy_timeout = 60000');
db.pragma('foreign_keys = ON');

const api = new Api({ createResponseFiles: false });

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

function extractState(item, task) {
  if (item.detailed_address?.state) {
    const st = item.detailed_address.state.trim().toLowerCase();
    if (usStates[st]) return usStates[st];
    if (st.length === 2) return st.toUpperCase();
  }
  if (task?.data?.city_id) {
    const parts = task.data.city_id.split('__');
    if (parts.length >= 2) {
      const stateName = parts[1].replace(/_/g, ' ').toLowerCase();
      if (usStates[stateName]) return usStates[stateName];
    }
  }
  if (item.address) {
    const m = item.address.match(/,\s*([A-Z]{2})\s+\d{5}/);
    if (m) return m[1];
  }
  return null;
}

function extractCity(item, task) {
  if (item.detailed_address?.city) return item.detailed_address.city.trim();
  if (task?.data?.city_id) {
    const parts = task.data.city_id.split('__');
    if (parts.length >= 3) {
      return parts[2].replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
    }
  }
  if (item.address) {
    const parts = item.address.split(',').map(s => s.trim());
    if (parts.length >= 3) return parts[parts.length - 3];
  }
  return null;
}

// In-memory set of known websites to avoid database locks and unnecessary network checks
const existingWebsites = new Set(
  db.prepare('SELECT website FROM leads WHERE website IS NOT NULL').all().map(r => r.website.toLowerCase())
);

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

// Track synced task IDs in memory so we don't re-read them
const processedTasks = new Set();

export async function runSyncIteration() {
  const tasks = await api.getTasks();
  const list = Array.isArray(tasks) ? tasks : (tasks.results || []);

  const completed = list.filter(t => t.status === 'completed' && !t.is_all_task && !processedTasks.has(t.id));
  if (completed.length === 0) {
    const pendingCount = list.filter(t => t.status === 'pending' || t.status === 'in_progress').length;
    return { newlyImported: 0, pendingCount };
  }

  let newlyImported = 0;

  for (const task of completed) {
    const ndjsonPath = path.join(tasksDir, `${task.id}.ndjson`);
    let items = [];

    if (fs.existsSync(ndjsonPath)) {
      try {
        const content = fs.readFileSync(ndjsonPath, 'utf8');
        const lines = content.split('\n').filter(l => l.trim());
        for (const line of lines) {
          try { items.push(JSON.parse(line)); } catch {}
        }
      } catch {}
    }

    if (items.length === 0) {
      try {
        const results = await api.getTaskResults({ taskId: task.id });
        if (Array.isArray(results)) items = results;
      } catch {}
    }

    processedTasks.add(task.id);
    if (items.length === 0) continue;

    // Filter to only new websites not in DB
    const checkQueue = [];
    for (const item of items) {
      if (!item.name || !item.website) continue;
      const domain = normalizeWebsite(item.website);
      if (!domain || !domain.includes('.')) continue;
      if (existingWebsites.has(domain.toLowerCase())) continue;
      checkQueue.push(item);
    }

    if (checkQueue.length === 0) continue;

    const checkedLeads = [];
    const verifyWorker = async (subQueue) => {
      while (subQueue.length > 0) {
        const item = subQueue.shift();
        if (!item) break;

        const domain = normalizeWebsite(item.website);
        if (!domain || !domain.includes('.')) continue;
        if (existingWebsites.has(domain.toLowerCase())) continue;

        const checkRes = await checkWebsite(domain);
        const isReachable = checkRes.ok;

        const city = extractCity(item, task);
        const state = extractState(item, task);
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

    const workerQueue = [...checkQueue];
    await Promise.all(Array.from({ length: 25 }, () => verifyWorker(workerQueue)));

    if (checkedLeads.length > 0) {
      const added = insertLeadsBatch(checkedLeads);
      newlyImported += added;
      const totalNow = db.prepare('SELECT count(*) c FROM leads').get().c;
      console.log(`[+] Task #${task.id} (${task.task_name}): +${added} new leads -> Total DB: ${totalNow}`);
    }
  }

  const pendingCount = list.filter(t => t.status === 'pending' || t.status === 'in_progress').length;
  return { newlyImported, pendingCount };
}

async function main() {
  console.log(`=== Auto 10K Sync Pipeline Active ===`);
  console.log(`Starting Leads in DB: ${existingWebsites.size}`);
  
  while (true) {
    try {
      const { newlyImported, pendingCount } = await runSyncIteration();
      const currentTotal = db.prepare('SELECT count(*) c FROM leads').get().c;
      console.log(`[Status] Total Leads in DB: ${currentTotal} | Tasks Pending/Running in App: ${pendingCount}`);
      if (pendingCount === 0 && newlyImported === 0) {
        console.log('All tasks finished and synced!');
        break;
      }
    } catch (err) {
      console.error('Pipeline cycle error:', err.message);
    }
    await new Promise(r => setTimeout(r, 20000));
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
