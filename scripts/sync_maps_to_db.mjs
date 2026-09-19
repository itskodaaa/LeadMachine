#!/usr/bin/env node
/**
 * Autonomous Sync from Google Maps Extractor API to LeadFlow SQLite DB
 * Polls Google Maps Extractor desktop app, extracts engineering leads,
 * verifies website reachability (marks 404 / dead domains as 'unable_to_reach'),
 * and ingests them into leads.db using LeadFlow MCP batch deduplication logic.
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

// MCP batch lead importer with reachability status
function mcpAddLeadsBatch(leads, deduplicateMode = 'skip') {
  let imported = 0;
  let skipped = 0;
  let updated = 0;

  const insertStmt = db.prepare(`
    INSERT INTO leads (company_name, website, city, state, phone, email, contact_person, notes, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const updateStmt = db.prepare(`
    UPDATE leads 
    SET company_name = COALESCE(?, company_name),
        city = COALESCE(?, city),
        state = COALESCE(?, state),
        phone = COALESCE(?, phone),
        notes = COALESCE(?, notes),
        status = COALESCE(?, status),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);

  const runTx = db.transaction(() => {
    for (const lead of leads) {
      const { company_name, website, city, state, phone, notes, status } = lead;
      if (!company_name || !website) {
        skipped++;
        continue;
      }

      const normalized = normalizeWebsite(website);
      if (!normalized || !normalized.includes('.')) {
        skipped++;
        continue;
      }

      let existingLead = db.prepare('SELECT id, company_name, website FROM leads WHERE website = ?').get(normalized);
      if (!existingLead) {
        existingLead = db.prepare('SELECT id, company_name, website FROM leads WHERE LOWER(company_name) = ?').get(company_name.toLowerCase());
      }

      if (existingLead) {
        if (deduplicateMode === 'skip') {
          skipped++;
        } else if (deduplicateMode === 'update') {
          updateStmt.run(
            company_name || null,
            city || null,
            state ? state.toUpperCase() : null,
            phone || null,
            notes || null,
            status || null,
            existingLead.id
          );
          updated++;
        }
      } else {
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
        imported++;
      }
    }
  });

  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      runTx();
      break;
    } catch (err) {
      if ((err.code === 'SQLITE_BUSY' || err.code === 'SQLITE_BUSY_SNAPSHOT') && attempt < 5) {
        const waitMs = attempt * 250;
        const end = Date.now() + waitMs;
        while (Date.now() < end) {}
      } else {
        throw err;
      }
    }
  }

  return { imported, skipped, updated };
}

export async function syncCompletedTasks(minTaskId = 1) {
  console.log(`\n=== Checking Google Maps Extractor Tasks (minTaskId >= ${minTaskId}) ===`);
  const tasks = await api.getTasks();
  const list = Array.isArray(tasks) ? tasks : (tasks.results || []);

  const relevantTasks = list.filter(t => t.id >= minTaskId && !t.is_all_task);
  console.log(`Found ${relevantTasks.length} subtasks to check.`);

  let totalImported = 0;
  let totalSkipped = 0;
  let totalUpdated = 0;
  let totalUnreachable = 0;

  for (const task of relevantTasks) {
    const ndjsonPath = path.join(tasksDir, `${task.id}.ndjson`);
    let items = [];

    if (fs.existsSync(ndjsonPath)) {
      const content = fs.readFileSync(ndjsonPath, 'utf8');
      const lines = content.split('\n').filter(l => l.trim());
      for (const line of lines) {
        try {
          items.push(JSON.parse(line));
        } catch {}
      }
    }

    if (items.length === 0 && task.status === 'completed') {
      try {
        const results = await api.getTaskResults({ taskId: task.id });
        if (Array.isArray(results)) items = results;
      } catch {}
    }

    if (items.length === 0) {
      console.log(`- Task #${task.id} (${task.task_name}): Status = ${task.status} (0 results so far)`);
      continue;
    }

    // Optimize: Pre-filter duplicates using in-memory Set so we don't do slow DNS/HTTP requests for already known leads
    const existingWebsites = new Set(
      db.prepare('SELECT website FROM leads WHERE website IS NOT NULL').all().map(r => r.website.toLowerCase())
    );

    const checkQueue = [];
    let taskSkippedDuplicates = 0;

    for (const item of items) {
      if (!item.name || !item.website) continue;
      const domain = normalizeWebsite(item.website);
      if (!domain || !domain.includes('.')) continue;

      if (existingWebsites.has(domain.toLowerCase())) {
        taskSkippedDuplicates++;
        continue;
      }
      checkQueue.push(item);
    }

    const checkedLeads = [];

    const verifyWorker = async (subQueue) => {
      while (subQueue.length > 0) {
        const item = subQueue.shift();
        if (!item) break;

        const domain = normalizeWebsite(item.website);
        if (!domain || !domain.includes('.')) continue;

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

        if (!isReachable) totalUnreachable++;

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
      const res = mcpAddLeadsBatch(checkedLeads, 'skip');
      totalImported += res.imported;
      totalSkipped += (res.skipped + taskSkippedDuplicates);
      totalUpdated += res.updated;
      console.log(`✓ Task #${task.id} (${task.task_name}): ${items.length} items -> +${res.imported} new imported (${res.skipped + taskSkippedDuplicates} skipped duplicates)`);
    } else if (taskSkippedDuplicates > 0) {
      totalSkipped += taskSkippedDuplicates;
      console.log(`✓ Task #${task.id} (${task.task_name}): ${items.length} items -> all ${taskSkippedDuplicates} already in DB`);
    }
  }

  const currentDbTotal = db.prepare('SELECT count(*) c FROM leads').get().c;
  const currentUnreachable = db.prepare("SELECT count(*) c FROM leads WHERE status = 'unable_to_reach'").get().c;
  console.log(`\n=== Sync Summary ===`);
  console.log(`New Leads Ingested: +${totalImported}`);
  console.log(`Duplicates Skipped: ${totalSkipped}`);
  console.log(`Marked as Unreachable in Batch: ${totalUnreachable}`);
  console.log(`Total Leads Now in DB: ${currentDbTotal} (${currentUnreachable} Unreachable)`);
  return { totalImported, totalSkipped, currentDbTotal };
}

// If executed directly, run once or loop
const args = process.argv.slice(2);
const minId = +(args.find(a => a.startsWith('--min-id='))?.split('=')[1] || 1);
const watch = args.includes('--watch');

async function run() {
  if (watch) {
    console.log(`Watching Google Maps Extractor tasks (polling every 15s)...`);
    while (true) {
      try {
        await syncCompletedTasks(minId);
      } catch (err) {
        console.error('Sync error:', err.message);
      }
      await new Promise(r => setTimeout(r, 15000));
    }
  } else {
    await syncCompletedTasks(minId);
  }
}

run();
