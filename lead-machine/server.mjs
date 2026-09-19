import http from 'http';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { orchestrator } from './orchestrator.mjs';
import { checkExtractorStatus, syncExtractorLeads } from './extractor_sync.mjs';
import { batchCheckWebsites } from './reachability.mjs';
import { leadHunter } from './hunter.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3333;
const PUBLIC_DIR = path.join(__dirname, 'public');

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

  // SSE Stream
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

  // API Endpoints
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
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body || '{}');
        leadHunter.startHunting({
          query: payload.query || 'Manufacturing',
          state: payload.state || 'Illinois',
          city: payload.city || '',
          limit: payload.limit || 20,
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
    const currentVer = cfg.settings?.version || '2.0.0';
    const currentCommit = cfg.settings?.buildCommit || '301ab6c';
    const repo = 'itskodaaa/LeadMachine';
    const branch = 'master';

    let remoteCommit = null;
    let remoteShort = null;
    let commitMessage = null;
    let commitDate = null;
    let remoteVer = currentVer;
    let updateAvailable = false;
    let isOffline = false;

    try {
      // 1. Query latest commit via GitHub API
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 10000);
      const commitRes = await fetch(`https://api.github.com/repos/${repo}/commits/${branch}`, {
        headers: {
          'User-Agent': 'LeadMachine-Enterprise-Updater',
          'Accept': 'application/vnd.github.v3+json'
        },
        signal: controller.signal
      });
      clearTimeout(timer);

      if (commitRes.ok) {
        const commitData = await commitRes.json();
        remoteCommit = commitData.sha || '';
        remoteShort = remoteCommit.substring(0, 7);
        commitMessage = commitData.commit?.message?.split('\n')[0] || '';
        commitDate = commitData.commit?.author?.date || '';
      }
    } catch (_) {
      // API check timed out or offline
    }

    // 2. Fetch remote package.json to verify semver
    try {
      const rawRes = await fetch(`https://raw.githubusercontent.com/${repo}/${branch}/package.json`, {
        headers: { 'User-Agent': 'LeadMachine-Enterprise-Updater' },
        signal: AbortSignal.timeout(10000)
      });
      if (rawRes.ok) {
        const rawData = await rawRes.json();
        if (rawData.version) remoteVer = rawData.version;
      }
    } catch (_) {}

    if (remoteShort) {
      if (currentCommit && remoteShort && !remoteCommit.startsWith(currentCommit)) {
        updateAvailable = true;
      } else if (remoteVer !== currentVer) {
        updateAvailable = true;
      }
    } else {
      isOffline = true;
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
      commitMessage: commitMessage || 'Latest enterprise build verified.',
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

    const repo = 'itskodaaa/LeadMachine';
    const branch = 'master';
    const baseUrl = `https://raw.githubusercontent.com/${repo}/${branch}`;

    const filesToSync = [
      { remote: `${baseUrl}/lead-machine/server.mjs`, local: path.join(__dirname, 'server.mjs') },
      { remote: `${baseUrl}/lead-machine/hunter.mjs`, local: path.join(__dirname, 'hunter.mjs') },
      { remote: `${baseUrl}/lead-machine/orchestrator.mjs`, local: path.join(__dirname, 'orchestrator.mjs') },
      { remote: `${baseUrl}/lead-machine/worker.mjs`, local: path.join(__dirname, 'worker.mjs') },
      { remote: `${baseUrl}/lead-machine/extractor_sync.mjs`, local: path.join(__dirname, 'extractor_sync.mjs') },
      { remote: `${baseUrl}/lead-machine/reachability.mjs`, local: path.join(__dirname, 'reachability.mjs') },
      { remote: `${baseUrl}/lead-machine/public/index.html`, local: path.join(__dirname, 'public', 'index.html') },
      { remote: `${baseUrl}/lead-machine/public/style.css`, local: path.join(__dirname, 'public', 'style.css') },
      { remote: `${baseUrl}/lead-machine/public/app.js`, local: path.join(__dirname, 'public', 'app.js') },
      { remote: `${baseUrl}/install.ps1`, local: path.join(__dirname, '..', 'install.ps1') },
      { remote: `${baseUrl}/Launch_LeadMachine.bat`, local: path.join(__dirname, '..', 'Launch_LeadMachine.bat') }
    ];

    try {
      let latestCommit = body.commit || '';
      if (!latestCommit) {
        try {
          const cRes = await fetch(`https://api.github.com/repos/${repo}/commits/${branch}`, {
            headers: { 'User-Agent': 'LeadMachine-Enterprise-Updater' },
            signal: AbortSignal.timeout(10000)
          });
          if (cRes.ok) {
            const cData = await cRes.json();
            latestCommit = (cData.sha || '').substring(0, 7);
          }
        } catch (_) {}
      }

      const updatedFiles = [];
      for (const item of filesToSync) {
        try {
          const fileRes = await fetch(item.remote, {
            headers: { 'User-Agent': 'LeadMachine-Enterprise-Updater' },
            signal: AbortSignal.timeout(8000)
          });
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
          if (latestCommit) cfg.settings.buildCommit = latestCommit;
          cfg.settings.lastUpdated = new Date().toISOString();
          fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2), 'utf8');
        } catch (_) {}
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        updatedCount: updatedFiles.length,
        updatedFiles,
        commit: latestCommit,
        message: `Successfully synchronized ${updatedFiles.length} core application files from master branch (${latestCommit || 'latest'}).`
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
      const rows = db.prepare("SELECT id, company_name, website, phone, status, notes, created_at FROM leads ORDER BY id DESC").all();
      db.close();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, leads: rows }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: err.message }));
    }
    return;
  }

  // Leads CSV Export
  if (pathname === '/api/leads/export' && req.method === 'GET') {
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

server.listen(PORT, () => {
  console.log(`======================================================`);
  console.log(`🚀 LEAD MACHINE DASHBOARD ONLINE`);
  console.log(`📍 Web Interface: http://localhost:${PORT}`);
  console.log(`⚡ Zero-dependency native Node engine active`);
  console.log(`======================================================\n`);
});
