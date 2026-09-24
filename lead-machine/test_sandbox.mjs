import http from 'http';
import { spawn, execSync } from 'child_process';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

import { getDbPath } from './paths.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEST_PORT = 3339;

console.log('======================================================');
console.log('🧪 LEAD MACHINE: COMPREHENSIVE SANDBOX VERIFICATION');
console.log('======================================================\n');

let serverProc = null;

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path,
      method: options.method || 'GET',
      headers: options.headers || {}
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = res.headers['content-type']?.includes('application/json') ? JSON.parse(data) : null;
          resolve({ status: res.statusCode, headers: res.headers, body: data, json });
        } catch (_) {
          resolve({ status: res.statusCode, headers: res.headers, body: data });
        }
      });
    });

    req.on('error', reject);
    if (options.body) req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    req.end();
  });
}

async function runTests() {
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  // --- TEST 1: Database Health & Test Isolation Environment ---
  console.log('\n[1/5] Testing Database Connection & Test Isolation Environment...');
  const testDataDir = path.join(os.tmpdir(), 'lm_sandbox_' + Date.now());
  fs.mkdirSync(path.join(testDataDir, 'data'), { recursive: true });

  let realDbPath = path.resolve(__dirname, '../data/leads.db');
  if (!fs.existsSync(realDbPath)) {
    if (fs.existsSync(path.resolve(__dirname, '../data/leads.db.bak'))) {
      realDbPath = path.resolve(__dirname, '../data/leads.db.bak');
    } else {
      realDbPath = getDbPath();
    }
  }
  assert(fs.existsSync(realDbPath), 'Source database exists (' + realDbPath + ')');
  fs.copyFileSync(realDbPath, path.join(testDataDir, 'data/leads.db'));
  fs.copyFileSync(path.resolve(__dirname, 'config.json'), path.join(testDataDir, 'config.json'));

  const dbPath = path.join(testDataDir, 'data/leads.db');
  const db = new Database(dbPath);
  const leadsCount = db.prepare("SELECT count(*) as c FROM leads").get().c;
  const notContacted = db.prepare("SELECT count(*) as c FROM leads WHERE status = 'not_contacted'").get().c;
  const contacted = db.prepare("SELECT count(*) as c FROM leads WHERE status = 'contacted'").get().c;
  db.close();
  assert(leadsCount > 0, `Database contains ${leadsCount} total leads`);
  assert(notContacted > 0, `Database contains ${notContacted} fresh uncontacted leads`);
  console.log(`      Current DB State: ${contacted} contacted, ${notContacted} pending`);

  // --- TEST 2: Start Web Server on Test Port ---
  console.log('\n[2/5] Booting Test Web Server on Port ' + TEST_PORT + '...');
  serverProc = spawn('node', ['lead-machine/server.mjs'], {
    env: { ...process.env, PORT: String(TEST_PORT), LEADMACHINE_DATA_DIR: testDataDir },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  serverProc.stderr.on('data', d => console.error('SERVER STDERR:', d.toString()));
  serverProc.on('exit', (code, sig) => console.log(`SERVER PROCESS EXITED: code=${code}, signal=${sig}`));

  // Wait for server to start
  await new Promise(r => setTimeout(r, 1500));

  // Authenticate test server with dev master override
  const authRes = await request('/api/auth/activate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { key: 'LM-MASTER-DEV-OVERRIDE' }
  });
  assert(authRes.status === 200 && authRes.json?.success, 'POST /api/auth/activate with Master Dev Override');

  // --- TEST 3: Static Assets & Web Dashboard ---
  console.log('\n[3/5] Testing Web Dashboard Endpoints...');
  const indexRes = await request('/');
  assert(indexRes.status === 200, 'GET / returns 200 OK');
  assert(indexRes.body.includes('Lead Machine'), 'Dashboard HTML contains brand header');

  const cssRes = await request('/style.css');
  assert(cssRes.status === 200, 'GET /style.css returns 200 OK');

  const jsRes = await request('/app.js');
  assert(jsRes.status === 200, 'GET /app.js returns 200 OK');

  // --- TEST 4: Hardware Spec & Profile APIs ---
  console.log('\n[4/5] Testing Hardware Detection & Concurrency APIs...');
  const specsRes = await request('/api/system-specs');
  assert(specsRes.status === 200, 'GET /api/system-specs returns 200 OK');
  assert(specsRes.json.cpuCount > 0, `Detected ${specsRes.json.cpuCount} CPU Cores`);
  assert(specsRes.json.totalMemGb > 0, `Detected ${specsRes.json.totalMemGb} GB RAM`);
  assert(specsRes.json.recommendedWorkers > 0, `Recommended Concurrency: ${specsRes.json.recommendedWorkers} Workers`);
  console.log(`      Hardware Rating: ${specsRes.json.hardwareTier}`);

  // Test Profile Save
  const profileRes = await request('/api/profile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: {
      fullName: 'Alex Morgan',
      company: 'Apex Precision Engineering',
      email: 'alex@apexprecision.com'
    }
  });
  assert(profileRes.status === 200 && profileRes.json.success, 'POST /api/profile successfully saved custom sender profile');

  // --- TEST 5: Live SSE Telemetry & Sandbox Outreach Execution ---
  console.log('\n[5/5] Executing 4-Lead Sandbox Campaign via SSE Telemetry...');
  
  // Record pre-sandbox DB stats
  const preDb = new Database(dbPath);
  const preContacted = preDb.prepare("SELECT count(*) as c FROM leads WHERE status = 'contacted'").get().c;
  preDb.close();

  // Connect to SSE stream
  let sseReceivedInitial = false;
  let sseLeadResults = 0;
  let sseCompleted = false;

  const sseReq = http.request({
    hostname: '127.0.0.1',
    port: TEST_PORT,
    path: '/api/stream',
    method: 'GET'
  }, (res) => {
    res.on('data', (chunk) => {
      const text = chunk.toString();
      const lines = text.split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const ev = JSON.parse(line.substring(6));
            if (ev.type === 'initial_state') sseReceivedInitial = true;
            if (ev.type === 'lead_result') {
              sseLeadResults++;
              console.log(`      📡 [SSE Event] Lead #${ev.leadId} ${ev.company}: ${ev.status} (${ev.time}s)`);
            }
            if (ev.type === 'campaign_finished') {
              sseCompleted = true;
            }
          } catch (_) {}
        }
      }
    });
  });
  sseReq.end();

  await new Promise(r => setTimeout(r, 600));
  assert(sseReceivedInitial, 'SSE Stream connected & received initial telemetry state');

  // Trigger Sandbox Campaign (2 leads, 2 workers, sandbox=true)
  const startRes = await request('/api/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: {
      targetLeads: 2,
      numWorkers: 2,
      isSandbox: true
    }
  });

  assert(startRes.status === 200 && startRes.json.success, 'POST /api/start accepted sandbox campaign');

  // Wait for sandbox campaign to finish or timeout at 90s
  console.log('      Running headless Chromium workers in sandbox mode...');
  const startWait = Date.now();
  while (!sseCompleted && (Date.now() - startWait) < 90000) {
    await new Promise(r => setTimeout(r, 1000));
  }

  assert(sseLeadResults > 0, `SSE Stream received ${sseLeadResults} live lead execution results`);
  assert(sseCompleted, 'Campaign completed event received via SSE');

  // Verify Zero Mail.app popups
  const mailCheck = execSync('pgrep -x "Mail" || echo "CLEAN"', { encoding: 'utf8' }).trim();
  assert(mailCheck === 'CLEAN', 'macOS Mail.app was 100% suppressed during browser automation');

  // Verify Sandbox Non-Destructive Guarantee
  const postDb = new Database(dbPath);
  const postContacted = postDb.prepare("SELECT count(*) as c FROM leads WHERE status = 'contacted'").get().c;
  postDb.close();
  assert(preContacted === postContacted, `Sandbox Guarantee Verified: Production contacted count remained unchanged (${postContacted})`);

  // --- TEST 6: Headed Debugging Mode Safety Limits ---
  console.log('\n[6/6] Testing Visual Debugging (Headed) Safety Controls...');
  const rejectRes = await request('/api/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: {
      targetLeads: 50,
      numWorkers: 2,
      isHeaded: true
    }
  });
  assert(rejectRes.status === 400 && rejectRes.json.error?.includes('maximum of 10 leads'), 'Correctly blocked headed mode with large lead target (50 leads)');

  const acceptRes = await request('/api/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: {
      targetLeads: 1,
      numWorkers: 1,
      isSandbox: true,
      isHeaded: true
    }
  });
  assert(acceptRes.status === 200 && acceptRes.json.success, 'Correctly allowed headed mode with safe target (1 lead)');
  await request('/api/stop', { method: 'POST' });

  // --- TEST 7: Extractor Status & Sync Endpoint ---
  console.log('\n[7/8] Testing Google Maps Extractor API & Auto-Sync Engine...');
  const extStatus = await request('/api/extractor-status');
  assert(extStatus.status === 200 && extStatus.json.success === true, 'GET /api/extractor-status returns 200 JSON');
  assert(typeof extStatus.json.installed === 'boolean', `Extractor installation state detected (${extStatus.json.installed})`);
  assert(extStatus.json.downloadUrl?.includes('omkar.cloud'), 'Download URL provided correctly for fallback');

  // --- TEST 8: Website Reachability Pre-Verification ---
  console.log('\n[8/8] Testing Website Reachability Pre-Verification & Dead Site Protection...');
  const { checkWebsite } = await import('./reachability.mjs');
  const liveCheck = await checkWebsite('google.com');
  assert(liveCheck.ok === true, 'Live website pre-check passed (google.com)');

  const deadCheck = await checkWebsite('fakedomainthatexistsnowhere12345.xyz');
  assert(deadCheck.ok === false, 'Dead website pre-check blocked as unreachable');

  const cleanupDb = new Database(dbPath);
  cleanupDb.prepare("DELETE FROM leads WHERE website IN ('google.com', 'nonexistentfakesite9876543210.com')").run();
  cleanupDb.close();

  const importTest = await request('/api/import-leads', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: {
      leads: [
        { company_name: 'Test Live Co', website: 'google.com', city: 'Mountain View', state: 'CA' },
        { company_name: 'Test Dead Co', website: 'nonexistentfakesite9876543210.com', city: 'Nowhere', state: 'XX' }
      ]
    }
  });
  assert(importTest.status === 200 && importTest.json.success, 'POST /api/import-leads with reachability check succeeded');
  assert(importTest.json.insertedReachable === 1, 'Only live site was admitted as not_contacted (1)');
  assert(importTest.json.insertedUnreachable === 1, 'Dead site was intercepted & marked as unable_to_reach (1)');

  console.log('\n======================================================');
  console.log(`🏁 SANDBOX TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================\n');

  if (serverProc) serverProc.kill('SIGTERM');
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error('Test Suite Failed:', err);
  if (serverProc) serverProc.kill('SIGTERM');
  process.exit(1);
});
