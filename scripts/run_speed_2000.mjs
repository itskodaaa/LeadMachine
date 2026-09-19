import { spawn, execSync } from 'child_process';
import Database from 'better-sqlite3';

const args = process.argv.slice(2);
const TARGET_TOTAL = parseInt(args[0] || '2000', 10);
const NUM_WORKERS = parseInt(args[1] || '10', 10);
const BATCH_SIZE_PER_WORKER = parseInt(args[2] || '10', 10);
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

async function runWave(waveNum, leadsThisWave) {
  const db = getDb();
  const initialContacted = db.prepare("SELECT count(*) as c FROM leads WHERE status = 'contacted'").get().c;
  const remainingCount = db.prepare("SELECT count(*) as c FROM leads WHERE status = 'not_contacted'").get().c;

  const leads = db.prepare(`
    SELECT id, company_name, website 
    FROM leads 
    WHERE status = 'not_contacted' 
    ORDER BY id ASC 
    LIMIT ?
  `).all(leadsThisWave);

  db.close();

  if (leads.length === 0) {
    return { done: true, processed: 0, newContacts: 0 };
  }

  console.log(`\n======================================================`);
  console.log(`🌊 Wave ${waveNum} | Target Run: 2,000 Leads Speed-Run`);
  console.log(`📊 DB Contacted: ${initialContacted} | DB Not Contacted: ${remainingCount}`);
  console.log(`🎯 Wave Leads: ${leads.length} (IDs ${leads[0].id}..${leads[leads.length - 1].id}) across ${NUM_WORKERS} workers`);
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
  console.log(`🏁 Wave ${waveNum} Completed!`);
  console.log(`- Submissions Confirmed This Wave: +${newContacts}`);
  console.log(`- Cumulative DB Contacted: ${finalTotalContacted}`);
  console.log(`- Remaining in DB: ${finalRemaining}`);
  if (waveContacted.length > 0) {
    console.log(`🎯 New Submissions:`);
    waveContacted.forEach(l => {
      console.log(`   ✓ #${l.id} ${l.company_name} - ${l.notes ? l.notes.split('|')[0].trim() : 'Confirmed'}`);
    });
  }
  console.log(`------------------------------------------------------\n`);

  return { 
    done: finalRemaining === 0, 
    processed: leads.length, 
    newContacts, 
    finalRemaining, 
    finalTotalContacted 
  };
}

async function main() {
  const db = getDb();
  const startContacted = db.prepare("SELECT count(*) as c FROM leads WHERE status = 'contacted'").get().c;
  const startNotContacted = db.prepare("SELECT count(*) as c FROM leads WHERE status = 'not_contacted'").get().c;
  db.close();

  console.log(`======================================================`);
  console.log(`🚀 SPEED-RUN LAUNCHER: 2,000 NOT_CONTACTED LEADS`);
  console.log(`🎯 Target Leads to Process: ${TARGET_TOTAL}`);
  console.log(`⚡ Concurrency: ${NUM_WORKERS} Parallel Workers`);
  console.log(`⚡ Wave Size: ${WAVE_LIMIT} Leads / Wave (10 leads / worker)`);
  console.log(`📊 Initial DB State: ${startContacted} contacted, ${startNotContacted} not_contacted`);
  console.log(`======================================================\n`);

  let totalProcessed = 0;
  let totalNewContacts = 0;
  let wave = 202; // Continuing from Wave 201

  while (totalProcessed < TARGET_TOTAL) {
    const leadsRemainingToTarget = TARGET_TOTAL - totalProcessed;
    const leadsThisWave = Math.min(WAVE_LIMIT, leadsRemainingToTarget);

    const result = await runWave(wave, leadsThisWave);
    totalProcessed += result.processed;
    totalNewContacts += result.newContacts;

    console.log(`📈 Speed-Run Progress: ${totalProcessed} / ${TARGET_TOTAL} leads processed (${((totalProcessed / TARGET_TOTAL) * 100).toFixed(1)}%) | +${totalNewContacts} new contacts`);

    if (result.done || result.processed === 0) {
      console.log(`\nNotice: All pending leads in database have been processed before reaching ${TARGET_TOTAL}.`);
      break;
    }

    wave++;
    if (totalProcessed < TARGET_TOTAL) {
      await new Promise(r => setTimeout(r, 2500));
    }
  }

  const finalDb = getDb();
  const finalSummary = finalDb.prepare("SELECT status, count(*) as count FROM leads GROUP BY status").all();
  const finalContacted = finalDb.prepare("SELECT count(*) as c FROM leads WHERE status = 'contacted'").get().c;
  finalDb.close();

  console.log(`\n======================================================`);
  console.log(`🎉🎉🎉 2,000 LEADS SPEED-RUN FINISHED! 🎉🎉🎉`);
  console.log(`- Total Leads Processed in this Run: ${totalProcessed}`);
  console.log(`- Net New Confirmed Contacts: +${totalNewContacts}`);
  console.log(`- Final Total Contacted in Database: ${finalContacted}`);
  console.table(finalSummary);
  console.log(`======================================================\n`);
}

main().catch(err => {
  console.error('Fatal Speed-Run Error:', err);
  process.exit(1);
});
