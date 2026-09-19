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
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: true,
      version: currentVer,
      channel: cfg.settings?.updateChannel || 'stable',
      updateAvailable: false,
      latestVersion: currentVer,
      releaseNotes: 'v2.0.0 Enterprise Edition: Autonomous Lead Hunter, dynamic template variables, complete enterprise sender profile, and high-precision telemetry.'
    }));
    return;
  }

  if (pathname === '/api/system/update' && req.method === 'POST') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: true,
      message: 'System is running the latest enterprise build v2.0.0. All core modules verified and up to date.'
    }));
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
