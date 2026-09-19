import { spawn, execSync } from 'child_process';
import Database from 'better-sqlite3';
import fs from 'fs';

const BATCH_SIZE_PER_WORKER = 10;
const NUM_WORKERS = 10;
const WAVE_LIMIT = BATCH_SIZE_PER_WORKER * NUM_WORKERS; // 100 leads per wave

function getDb() {
  const db = new Database('data/leads.db');
  db.pragma('journal_mode = WAL');
  db.pragma('busy_timeout = 10000');
  return db;
}

function checkAndKillMail() {
  try {
    const res = execSync('pgrep -x "Mail" || true', { encoding: 'utf8' }).trim();
    if (res) {
      console.log('⚠️ Mail.app detected running, terminating immediately...');
      execSync('pkill -9 -x "Mail" || true');
    }
  } catch (_) {}
}

function cleanTempProfiles() {
  try {
    execSync('rm -rf /tmp/chrome_w* /tmp/puppeteer_dev_chrome_profile* 2>/dev/null || true');
  } catch (_) {}
}

async function runWave(waveNum) {
  const db = getDb();
  const initialContacted = db.prepare("SELECT count(*) as c FROM leads WHERE status = 'contacted'").get().c;
  const remainingCount = db.prepare("SELECT count(*) as c FROM leads WHERE status = 'not_contacted'").get().c;

  if (remainingCount === 0) {
    db.close();
    return { done: true };
  }

  const leads = db.prepare(`
    SELECT id, company_name, website 
    FROM leads 
    WHERE status = 'not_contacted' 
    ORDER BY id ASC 
    LIMIT ?
  `).all(WAVE_LIMIT);

  db.close();

  if (leads.length === 0) {
    return { done: true };
  }

  console.log(`\n======================================================`);
  console.log(`🌊 Starting Wave ${waveNum}`);
  console.log(`📊 Current Contacted: ${initialContacted} | Remaining Not Contacted: ${remainingCount}`);
  console.log(`🎯 Processing ${leads.length} leads: IDs ${leads[0].id}..${leads[leads.length - 1].id}`);
  console.log(`======================================================\n`);

  checkAndKillMail();

  const numWorkersToUse = Math.min(NUM_WORKERS, Math.ceil(leads.length / BATCH_SIZE_PER_WORKER));
  const batchSize = Math.ceil(leads.length / numWorkersToUse);
  const batches = [];
  for (let i = 0; i < numWorkersToUse; i++) {
    const b = leads.slice(i * batchSize, (i + 1) * batchSize);
    if (b.length > 0) batches.push(b);
  }

  const promises = batches.map((batch, idx) => {
    const workerId = idx + 1;
    const leadIds = batch.map(l => l.id).join(',');

    return new Promise((resolve) => {
      const child = spawn('node', ['scripts/run_agent_worker.mjs', String(workerId), leadIds], {
        stdio: ['ignore', 'pipe', 'pipe']
      });

      child.stdout.on('data', (d) => {
        const lines = d.toString().split('\n').filter(Boolean);
        for (const line of lines) {
          if (line.includes('SUCCESS') || line.includes('contacted') || line.includes('Confirmed') || line.includes('Completed')) {
            console.log(`[W${workerId}] ${line}`);
          }
        }
      });

      child.stderr.on('data', (d) => {
        const str = d.toString();
        if (str.includes('FATAL') || str.includes('UnhandledPromiseRejection')) {
          console.error(`[W${workerId} ERR] ${str.trim()}`);
        }
      });

      child.on('close', (code) => {
        resolve({ workerId, code });
      });

      child.on('error', (err) => {
        console.error(`[W${workerId} PROCESS ERR]`, err.message);
        resolve({ workerId, code: 1 });
      });
    });
  });

  await Promise.all(promises);

  checkAndKillMail();
  cleanTempProfiles();

  const verifyDb = getDb();
  const allIds = leads.map(l => l.id);
  const placeholders = allIds.map(() => '?').join(',');
  const updated = verifyDb.prepare(`
    SELECT id, company_name, website, status, notes 
    FROM leads 
    WHERE id IN (${placeholders})
  `).all(...allIds);

  const waveContacted = updated.filter(l => l.status === 'contacted');
  const finalTotalContacted = verifyDb.prepare("SELECT count(*) as c FROM leads WHERE status = 'contacted'").get().c;
  const newContacts = finalTotalContacted - initialContacted;
  const finalRemaining = verifyDb.prepare("SELECT count(*) as c FROM leads WHERE status = 'not_contacted'").get().c;
  verifyDb.close();

  console.log(`\n------------------------------------------------------`);
  console.log(`🏁 Wave ${waveNum} Finished!`);
  console.log(`- Confirmed Submissions This Wave: +${newContacts}`);
  console.log(`- Total Contacted in Database: ${finalTotalContacted}`);
  console.log(`- Remaining Leads to Finish: ${finalRemaining}`);
  if (waveContacted.length > 0) {
    console.log(`🎯 New Submissions:`);
    waveContacted.forEach(l => {
      console.log(`   ✓ #${l.id} ${l.company_name} - ${l.notes ? l.notes.split('|')[0].trim() : 'Confirmed'}`);
    });
  }
  console.log(`------------------------------------------------------\n`);

  return { done: finalRemaining === 0, finalRemaining, finalTotalContacted };
}

async function main() {
  console.log(`======================================================`);
  console.log(`🚀 LEADFLOW AUTONOMOUS PIPELINE: FINISH ALL REMAINING LEADS`);
  console.log(`⚡ Max Concurrency: ${NUM_WORKERS} Parallel Workers`);
  console.log(`⚡ Wave Batch Size: ${WAVE_LIMIT} Leads per Wave`);
  console.log(`======================================================\n`);

  let wave = 184;
  while (true) {
    const result = await runWave(wave);
    if (result.done) {
      console.log(`\n🎉🎉🎉 ALL LEADS IN DATABASE HAVE BEEN PROCESSED! 🎉🎉🎉`);
      const finalDb = getDb();
      const summary = finalDb.prepare("SELECT status, count(*) as count FROM leads GROUP BY status").all();
      console.table(summary);
      finalDb.close();
      break;
    }
    wave++;
    // 3 second cool-down between waves
    await new Promise(r => setTimeout(r, 3000));
  }
}

main().catch(err => {
  console.error('Fatal Pipeline Error:', err);
  process.exit(1);
});
