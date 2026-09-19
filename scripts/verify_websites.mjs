#!/usr/bin/env node
/**
 * Fast Concurrent Website Reachability & 404 Validator
 * Verifies all leads in leads.db:
 * - If website is 404, does not exist, DNS fails, or connection refused -> marks status as 'unable_to_reach'
 * - If website is alive -> preserves status as 'not_contacted' (or current status)
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import https from 'https';
import http from 'http';
import dns from 'dns/promises';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '..', 'data', 'leads.db');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

const CONCURRENCY = 30;
const TIMEOUT_MS = 6000;

export async function checkWebsite(website) {
  if (!website) return { ok: false, reason: 'No website URL' };
  let domain = website.toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/+$/, '').split('/')[0].split('?')[0].split('#')[0];
  if (!domain || !domain.includes('.')) return { ok: false, reason: 'Invalid domain' };

  try {
    const addresses = await dns.lookup(domain);
    if (!addresses || !addresses.address) return { ok: false, reason: 'DNS lookup failed' };
  } catch (e) {
    return { ok: false, reason: 'Domain does not resolve' };
  }

  const tryUrl = (url) => new Promise((resolve) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.request(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
      timeout: TIMEOUT_MS,
      rejectUnauthorized: false
    }, (res) => {
      res.resume();
      if (res.statusCode === 404 || res.statusCode === 410) {
        resolve({ ok: false, reason: `HTTP ${res.statusCode}` });
      } else if (res.statusCode >= 200 && res.statusCode < 400) {
        resolve({ ok: true, statusCode: res.statusCode });
      } else if (res.statusCode === 403 || res.statusCode === 401 || res.statusCode === 429) {
        resolve({ ok: true, statusCode: res.statusCode, note: 'Protected/WAF' });
      } else if (res.statusCode >= 500) {
        resolve({ ok: false, reason: `HTTP ${res.statusCode}` });
      } else {
        resolve({ ok: true, statusCode: res.statusCode });
      }
    });

    req.on('timeout', () => { req.destroy(); resolve({ ok: false, reason: 'Timeout' }); });
    req.on('error', (err) => { resolve({ ok: false, reason: err.code || err.message }); });
    req.end();
  });

  const resHttps = await tryUrl(`https://${domain}`);
  if (resHttps.ok) return resHttps;
  if (resHttps.reason === 'HTTP 404' || resHttps.reason === 'HTTP 410') return resHttps;

  const resHttp = await tryUrl(`http://${domain}`);
  if (resHttp.ok) return resHttp;
  return { ok: false, reason: resHttps.reason || resHttp.reason };
}

async function verifyAllLeads() {
  const args = process.argv.slice(2);
  const limitArg = args.find(a => a.startsWith('--limit='))?.split('=')[1];
  const allFlag = args.includes('--all');
  const limit = allFlag ? 100000 : +(limitArg || 100000);

  const leads = db.prepare(`
    SELECT id, company_name, website, status, notes 
    FROM leads 
    WHERE website IS NOT NULL AND status != 'unable_to_reach'
    ORDER BY id ASC 
    LIMIT ?
  `).all(limit);

  console.log(`=== LeadFlow Website Reachability Validator ===`);
  console.log(`Found ${leads.length} leads to verify (Concurrency: ${CONCURRENCY}, Timeout: ${TIMEOUT_MS}ms)\n`);

  let reachableCount = 0;
  let unreachableCount = 0;
  let processed = 0;

  const updateStmt = db.prepare(`
    UPDATE leads 
    SET status = 'unable_to_reach', 
        notes = CASE WHEN notes IS NULL OR notes = '' THEN ? ELSE notes || ' | ' || ? END,
        updated_at = CURRENT_TIMESTAMP 
    WHERE id = ?
  `);

  const logStmt = db.prepare(`
    INSERT INTO contact_logs (lead_id, action, notes)
    VALUES (?, 'bounced', ?)
  `);

  async function worker(queue) {
    while (queue.length > 0) {
      const lead = queue.shift();
      if (!lead) break;

      const result = await checkWebsite(lead.website);
      processed++;

      if (!result.ok) {
        unreachableCount++;
        const reasonMsg = `Website unreachable: ${result.reason}`;
        updateStmt.run(reasonMsg, reasonMsg, lead.id);
        try {
          logStmt.run(lead.id, reasonMsg);
        } catch {}
        console.log(`[${processed}/${leads.length}] ✗ Lead #${lead.id} (${lead.company_name}) -> UNREACHABLE (${result.reason})`);
      } else {
        reachableCount++;
        if (processed % 50 === 0 || processed === leads.length) {
          console.log(`[${processed}/${leads.length}] Progress: ${reachableCount} reachable, ${unreachableCount} unreachable`);
        }
      }
    }
  }

  const queue = [...leads];
  const workers = Array.from({ length: CONCURRENCY }, () => worker(queue));
  await Promise.all(workers);

  const totalUnreachable = db.prepare("SELECT count(*) c FROM leads WHERE status = 'unable_to_reach'").get().c;
  const totalReachable = db.prepare("SELECT count(*) c FROM leads WHERE status = 'not_contacted'").get().c;

  console.log(`\n=== Verification Complete ===`);
  console.log(`Total Checked in Batch: ${leads.length}`);
  console.log(`Marked as Unreachable (404/Down/No DNS): ${unreachableCount}`);
  console.log(`Verified Alive & Reachable: ${reachableCount}`);
  console.log(`Current DB Totals -> Active (not_contacted): ${totalReachable} | Unreachable: ${totalUnreachable}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  verifyAllLeads().then(() => db.close());
}
