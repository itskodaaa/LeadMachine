import { spawn, execSync } from 'child_process';
import Database from 'better-sqlite3';
import EventEmitter from 'events';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { leadHunter } from './hunter.mjs';
import { migrateDatabase } from './db_migration.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.resolve(__dirname, '../data/leads.db');

export class CampaignOrchestrator extends EventEmitter {
  constructor() {
    super();
    this.status = 'idle'; // 'idle' | 'running' | 'paused' | 'stopped' | 'completed'
    this.targetTotal = 0;
    this.processedTotal = 0;
    this.contactedTotal = 0;
    this.unableTotal = 0;
    this.currentWave = 0;
    this.numWorkers = 8;
    this.isSandbox = false;
    this.isHeaded = false;
    this.startTime = null;
    this.recentEvents = [];
    this.activeChildren = new Set();
    this.shouldStop = false;
    this.isPaused = false;
  }

  getDb() {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('busy_timeout = 10000');
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
        status TEXT DEFAULT 'not_contacted',
        notes TEXT,
        failure_reason TEXT,
        debug_screenshot TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS contact_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        lead_id INTEGER NOT NULL,
        action TEXT NOT NULL,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
      );
    `);
    migrateDatabase(db);
    return db;
  }

  checkAndKillMail() {
    if (process.platform === 'darwin') {
      try {
        const res = execSync('pgrep -x "Mail" || true', { encoding: 'utf8' }).trim();
        if (res) {
          execSync('pkill -9 -x "Mail" || true');
        }
      } catch (_) {}
    }
  }

  cleanTempProfiles() {
    try {
      const tmp = os.tmpdir();
      const files = fs.readdirSync(tmp);
      for (const f of files) {
        if (f.startsWith('leadmachine_w')) {
          try {
            fs.rmSync(path.join(tmp, f), { recursive: true, force: true });
          } catch (_) {}
        }
      }
    } catch (_) {}
  }

  recordEvent(event) {
    event.timestamp = new Date().toISOString();
    this.recentEvents.unshift(event);
    if (this.recentEvents.length > 150) this.recentEvents.pop();
    this.emit('telemetry', event);
  }

  getStatus() {
    const elapsedSec = this.startTime ? (Date.now() - this.startTime) / 1000 : 0;
    const speed = elapsedSec > 5 ? Number(((this.processedTotal / elapsedSec) * 60).toFixed(1)) : 0;
    const progressPercent = this.targetTotal > 0 ? Math.min(100, Number(((this.processedTotal / this.targetTotal) * 100).toFixed(1))) : 0;
    const conversionRate = this.processedTotal > 0 ? Number(((this.contactedTotal / this.processedTotal) * 100).toFixed(1)) : 0;

    let dbTotal = 0, dbNotContacted = 0, dbContacted = 0;
    try {
      const db = this.getDb();
      dbTotal = db.prepare("SELECT count(*) as c FROM leads").get().c;
      dbNotContacted = db.prepare("SELECT count(*) as c FROM leads WHERE status = 'not_contacted'").get().c;
      dbContacted = db.prepare("SELECT count(*) as c FROM leads WHERE status = 'contacted'").get().c;
      db.close();
    } catch (_) {}

    return {
      status: this.status,
      targetTotal: this.targetTotal,
      processedTotal: this.processedTotal,
      contactedTotal: this.contactedTotal,
      unableTotal: this.unableTotal,
      currentWave: this.currentWave,
      numWorkers: this.numWorkers,
      isSandbox: this.isSandbox,
      progressPercent,
      conversionRate,
      speedLeadsPerMin: speed,
      elapsedSeconds: Math.round(elapsedSec),
      recentEvents: this.recentEvents.slice(0, 50),
      dbStats: {
        total: dbTotal,
        notContacted: dbNotContacted,
        contacted: dbContacted
      }
    };
  }

  async startCampaign(options = {}) {
    if (this.status === 'running') {
      throw new Error('A campaign is already currently running.');
    }

    const {
      targetLeads = 100,
      numWorkers = 8,
      isSandbox = false,
      isHeaded = false,
      stateFilter = null,
      profile = null,
      category = 'Manufacturing',
      autoScrape = true
    } = options;

    if (isHeaded && targetLeads > 10) {
      throw new Error('Visual debugging mode (headed) is limited to a maximum of 10 leads to avoid opening too many browser windows.');
    }

    // Save custom profile to config.json if provided
    if (profile) {
      try {
        const cfgPath = path.join(__dirname, 'config.json');
        let currentCfg = {};
        if (fs.existsSync(cfgPath)) currentCfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
        currentCfg.sender = { ...(currentCfg.sender || {}), ...profile };
        fs.writeFileSync(cfgPath, JSON.stringify(currentCfg, null, 2));
      } catch (err) {
        console.error('Failed to save profile config:', err.message);
      }
    }

    this.status = 'running';
    this.targetTotal = targetLeads;
    this.processedTotal = 0;
    this.contactedTotal = 0;
    this.unableTotal = 0;
    this.currentWave = 0;
    this.isHeaded = Boolean(isHeaded);
    this.numWorkers = this.isHeaded ? Math.min(2, Math.max(1, numWorkers)) : Math.max(1, Math.min(16, numWorkers));
    this.isSandbox = Boolean(isSandbox);
    this.startTime = Date.now();
    this.shouldStop = false;
    this.isPaused = false;
    this.recentEvents = [];

    this.recordEvent({
      type: 'campaign_started',
      message: `Campaign started for ${this.targetTotal} leads with ${this.numWorkers} workers (sandbox=${this.isSandbox}, headed=${this.isHeaded})`
    });

    // Check available uncontacted leads vs target volume
    try {
      const dbCheck = this.getDb();
      let uncontactedCount = 0;
      if (stateFilter && stateFilter !== 'all') {
        uncontactedCount = dbCheck.prepare("SELECT count(*) as c FROM leads WHERE status = 'not_contacted' AND state = ?").get(stateFilter)?.c || 0;
      } else {
        uncontactedCount = dbCheck.prepare("SELECT count(*) as c FROM leads WHERE status = 'not_contacted'").get()?.c || 0;
      }
      dbCheck.close();

      const deficit = this.targetTotal - uncontactedCount;
      if (deficit > 0 && autoScrape !== false) {
        const huntTargetState = stateFilter && stateFilter !== 'all' ? stateFilter : 'United States';
        const huntQuery = category || 'Manufacturing';
        const huntLimit = Math.min(100000, Math.max(deficit, 15));

        this.recordEvent({
          type: 'autohunt_triggered',
          message: `⚡ Deficit detected: Database has ${uncontactedCount} uncontacted leads (${deficit} short of ${this.targetTotal}). Autonomous Lead Hunter engaged in background for ${huntLimit} fresh leads (${huntQuery} in ${huntTargetState}).`
        });

        if (leadHunter.getStatus().status !== 'running') {
          leadHunter.startHunting({
            query: huntQuery,
            state: huntTargetState,
            limit: huntLimit,
            onEvent: (evt) => {
              if (evt.type === 'lead_verified') {
                this.recordEvent({
                  type: 'autohunt_lead',
                  message: `⚡ Auto-Scraped Lead: ${evt.lead?.company || 'Verified Company'} (${evt.lead?.website || ''})`
                });
              }
            }
          }).catch(err => {
            console.error('[Orchestrator] Autonomous Lead Hunter background error:', err.message);
          });
        }
      }
    } catch (checkErr) {
      console.error('[Orchestrator] Lead deficit check error:', checkErr.message);
    }

    // Run in background loop
    this.runLoop(stateFilter, category).catch(err => {
      console.error('Campaign Loop Fatal Error:', err);
      this.status = 'stopped';
      this.recordEvent({ type: 'campaign_error', message: err.message });
    });

    return this.getStatus();
  }

  async runLoop(stateFilter, category) {
    const BATCH_PER_WORKER = 10;
    const WAVE_SIZE = this.numWorkers * BATCH_PER_WORKER;

    while (this.processedTotal < this.targetTotal && !this.shouldStop) {
      if (this.isPaused) {
        await new Promise(r => setTimeout(r, 1000));
        continue;
      }

      this.currentWave++;
      const needed = this.targetTotal - this.processedTotal;
      const fetchLimit = Math.min(WAVE_SIZE, needed);

      const db = this.getDb();
      let query = "SELECT id, company_name, website FROM leads WHERE status = 'not_contacted'";
      const params = [];
      if (stateFilter && stateFilter !== 'all') {
        query += " AND state = ?";
        params.push(stateFilter);
      }
      query += " ORDER BY id ASC LIMIT ?";
      params.push(fetchLimit);

      let leads = db.prepare(query).all(...params);
      db.close();

      if (leads.length === 0) {
        // If leads in DB are temporarily exhausted, check if leadHunter is running
        if (leadHunter.getStatus().status === 'running') {
          this.recordEvent({
            type: 'autohunt_waiting',
            message: `⚡ Database leads exhausted for current wave. Waiting for background Lead Hunter to discover more leads... (${this.processedTotal}/${this.targetTotal} contacted)`
          });

          let waitCycles = 0;
          let foundFresh = false;
          while (leadHunter.getStatus().status === 'running' && waitCycles < 25 && !this.shouldStop) {
            await new Promise(r => setTimeout(r, 2000));
            waitCycles++;
            const dbPoll = this.getDb();
            const countCheck = stateFilter && stateFilter !== 'all'
              ? (dbPoll.prepare("SELECT count(*) as c FROM leads WHERE status = 'not_contacted' AND state = ?").get(stateFilter)?.c || 0)
              : (dbPoll.prepare("SELECT count(*) as c FROM leads WHERE status = 'not_contacted'").get()?.c || 0);
            dbPoll.close();
            if (countCheck > 0) {
              foundFresh = true;
              break;
            }
          }

          if (foundFresh && !this.shouldStop) {
            const dbRefetch = this.getDb();
            leads = dbRefetch.prepare(query).all(...params);
            dbRefetch.close();
          }
        }

        if (leads.length === 0) {
          this.recordEvent({
            type: 'notice',
            message: 'No more uncontacted leads available matching criteria in database.'
          });
          break;
        }
      }

      this.recordEvent({
        type: 'wave_started',
        wave: this.currentWave,
        leadsCount: leads.length,
        message: `Starting Wave ${this.currentWave}: ${leads.length} leads across ${this.numWorkers} workers`
      });

      this.checkAndKillMail();

      // Partition among workers
      const numWorkersToUse = Math.min(this.numWorkers, Math.ceil(leads.length / BATCH_PER_WORKER));
      const batchSize = Math.ceil(leads.length / numWorkersToUse);
      const batches = [];
      for (let i = 0; i < numWorkersToUse; i++) {
        const b = leads.slice(i * batchSize, (i + 1) * batchSize);
        if (b.length > 0) batches.push(b);
      }

      const promises = batches.map((batch, idx) => {
        const workerId = idx + 1;
        const leadIds = batch.map(l => l.id).join(',');
        const args = [path.join(__dirname, 'worker.mjs'), String(workerId), leadIds];
        if (this.isSandbox) args.push('--sandbox');
        if (this.isHeaded) args.push('--headed');

        return new Promise((resolve) => {
          const child = spawn(process.execPath, args, {
            stdio: ['ignore', 'pipe', 'pipe']
          });
          this.activeChildren.add(child);

          child.stderr.on('data', (d) => {
            const str = d.toString().trim();
            if (str) {
              console.error(`[Worker ${workerId} STDERR]`, str);
            }
          });

          child.stdout.on('data', (d) => {
            const lines = d.toString().split('\n');
            for (const line of lines) {
              if (line.startsWith('EVENT_LEAD_RESULT:')) {
                try {
                  const res = JSON.parse(line.substring('EVENT_LEAD_RESULT:'.length));
                  this.processedTotal++;
                  if (res.status === 'contacted') this.contactedTotal++;
                  else this.unableTotal++;

                  this.recordEvent({
                    type: 'lead_result',
                    leadId: res.id,
                    company: res.company,
                    status: res.status,
                    result: res.result,
                    time: res.time || '10.0'
                  });
                } catch (_) {}
              }
            }
          });

          child.on('close', (code) => {
            this.activeChildren.delete(child);
            resolve({ workerId, code });
          });

          child.on('error', (err) => {
            console.error(`[Worker ${workerId} ERROR]`, err);
            this.activeChildren.delete(child);
            resolve({ workerId, code: 1 });
          });
        });
      });

      await Promise.all(promises);

      this.checkAndKillMail();
      this.cleanTempProfiles();

      this.recordEvent({
        type: 'wave_completed',
        wave: this.currentWave,
        message: `Wave ${this.currentWave} finished. Total processed so far: ${this.processedTotal}/${this.targetTotal}`
      });

      if (this.processedTotal < this.targetTotal && !this.shouldStop) {
        await new Promise(r => setTimeout(r, 2000));
      }
    }

    this.status = this.shouldStop ? 'stopped' : 'completed';
    this.recordEvent({
      type: 'campaign_finished',
      message: `Campaign ${this.status}! Processed: ${this.processedTotal}, Confirmed Contacted: ${this.contactedTotal}, Unable: ${this.unableTotal}`
    });
  }

  pauseCampaign() {
    if (this.status === 'running') {
      this.isPaused = true;
      this.status = 'paused';
      this.recordEvent({ type: 'campaign_paused', message: 'Campaign paused by user.' });
    }
  }

  resumeCampaign() {
    if (this.status === 'paused') {
      this.isPaused = false;
      this.status = 'running';
      this.recordEvent({ type: 'campaign_resumed', message: 'Campaign resumed by user.' });
    }
  }

  stopCampaign() {
    this.shouldStop = true;
    this.status = 'stopped';
    for (const child of this.activeChildren) {
      try { child.kill('SIGTERM'); } catch (_) {}
    }
    this.activeChildren.clear();
    this.recordEvent({ type: 'campaign_stopped', message: 'Campaign stopped by user.' });
  }
}

// Export singleton
export const orchestrator = new CampaignOrchestrator();
