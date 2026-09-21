import http from 'http';
import https from 'https';
import dns from 'dns';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { orchestrator } from './orchestrator.mjs';
import { checkExtractorStatus, syncExtractorLeads } from './extractor_sync.mjs';
import { batchCheckWebsites } from './reachability.mjs';
import { leadHunter } from './hunter.mjs';
import { parseRawWebsites, importWebsitesToDb, crawlDirectoryPage } from './url_importer.mjs';

// Prioritize IPv4 on virtualized / VM networks (fixes UTM/QEMU/Hyper-V IPv6 timeout)
try {
  dns.setDefaultResultOrder('ipv4first');
} catch (_) {}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3333;
const PUBLIC_DIR = path.join(__dirname, 'public');

async function fetchRemote(urlStr, options = {}) {
  const timeoutMs = options.timeout || 10000;
  if (typeof fetch === 'function') {
    try {
      const res = await fetch(urlStr, {
        headers: {
          'User-Agent': 'LeadMachine-Enterprise-Updater',
          'Accept': 'application/vnd.github.v3+json',
          ...options.headers
        },
        signal: AbortSignal.timeout(timeoutMs),
        redirect: 'follow'
      });
      return {
        ok: res.ok,
        status: res.status,
        text: () => res.text(),
        json: () => res.json().catch(() => null)
      };
    } catch (_) {
      return {
        ok: false,
        status: 0,
        text: () => Promise.resolve(''),
        json: () => Promise.resolve(null)
      };
    }
  }

  // Fallback for older Node environments without fetch
  const resFromHttps = await new Promise((resolve) => {
    try {
      const parsed = new URL(urlStr);
      const req = https.get(parsed, {
        headers: {
          'User-Agent': 'LeadMachine-Enterprise-Updater',
          'Accept': 'application/vnd.github.v3+json',
          ...options.headers
        },
        timeout: timeoutMs
      }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          res.resume();
          return fetchRemote(res.headers.location, options).then(resolve);
        }
        if (res.statusCode !== 200) {
          res.resume();
          return resolve({
            ok: false,
            status: res.statusCode,
            text: () => Promise.resolve(''),
            json: () => Promise.resolve(null)
          });
        }
        const chunks = [];
        res.on('data', chunk => chunks.push(chunk));
        res.on('end', () => {
          const body = Buffer.concat(chunks).toString('utf8');
          resolve({
            ok: true,
            status: 200,
            text: () => Promise.resolve(body),
            json: () => {
              try { return Promise.resolve(JSON.parse(body)); }
              catch (_) { return Promise.resolve(null); }
            }
          });
        });
      });
      req.on('error', () => resolve({ ok: false, status: 0, text: () => Promise.resolve(''), json: () => Promise.resolve(null) }));
      req.on('timeout', () => {
        req.destroy();
        resolve({ ok: false, status: 0, text: () => Promise.resolve(''), json: () => Promise.resolve(null) });
      });
    } catch (_) {
      resolve({ ok: false, status: 0, text: () => Promise.resolve(''), json: () => Promise.resolve(null) });
    }
  });

  if (resFromHttps && resFromHttps.ok) return resFromHttps;

  // OS curl fallback if Node network sockets were restricted by VM / NAT virtualization
  try {
    const cmd = process.platform === 'win32'
      ? `curl.exe -s -L --max-time 8 -A "LeadMachine-Enterprise-Updater" "${urlStr}"`
      : `curl -s -L --max-time 8 -A "LeadMachine-Enterprise-Updater" "${urlStr}"`;
    const out = execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
    if (out && out.length > 0) {
      return {
        ok: true,
        status: 200,
        text: () => Promise.resolve(out),
        json: () => {
          try { return Promise.resolve(JSON.parse(out)); }
          catch (_) { return Promise.resolve(null); }
        }
      };
    }
  } catch (_) {}

  return resFromHttps;
}

// Ensure auth.mjs exists (self-healing for installations updating from v2.1.x)
const authPath = path.join(__dirname, 'auth.mjs');
if (!fs.existsSync(authPath)) {
  try {
    const remoteUrl = 'https://raw.githubusercontent.com/leadmachine-core/installer/main/auth.mjs';
    const res = await fetchRemote(remoteUrl);
    if (res.ok) {
      const code = await res.text();
      if (code && code.length > 100) {
        fs.writeFileSync(authPath, code, 'utf8');
      }
    }
  } catch (_) {}
}

let getAuthStatus = () => ({ authenticated: false, clientName: null, keyMask: null, status: 'unactivated', error: null, limits: null });
let activateLicense = async () => ({ success: false, error: 'Auth module initializing' });
let deactivateLicense = () => ({ success: true });
let startLicenseHeartbeat = () => {};
let getTierLimits = () => ({ maxHunterLeads: 100000, maxWorkers: 6, canExportCsv: true, label: 'Enterprise' });
let TIER_LIMITS = {};

try {
  const authMod = await import('./auth.mjs');
  getAuthStatus = authMod.getAuthStatus;
  activateLicense = authMod.activateLicense;
  deactivateLicense = authMod.deactivateLicense;
  startLicenseHeartbeat = authMod.startLicenseHeartbeat;
  if (authMod.getTierLimits) getTierLimits = authMod.getTierLimits;
  if (authMod.TIER_LIMITS) TIER_LIMITS = authMod.TIER_LIMITS;
} catch (e) {
  console.warn('[Server] Auth module import deferred:', e.message);
}

function getSystemSpecs() {
  const cpus = os.cpus() || [];
  const cpuCount = cpus.length;
  const cpuModel = cpus[0]?.model || 'Standard CPU';
  const totalMemBytes = os.totalmem();
  const freeMemBytes = os.freemem();
  const totalMemGb = Number((totalMemBytes / (1024 ** 3)).toFixed(1));
  const freeMemGb = Number((freeMemBytes / (1024 ** 3)).toFixed(1));

  // Recommendation logic:
  // RAM is the primary constraint for headless Chromium (~200MB per worker)
  let recommendedWorkers = 6;
  let maxWorkers = 12;
  let hardwareTier = 'Standard';

  if (totalMemGb >= 16 && cpuCount >= 8) {
    recommendedWorkers = 10;
    maxWorkers = 16;
    hardwareTier = 'High Performance';
  } else if (totalMemGb >= 8 && cpuCount >= 6) {
    recommendedWorkers = 8;
    maxWorkers = 10;
    hardwareTier = 'Balanced';
  } else if (totalMemGb <= 4 || cpuCount <= 4) {
    recommendedWorkers = 3;
    maxWorkers = 6;
    hardwareTier = 'Lightweight';
  }

  let config = {};
  try {
    const cfgPath = path.join(__dirname, 'config.json');
    if (fs.existsSync(cfgPath)) config = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
  } catch (_) {}

  const db = orchestrator.getDb();
  const notContacted = db.prepare("SELECT count(*) as c FROM leads WHERE status = 'not_contacted'").get().c;
  const contacted = db.prepare("SELECT count(*) as c FROM leads WHERE status = 'contacted'").get().c;
  const unableToReach = db.prepare("SELECT count(*) as c FROM leads WHERE status = 'unable_to_reach'").get().c;
  const total = db.prepare("SELECT count(*) as c FROM leads").get().c;
  const states = db.prepare("SELECT state, count(*) as count FROM leads WHERE status = 'not_contacted' AND state IS NOT NULL GROUP BY state ORDER BY count DESC LIMIT 15").all();
  db.close();

  return {
    cpuCount,
    cpuModel,
    totalMemGb,
    freeMemGb,
    platform: os.platform(),
    arch: os.arch(),
    hardwareTier,
    recommendedWorkers,
    maxWorkers,
    senderProfile: config.sender || null,
    settings: config.settings || {},
    extractor: checkExtractorStatus(),
    dbStats: {
      notContacted,
      contacted,
      unableToReach,
      total,
      topStates: states
    }
  };
}

const sseClients = new Set();
export function broadcastSSE(event) {
  const data = `data: ${JSON.stringify(event)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(data);
    } catch (_) {
      sseClients.delete(client);
    }
  }
}
orchestrator.on('telemetry', (event) => broadcastSSE(event));


const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // 1. Authentication & Licensing Endpoints (Public)
  if (pathname === '/api/auth/status' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(getAuthStatus()));
    return;
  }

  if (pathname === '/api/auth/activate' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body || '{}');
        const result = await activateLicense(payload.key);
        if (result.success) {
          broadcastSSE({ type: 'auth_activated', clientName: result.clientName, tier: result.tier });
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(result));
        } else {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(result));
        }
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  if (pathname === '/api/auth/deactivate' && req.method === 'POST') {
    deactivateLicense();
    broadcastSSE({ type: 'auth_revoked', reason: 'User logged out' });
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true }));
    return;
  }

  // 2. ZERO-TRUST GLOBAL AUTH GUARD FOR ALL OTHER API ROUTES & SSE STREAMS
  // (Permits /api/system/version and /api/system/update so instances can check/apply updates)
  const isPublicApi = pathname === '/api/system/version' || pathname === '/api/system/update';
  if ((pathname.startsWith('/api/') || pathname === '/api/stream' || pathname === '/events') && !isPublicApi) {
    const auth = getAuthStatus();
    if (!auth.authenticated) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: false,
        authenticated: false,
        status: auth.status || 'unactivated',
        error: auth.error || 'Enterprise license activation required. Access blocked.',
        tier: auth.tier || null
      }));
      return;
    }
  }

  // SSE Stream (Guaranteed authenticated now)
  if (pathname === '/api/stream') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });
    res.write(`data: ${JSON.stringify({ type: 'initial_state', state: orchestrator.getStatus() })}\n\n`);
    sseClients.add(res);
    req.on('close', () => sseClients.delete(res));
    return;
  }

  // API Endpoints (All protected by global auth guard)
  if (pathname === '/api/system-specs' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(getSystemSpecs()));
    return;
  }

  if (pathname === '/api/status' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(orchestrator.getStatus()));
    return;
  }

  if (pathname === '/api/start' && req.method === 'POST') {
    const auth = getAuthStatus();
    const limits = getTierLimits(auth.tier);

    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body || '{}');
        const status = await orchestrator.startCampaign(payload);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, status }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  if (pathname === '/api/pause' && req.method === 'POST') {
    orchestrator.pauseCampaign();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, status: orchestrator.getStatus() }));
    return;
  }

  if (pathname === '/api/resume' && req.method === 'POST') {
    orchestrator.resumeCampaign();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, status: orchestrator.getStatus() }));
    return;
  }

  if (pathname === '/api/stop' && req.method === 'POST') {
    orchestrator.stopCampaign();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, status: orchestrator.getStatus() }));
    return;
  }

  if (pathname === '/api/profile' && req.method === 'GET') {
    const cfgPath = path.join(__dirname, 'config.json');
    let cfg = {};
    if (fs.existsSync(cfgPath)) {
      try { cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8')); } catch (_) {}
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, profile: cfg.sender || {} }));
    return;
  }

  if (pathname === '/api/profile' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const profile = JSON.parse(body || '{}');
        const cfgPath = path.join(__dirname, 'config.json');
        let cfg = {};
        if (fs.existsSync(cfgPath)) {
          try { cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8')); } catch (_) {}
        }

        // Two-way name synthesis
        let fullName = (profile.fullName || '').trim();
        let firstName = (profile.firstName || '').trim();
        let lastName = (profile.lastName || '').trim();

        if (fullName && (!firstName || !lastName)) {
          const parts = fullName.split(/\s+/);
          if (!firstName) firstName = parts[0] || '';
          if (!lastName) lastName = parts.slice(1).join(' ') || '';
        } else if (!fullName && (firstName || lastName)) {
          fullName = `${firstName} ${lastName}`.trim();
        }

        const updatedProfile = {
          ...(cfg.sender || {}),
          ...profile,
          fullName,
          firstName,
          lastName
        };

        cfg.sender = updatedProfile;
        fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2));
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, profile: updatedProfile }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  // Lead Hunter Endpoints
  if (pathname === '/api/hunter/start' && req.method === 'POST') {
    const auth = getAuthStatus();
    const limits = getTierLimits(auth.tier);

    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body || '{}');
        const requestedLimit = Number(payload.limit) || 20;

        if (requestedLimit > limits.maxHunterLeads) {
          res.writeHead(403, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: false,
            error: `Your current ${limits.label} license is limited to a maximum of ${limits.maxHunterLeads.toLocaleString()} leads per search. Please upgrade your license to unlock higher volumes.`
          }));
          return;
        }

        leadHunter.startHunting({
          query: payload.query || 'Manufacturing',
          state: payload.state || 'Illinois',
          city: payload.city || '',
          limit: requestedLimit,
          onEvent: (evt) => {
            broadcastSSE(evt);
          }
        }).catch(err => {
          console.error('Lead Hunter background error:', err);
        });

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, status: leadHunter.getStatus() }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  if (pathname === '/api/hunter/status' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, status: leadHunter.getStatus() }));
    return;
  }

  if (pathname === '/api/hunter/stop' && req.method === 'POST') {
    leadHunter.stopHunting();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, status: leadHunter.getStatus() }));
    return;
  }

  // System Version & Updates
  if (pathname === '/api/system/version' && req.method === 'GET') {
    const cfgPath = path.join(__dirname, 'config.json');
    let cfg = {};
    if (fs.existsSync(cfgPath)) {
      try { cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8')); } catch (_) {}
    }
    const currentVer = cfg.settings?.version || '2.1.0';
    const currentCommit = cfg.settings?.buildCommit || 'master';
    const repo = 'leadmachine-core/installer';
    const branch = 'main';

    let remoteCommit = null;
    let remoteShort = null;
    let commitMessage = null;
    let commitDate = null;
    let remoteVer = currentVer;
    let updateAvailable = false;
    let isOffline = false;
    let internetVerified = false;

    // 1. Primary: Atom feed (Instant real-time HEAD of master branch, ZERO rate limits, always points directly to latest HEAD)
    try {
      const atomRes = await fetchRemote(`https://github.com/${repo}/commits/${branch}.atom?_t=${Date.now()}`, { timeout: 6000 });
      if (atomRes.ok) {
        internetVerified = true;
        const atomText = await atomRes.text();
        const m = atomText.match(/Commit\/([0-9a-f]{40})/);
        if (m) {
          remoteCommit = m[1];
          remoteShort = remoteCommit.substring(0, 7);
        }
        const titles = [...atomText.matchAll(/<title>([\s\S]*?)<\/title>/g)].map(x => x[1].trim());
        if (titles[1]) commitMessage = titles[1];
        const dates = [...atomText.matchAll(/<updated>([\s\S]*?)<\/updated>/g)].map(x => x[1].trim());
        if (dates[0]) commitDate = dates[0];
      }
    } catch (_) {}

    // 2. Secondary: GitHub API commits
    if (!remoteShort) {
      try {
        const commitRes = await fetchRemote(`https://api.github.com/repos/${repo}/commits/${branch}`, { timeout: 6000 });
        if (commitRes.ok) {
          internetVerified = true;
          const commitData = await commitRes.json();
          if (commitData?.sha) {
            remoteCommit = commitData.sha;
            remoteShort = remoteCommit.substring(0, 7);
          }
          if (!commitMessage && commitData?.commit?.message) {
            commitMessage = commitData.commit.message.split('\n')[0];
          }
          if (!commitDate && commitData?.commit?.author?.date) {
            commitDate = commitData.commit.author.date;
          }
        }
      } catch (_) {}
    }

    // 3. Fetch remote package.json / config.json for semver (with cache buster)
    try {
      const rawRes = await fetchRemote(`https://raw.githubusercontent.com/${repo}/${remoteCommit || branch}/package.json?_t=${Date.now()}`, { timeout: 6000 });
      if (rawRes.ok) {
        internetVerified = true;
        const rawData = await rawRes.json();
        if (rawData?.version) remoteVer = rawData.version;
      }
    } catch (_) {}

    if (!remoteShort) {
      try {
        const rawCfgRes = await fetchRemote(`https://raw.githubusercontent.com/${repo}/${branch}/lead-machine/config.json?_t=${Date.now()}`, { timeout: 6000 });
        if (rawCfgRes.ok) {
          internetVerified = true;
          const rawCfg = await rawCfgRes.json();
          if (rawCfg?.settings?.buildCommit) {
            remoteCommit = rawCfg.settings.buildCommit;
            remoteShort = remoteCommit.substring(0, 7);
          }
          if (rawCfg?.settings?.version) remoteVer = rawCfg.settings.version;
        }
      } catch (_) {}
    }

    // 4. Fallback connectivity probe
    if (!internetVerified) {
      try {
        const probeRes = await fetchRemote('https://dns.google/resolve?name=github.com', { timeout: 4000 });
        if (probeRes.ok) {
          internetVerified = true;
        } else {
          isOffline = true;
        }
      } catch (_) {
        isOffline = true;
      }
    }

    if (remoteShort) {
      if (currentCommit && remoteShort && !remoteCommit.startsWith(currentCommit) && !currentCommit.startsWith(remoteShort)) {
        updateAvailable = true;
      } else if (remoteVer !== currentVer) {
        updateAvailable = true;
      }
    } else if (remoteVer && remoteVer !== currentVer) {
      updateAvailable = true;
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: true,
      repo,
      branch,
      channel: cfg.settings?.updateChannel || 'stable',
      version: currentVer,
      commit: currentCommit,
      latestVersion: remoteVer,
      latestCommit: remoteShort || currentCommit,
      commitMessage: commitMessage || 'Latest enterprise build verified with GitHub master.',
      commitDate,
      updateAvailable,
      offline: isOffline,
      checkedAt: new Date().toISOString()
    }));
    return;
  }

  if (pathname === '/api/system/update' && req.method === 'POST') {
    let body = {};
    try {
      const buffers = [];
      for await (const chunk of req) buffers.push(chunk);
      const raw = Buffer.concat(buffers).toString();
      if (raw) body = JSON.parse(raw);
    } catch (_) {}

    const repo = 'leadmachine-core/installer';
    const branch = 'main';

    try {
      let latestCommit = '';
      let remoteVer = '2.1.0';

      // 1. Resolve absolute latest HEAD of master branch (bypasses any intermediate commit)
      try {
        const atomRes = await fetchRemote(`https://github.com/${repo}/commits/${branch}.atom?_t=${Date.now()}`, { timeout: 6000 });
        if (atomRes.ok) {
          const atomText = await atomRes.text();
          const m = atomText.match(/Commit\/([0-9a-f]{40})/);
          if (m) latestCommit = m[1];
        }
      } catch (_) {}

      if (!latestCommit) {
        try {
          const cRes = await fetchRemote(`https://api.github.com/repos/${repo}/commits/${branch}`, { timeout: 6000 });
          if (cRes.ok) {
            const cData = await cRes.json();
            if (cData?.sha) latestCommit = cData.sha;
          }
        } catch (_) {}
      }

      // Check remote package.json for semver
      try {
        const pkgRes = await fetchRemote(`https://raw.githubusercontent.com/${repo}/${latestCommit || branch}/package.json?_t=${Date.now()}`, { timeout: 6000 });
        if (pkgRes.ok) {
          const pData = await pkgRes.json();
          if (pData?.version) remoteVer = pData.version;
        }
      } catch (_) {}

      const syncRef = latestCommit || branch;
      const shortCommit = latestCommit ? latestCommit.substring(0, 7) : branch;
      const baseUrl = `https://raw.githubusercontent.com/${repo}/${syncRef}`;
      const cacheBust = `?_nocache=${Date.now()}`;

      const filesToSync = [
        { remote: `${baseUrl}/lead-machine/server.mjs${cacheBust}`, local: path.join(__dirname, 'server.mjs') },
        { remote: `${baseUrl}/lead-machine/auth.mjs${cacheBust}`, local: path.join(__dirname, 'auth.mjs') },
        { remote: `${baseUrl}/lead-machine/hunter.mjs${cacheBust}`, local: path.join(__dirname, 'hunter.mjs') },
        { remote: `${baseUrl}/lead-machine/orchestrator.mjs${cacheBust}`, local: path.join(__dirname, 'orchestrator.mjs') },
        { remote: `${baseUrl}/lead-machine/worker.mjs${cacheBust}`, local: path.join(__dirname, 'worker.mjs') },
        { remote: `${baseUrl}/lead-machine/extractor_sync.mjs${cacheBust}`, local: path.join(__dirname, 'extractor_sync.mjs') },
        { remote: `${baseUrl}/lead-machine/reachability.mjs${cacheBust}`, local: path.join(__dirname, 'reachability.mjs') },
        { remote: `${baseUrl}/lead-machine/url_importer.mjs${cacheBust}`, local: path.join(__dirname, 'url_importer.mjs') },
        { remote: `${baseUrl}/lead-machine/public/index.html${cacheBust}`, local: path.join(__dirname, 'public', 'index.html') },
        { remote: `${baseUrl}/lead-machine/public/style.css${cacheBust}`, local: path.join(__dirname, 'public', 'style.css') },
        { remote: `${baseUrl}/lead-machine/public/app.js${cacheBust}`, local: path.join(__dirname, 'public', 'app.js') },
        { remote: `${baseUrl}/install.ps1${cacheBust}`, local: path.join(__dirname, '..', 'install.ps1') },
        { remote: `${baseUrl}/Launch_LeadMachine.bat${cacheBust}`, local: path.join(__dirname, '..', 'Launch_LeadMachine.bat') }
      ];

      const updatedFiles = [];
      for (const item of filesToSync) {
        try {
          const fileRes = await fetchRemote(item.remote);
          if (fileRes.ok) {
            const content = await fileRes.text();
            if (content && content.length > 50) {
              const dir = path.dirname(item.local);
              if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
              }
              fs.writeFileSync(item.local, content, 'utf8');
              updatedFiles.push(path.basename(item.local));
            }
          }
        } catch (fileErr) {
          console.error(`[Updater] Failed to sync ${item.remote}:`, fileErr.message);
        }
      }

      // Update config.json build metadata while preserving user profile & database
      const cfgPath = path.join(__dirname, 'config.json');
      if (fs.existsSync(cfgPath)) {
        try {
          const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
          if (!cfg.settings) cfg.settings = {};
          if (shortCommit) cfg.settings.buildCommit = shortCommit;
          if (remoteVer) cfg.settings.version = remoteVer;
          cfg.settings.lastUpdated = new Date().toISOString();
          fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2), 'utf8');
        } catch (_) {}
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        updatedCount: updatedFiles.length,
        updatedFiles,
        commit: shortCommit,
        message: `Successfully updated directly to latest master release (${shortCommit}).`
      }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: err.message }));
    }
    return;
  }

  // Leads List
  if (pathname === '/api/leads' && req.method === 'GET') {
    try {
      const db = orchestrator.getDb();
      const rows = db.prepare("SELECT id, company_name, website, phone, status, notes, failure_reason, debug_screenshot, created_at FROM leads ORDER BY id DESC").all();
      db.close();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, leads: rows }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: err.message }));
    }
    return;
  }

  // Bulk Website / Link Importer
  if (pathname === '/api/leads/import-urls' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        const rawText = payload.rawText || (Array.isArray(payload.urls) ? payload.urls.join('\n') : '');
        
        if (!rawText || typeof rawText !== 'string' || !rawText.trim()) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'No URLs or text provided for import.' }));
          return;
        }

        const parsed = parseRawWebsites(rawText);
        if (parsed.length === 0) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'No valid websites recognized in the provided input.' }));
          return;
        }

        const db = orchestrator.getDb();
        const result = importWebsitesToDb(db, parsed);
        db.close();

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          totalParsed: parsed.length,
          added: result.added,
          duplicatesSkipped: result.skippedDuplicates,
          leads: result.importedLeads
        }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  // Crawl Webpage or Directory URL for External Company Links
  if (pathname === '/api/leads/crawl-directory' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body || '{}');
        const targetUrl = (payload.url || '').trim();
        if (!targetUrl) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'A directory or webpage URL is required.' }));
          return;
        }

        const crawlResult = await crawlDirectoryPage(targetUrl);
        if (!crawlResult.success) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(crawlResult));
          return;
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          targetUrl: crawlResult.targetUrl,
          totalFound: crawlResult.totalFound,
          companies: crawlResult.companies
        }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  // Debug Screenshot Image Server
  if (pathname.startsWith('/api/debug/screenshot/') && req.method === 'GET') {
    const rawFile = pathname.replace('/api/debug/screenshot/', '');
    const filename = path.basename(rawFile);
    if (!filename || !filename.endsWith('.png')) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'Invalid screenshot filename.' }));
      return;
    }

    const shotPath = path.resolve(__dirname, '../data/debug_screenshots', filename);
    if (!fs.existsSync(shotPath)) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'Screenshot not found.' }));
      return;
    }

    try {
      const stat = fs.statSync(shotPath);
      res.writeHead(200, {
        'Content-Type': 'image/png',
        'Content-Length': stat.size,
        'Cache-Control': 'public, max-age=86400'
      });
      fs.createReadStream(shotPath).pipe(res);
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: err.message }));
    }
    return;
  }

  // System Settings (Debug Mode, Concurrency, etc.)
  if (pathname === '/api/settings' && req.method === 'GET') {
    const cfgPath = path.join(__dirname, 'config.json');
    let cfg = {};
    if (fs.existsSync(cfgPath)) {
      try { cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8')); } catch (_) {}
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, settings: cfg.settings || {} }));
    return;
  }

  if (pathname === '/api/settings' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        const cfgPath = path.join(__dirname, 'config.json');
        let cfg = {};
        if (fs.existsSync(cfgPath)) {
          try { cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8')); } catch (_) {}
        }
        if (!cfg.settings) cfg.settings = {};
        if (payload.debugMode !== undefined) cfg.settings.debugMode = Boolean(payload.debugMode);
        if (payload.defaultSpeedMode !== undefined) cfg.settings.defaultSpeedMode = payload.defaultSpeedMode;
        if (payload.sandboxMode !== undefined) cfg.settings.sandboxMode = Boolean(payload.sandboxMode);
        if (payload.concurrency !== undefined) cfg.settings.concurrency = Number(payload.concurrency);
        
        fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2));
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, settings: cfg.settings }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }


  // Leads CSV Export
  if (pathname === '/api/leads/export' && req.method === 'GET') {
    const auth = getAuthStatus();
    const limits = getTierLimits(auth.tier);
    if (limits.canExportCsv === false) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: false,
        error: `CSV database export is not permitted on ${limits.label} tier. Please upgrade to Pro or Enterprise.`
      }));
      return;
    }

    try {
      const db = orchestrator.getDb();
      const rows = db.prepare("SELECT id, company_name, website, phone, status, notes, created_at FROM leads ORDER BY id ASC").all();
      db.close();

      res.writeHead(200, {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="lead_machine_export.csv"'
      });

      res.write('ID,Company Name,Website,Phone,Status,Notes,Created At\r\n');
      for (const r of rows) {
        const line = [
          r.id,
          `"${(r.company_name || '').replace(/"/g, '""')}"`,
          `"${(r.website || '').replace(/"/g, '""')}"`,
          `"${(r.phone || '').replace(/"/g, '""')}"`,
          r.status,
          `"${(r.notes || '').replace(/"/g, '""')}"`,
          r.created_at
        ].join(',') + '\r\n';
        res.write(line);
      }
      res.end();
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: err.message }));
    }
    return;
  }


  if (pathname === '/api/import-leads' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body || '{}');
        const rows = payload.leads || [];
        const db = orchestrator.getDb();
        const insertStmt = db.prepare(`
          INSERT OR IGNORE INTO leads (company_name, website, city, state, phone, status, notes)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

        let skipped = 0;
        const validRows = [];
        for (const l of rows) {
          if (!l.website || !l.company_name) {
            skipped++;
            continue;
          }
          let web = l.website.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
          validRows.push({ ...l, website: web });
        }

        // Check reachability before marking as not_contacted
        const verified = await batchCheckWebsites(validRows, 15);

        let inserted = 0;
        let insertedReachable = 0;
        let insertedUnreachable = 0;

        const tx = db.transaction((leads) => {
          for (const l of leads) {
            const isAlive = l.reachability?.ok;
            const targetStatus = isAlive ? 'not_contacted' : 'unable_to_reach';
            const notes = isAlive ? 'Imported via Lead Machine' : `Imported (Unreachable: ${l.reachability?.reason || 'Dead site'})`;
            const info = insertStmt.run(l.company_name.trim(), l.website, l.city || null, l.state || null, l.phone || null, targetStatus, notes);
            if (info.changes > 0) {
              if (isAlive) insertedReachable++;
              else insertedUnreachable++;
              inserted++;
            } else {
              skipped++;
            }
          }
        });
        tx(verified);

        const newNotContacted = db.prepare("SELECT count(*) as c FROM leads WHERE status = 'not_contacted'").get().c;
        db.close();

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          inserted,
          insertedReachable,
          insertedUnreachable,
          skipped,
          totalNotContacted: newNotContacted
        }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  if (pathname === '/api/verify-reachability' && req.method === 'POST') {
    try {
      const db = orchestrator.getDb();
      const leads = db.prepare("SELECT id, website, notes FROM leads WHERE status = 'not_contacted' LIMIT 500").all();
      const verified = await batchCheckWebsites(leads, 20);

      let markedUnreachable = 0;
      let verifiedReachable = 0;
      const updateStmt = db.prepare("UPDATE leads SET status = 'unable_to_reach', notes = ? WHERE id = ?");

      const tx = db.transaction((items) => {
        for (const it of items) {
          if (!it.reachability?.ok) {
            const reason = it.reachability?.reason || 'Dead domain/404';
            const note = it.notes ? `${it.notes} | Unreachable: ${reason}` : `Unreachable: ${reason}`;
            updateStmt.run(note, it.id);
            markedUnreachable++;
          } else {
            verifiedReachable++;
          }
        }
      });
      tx(verified);

      const remainingNotContacted = db.prepare("SELECT count(*) as c FROM leads WHERE status = 'not_contacted'").get().c;
      db.close();

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        verifiedReachable,
        markedUnreachable,
        totalChecked: leads.length,
        totalNotContacted: remainingNotContacted
      }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: err.message }));
    }
    return;
  }

  if (pathname === '/api/retry-unable' && req.method === 'POST') {
    try {
      const db = orchestrator.getDb();
      const info = db.prepare("UPDATE leads SET status = 'not_contacted', notes = NULL WHERE status = 'unable_to_reach'").run();
      const notContacted = db.prepare("SELECT count(*) as c FROM leads WHERE status = 'not_contacted'").get().c;
      db.close();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, updated: info.changes, totalNotContacted: notContacted }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: err.message }));
    }
    return;
  }

  if (pathname === '/api/extractor-status' && req.method === 'GET') {
    const status = checkExtractorStatus();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, ...status }));
    return;
  }

  if (pathname === '/api/extractor-sync' && req.method === 'POST') {
    try {
      const result = await syncExtractorLeads();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: err.message }));
    }
    return;
  }

  // Static File Serving
  let filePath = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname);
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  const ext = path.extname(filePath);
  const mimeTypes = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.svg': 'image/svg+xml'
  };

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404);
        res.end('Not Found');
      } else {
        res.writeHead(500);
        res.end('Server Error: ' + err.code);
      }
    } else {
      res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'text/plain' });
      res.end(content);
    }
  });
});

// Start background license heartbeat check
try {
  startLicenseHeartbeat((reason) => {
    broadcastSSE({ type: 'auth_revoked', reason: reason || 'License suspended by administrator' });
  });
} catch (_) {}

server.listen(PORT, () => {
  console.log(`======================================================`);
  console.log(`🚀 LEAD MACHINE DASHBOARD ONLINE`);
  console.log(`📍 Web Interface: http://localhost:${PORT}`);
  console.log(`⚡ Zero-dependency native Node engine active`);
  console.log(`======================================================\n`);
});
