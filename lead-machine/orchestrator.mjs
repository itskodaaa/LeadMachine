import { spawn, execSync } from 'child_process';
import Database from 'better-sqlite3';
import EventEmitter from 'events';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { leadHunter } from './hunter.mjs';
import { migrateDatabase, applyPerformancePragmas } from './db_migration.mjs';
import { resourceGovernor } from './resource_governor.mjs';

import { getDbPath, getConfigPath } from './paths.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const getDatabasePath = () => getDbPath();

export class CampaignOrchestrator extends EventEmitter {
  constructor() {
    super();
    this.status = 'idle'; // 'idle' | 'running' | 'paused' | 'stopped' | 'completed'
    this.targetTotal = 0;
    this.processedTotal = 0;
    this.contactedTotal = 0;
    this.unableTotal = 0;
    this.currentWave = 0;
    this.numWorkers = 6;
    this.configuredWorkers = 6;
    this.targetWorkers = 4;
    this.lastReportedTargetWorkers = null;
    this.isSandbox = false;
    this.isHeaded = false;
    this.startTime = null;
    this.recentEvents = [];
    this.activeChildren = new Set();
    this.shouldStop = false;
    this.isPaused = false;
    this.cachedDb = null;
    this.cachedDbPath = null;
    this.schemaInitializedPath = null;
  }

  getDb() {
    const activeDb = getDatabasePath();
    if (this.cachedDb && this.cachedDb.open && this.cachedDbPath === activeDb) {
      return this.cachedDb;
    }
    if (this.cachedDb && this.cachedDb.open) {
      try { this.cachedDb.close(); } catch (_) {}
    }
    const dir = path.dirname(activeDb);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const db = new Database(activeDb);
    applyPerformancePragmas(db);
    if (!this.schemaInitializedPath || this.schemaInitializedPath !== activeDb) {
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
      this.schemaInitializedPath = activeDb;
    }
    this.cachedDb = db;
    this.cachedDbPath = activeDb;
    return db;
  }

  closeDb() {
    if (this.cachedDb && this.cachedDb.open) {
      try {
        this.cachedDb.pragma('wal_checkpoint(TRUNCATE)');
        this.cachedDb.close();
      } catch (_) {}
      this.cachedDb = null;
    }
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

    let isAdaptive = this.adaptiveMode !== false;
    if (this.status === 'idle') {
      try {
        const cfgPath = getConfigPath();
        if (fs.existsSync(cfgPath)) {
          const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
          if (cfg.settings?.adaptiveMode !== undefined) isAdaptive = Boolean(cfg.settings.adaptiveMode);
        }
      } catch (_) {}
    }

    const gov = resourceGovernor.evaluateConcurrency(this.configuredWorkers || this.numWorkers || 6);

    return {
      status: this.status,
      targetTotal: this.targetTotal,
      processedTotal: this.processedTotal,
      contactedTotal: this.contactedTotal,
      unableTotal: this.unableTotal,
      currentWave: this.currentWave,
      numWorkers: Math.max(1, this.activeChildren.size || this.targetWorkers || this.numWorkers),
      configuredWorkers: this.configuredWorkers || this.numWorkers,
      adaptiveConcurrency: {
        enabled: isAdaptive,
        activeWorkers: this.activeChildren.size,
        targetWorkers: isAdaptive ? gov.targetWorkers : (this.configuredWorkers || this.numWorkers),
        configuredWorkers: this.configuredWorkers || this.numWorkers,
        freeMb: gov.freeMb,
        totalMb: gov.totalMb,
        usagePct: gov.usagePct,
        loadPerCore: gov.loadPerCore,
        safetyBufferMb: gov.safetyBufferMb,
        pressureLevel: gov.pressureLevel,
        reason: isAdaptive ? gov.reason : `Adaptive Mode disabled: Running at fixed concurrency (${this.configuredWorkers || this.numWorkers} workers).`
      },
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
      autoScrape = true,
      adaptiveMode = undefined
    } = options;

    if (isHeaded && targetLeads > 10) {
      throw new Error('Visual debugging mode (headed) is limited to a maximum of 10 leads to avoid opening too many browser windows.');
    }

    // Save custom profile to config.json if provided
    if (profile) {
      try {
        const cfgPath = getConfigPath();
        fs.mkdirSync(path.dirname(cfgPath), { recursive: true });
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
    this.configuredWorkers = this.isHeaded ? Math.min(2, Math.max(1, numWorkers)) : Math.max(1, Math.min(16, numWorkers));

    let isAdaptive = true;
    if (adaptiveMode !== undefined) {
      isAdaptive = Boolean(adaptiveMode);
    } else {
      try {
        const cfgPath = getConfigPath();
        if (fs.existsSync(cfgPath)) {
          const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
          if (cfg.settings?.adaptiveMode !== undefined) isAdaptive = Boolean(cfg.settings.adaptiveMode);
        }
      } catch (_) {}
    }
    this.adaptiveMode = isAdaptive;

    if (this.adaptiveMode) {
      const initialGov = resourceGovernor.evaluateConcurrency(this.configuredWorkers);
      this.targetWorkers = initialGov.targetWorkers;
    } else {
      this.targetWorkers = this.configuredWorkers;
    }
    this.numWorkers = this.targetWorkers;
    this.lastReportedTargetWorkers = this.targetWorkers;
    this.isSandbox = Boolean(isSandbox);
    this.startTime = Date.now();
    this.shouldStop = false;
    this.isPaused = false;
    this.recentEvents = [];

    this.recordEvent({
      type: 'campaign_started',
      message: this.adaptiveMode 
        ? `Campaign started for ${this.targetTotal} leads (Adaptive Governor: cap ${this.configuredWorkers}, initial ${this.targetWorkers} workers)`
        : `Campaign started for ${this.targetTotal} leads (Fixed manual worker count: ${this.configuredWorkers} workers)`
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
    const MICRO_BATCH_SIZE = 3; // Agile micro-batches release memory to OS continuously

    while (this.processedTotal < this.targetTotal && !this.shouldStop) {
      if (this.isPaused) {
        await new Promise(r => setTimeout(r, 1000));
        continue;
      }

      this.currentWave++;
      const needed = this.targetTotal - this.processedTotal;

      // Evaluate concurrency before starting wave
      let gov = null;
      if (this.adaptiveMode) {
        gov = resourceGovernor.evaluateConcurrency(this.configuredWorkers);
        this.targetWorkers = gov.targetWorkers;
      } else {
        this.targetWorkers = this.configuredWorkers;
      }
      const WAVE_SIZE = Math.max(MICRO_BATCH_SIZE, this.targetWorkers * MICRO_BATCH_SIZE * 2);
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

      const ramInfo = gov ? `, ${gov.freeMb}MB free RAM` : '';
      this.recordEvent({
        type: 'wave_started',
        wave: this.currentWave,
        leadsCount: leads.length,
        message: `Starting Wave ${this.currentWave}: ${leads.length} leads (${this.adaptiveMode ? 'Adaptive' : 'Manual'} Target: ${this.targetWorkers} browsers${ramInfo})`
      });

      this.checkAndKillMail();

      // Chunk wave into lean micro-batches
      const queue = [];
      for (let i = 0; i < leads.length; i += MICRO_BATCH_SIZE) {
        queue.push(leads.slice(i, i + MICRO_BATCH_SIZE));
      }

      let workerSeq = 0;
      const activeWorkerPromises = new Map();

      // Dynamic worker pool: adapts worker concurrency on the fly
      while ((queue.length > 0 || activeWorkerPromises.size > 0) && !this.shouldStop) {
        if (this.isPaused) {
          await new Promise(r => setTimeout(r, 1000));
          continue;
        }

        if (this.adaptiveMode) {
          // Real-time resource evaluation on every dispatch
          const liveGov = resourceGovernor.evaluateConcurrency(this.configuredWorkers);
          this.targetWorkers = liveGov.targetWorkers;
          this.numWorkers = Math.max(1, activeWorkerPromises.size || this.targetWorkers);

          if (this.lastReportedTargetWorkers !== liveGov.targetWorkers) {
            this.recordEvent({
              type: 'concurrency_scaled',
              activeWorkers: activeWorkerPromises.size,
              targetWorkers: liveGov.targetWorkers,
              freeMb: liveGov.freeMb,
              pressureLevel: liveGov.pressureLevel,
              reason: liveGov.reason,
              message: `⚡ Adaptive Governor: Concurrency adjusted to ${liveGov.targetWorkers} browser(s) (${liveGov.freeMb}MB free RAM). ${liveGov.reason}`
            });
            this.emitTelemetry('concurrency_scaled', {
              enabled: true,
              activeWorkers: activeWorkerPromises.size,
              allocatedWorkers: liveGov.targetWorkers,
              configuredWorkers: this.configuredWorkers,
              freeMemMb: liveGov.freeMb,
              pressure: liveGov.pressureLevel,
              reason: liveGov.reason
            });
            this.lastReportedTargetWorkers = liveGov.targetWorkers;
          }
        } else {
          this.targetWorkers = this.configuredWorkers;
          this.numWorkers = Math.max(1, activeWorkerPromises.size || this.targetWorkers);
        }

        // Spawn workers up to live targetWorkers ceiling
        while (activeWorkerPromises.size < this.targetWorkers && queue.length > 0 && !this.shouldStop) {
          const batch = queue.shift();
          workerSeq++;
          const currentSeq = workerSeq;
          const workerId = (currentSeq % 16) + 1;
          const leadIds = batch.map(l => l.id).join(',');
          const args = [path.join(__dirname, 'worker.mjs'), String(workerId), leadIds];
          if (this.isSandbox) args.push('--sandbox');
          if (this.isHeaded) args.push('--headed');

          const workerPromise = new Promise((resolve) => {
            const child = spawn(process.execPath, args, {
              stdio: ['ignore', 'pipe', 'pipe']
            });
            this.activeChildren.add(child);

            child.stderr.on('data', (d) => {
              const str = d.toString().trim();
              if (str) console.error(`[Worker ${workerId} STDERR]`, str);
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
              activeWorkerPromises.delete(currentSeq);
              resolve({ workerId, code });
            });

            child.on('error', (err) => {
              console.error(`[Worker ${workerId} ERROR]`, err);
              this.activeChildren.delete(child);
              activeWorkerPromises.delete(currentSeq);
              resolve({ workerId, code: 1 });
            });
          });

          activeWorkerPromises.set(currentSeq, workerPromise);
        }

        // Wait for at least one worker to finish if at ceiling or queue drained
        if (activeWorkerPromises.size >= this.targetWorkers || (queue.length === 0 && activeWorkerPromises.size > 0)) {
          await Promise.race(activeWorkerPromises.values());
        }

        // Clean temp profiles periodically to free disk/RAM immediately
        this.cleanTempProfiles();

        // Brief yield
        await new Promise(r => setTimeout(r, 100));
      }

      this.checkAndKillMail();
      this.cleanTempProfiles();

      this.recordEvent({
        type: 'wave_completed',
        wave: this.currentWave,
        message: `Wave ${this.currentWave} finished. Total processed so far: ${this.processedTotal}/${this.targetTotal}`
      });

      if (this.processedTotal < this.targetTotal && !this.shouldStop) {
        await new Promise(r => setTimeout(r, 1500));
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
