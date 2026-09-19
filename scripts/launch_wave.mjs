import { spawn } from 'child_process';
import Database from 'better-sqlite3';

const args = process.argv.slice(2);
const waveNum = args[0] || '178';
const startId = parseInt(args[1] || '11773', 10);
const limit = parseInt(args[2] || '88', 10);
const numWorkers = parseInt(args[3] || '8', 10);

const db = new Database('data/leads.db');
const initialContacted = db.prepare("SELECT count(*) as c FROM leads WHERE status = 'contacted'").get().c;

console.log(`\n======================================================`);
console.log(`🌊 Launching Wave ${waveNum} (startId >= ${startId}, limit = ${limit}, workers = ${numWorkers})`);
console.log(`📊 Initial Confirmed Contacted: ${initialContacted}`);
console.log(`======================================================\n`);

const leads = db.prepare(`
  SELECT id, company_name, website 
  FROM leads 
  WHERE status = 'not_contacted' AND id >= ? 
  ORDER BY id ASC 
  LIMIT ?
`).all(startId, limit);

if (leads.length === 0) {
  console.log('No leads found matching criteria.');
  process.exit(0);
}

console.log(`Fetched ${leads.length} leads: IDs ${leads[0].id} to ${leads[leads.length - 1].id}`);

const batchSize = Math.ceil(leads.length / numWorkers);
const batches = [];
for (let i = 0; i < numWorkers; i++) {
  const b = leads.slice(i * batchSize, (i + 1) * batchSize);
  if (b.length > 0) batches.push(b);
}

console.log(`Partitioned into ${batches.length} batches across ${batches.length} workers.\n`);

const promises = batches.map((batch, idx) => {
  const workerId = idx + 1;
  const leadIds = batch.map(l => l.id).join(',');
  console.log(`Worker ${workerId}: ${batch.length} leads (IDs ${batch[0].id}..${batch[batch.length - 1].id})`);

  return new Promise((resolve) => {
    const child = spawn('node', ['scripts/run_agent_worker.mjs', String(workerId), leadIds], {
      stdio: ['ignore', 'pipe', 'pipe']
    });

    child.stdout.on('data', (d) => {
      const lines = d.toString().split('\n').filter(Boolean);
      for (const line of lines) {
        if (line.includes('SUCCESS') || line.includes('contacted') || line.includes('Processing') || line.includes('Completed') || line.includes('Found form') || line.includes('Confirmed')) {
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
      console.log(`🏁 Worker ${workerId} exited with code ${code}`);
      resolve({ workerId, code });
    });
  });
});

Promise.all(promises).then(() => {
  console.log(`\n======================================================`);
  console.log(`🎉 Wave ${waveNum} Completed! Gathering Results...`);
  console.log(`======================================================\n`);

  const allProcessedIds = leads.map(l => l.id);
  const placeholders = allProcessedIds.map(() => '?').join(',');
  const updatedLeads = db.prepare(`
    SELECT id, company_name, website, status, notes 
    FROM leads 
    WHERE id IN (${placeholders})
  `).all(...allProcessedIds);

  const contactedLeads = updatedLeads.filter(l => l.status === 'contacted');
  const totalContacted = db.prepare("SELECT count(*) as c FROM leads WHERE status = 'contacted'").get().c;
  const newContacts = totalContacted - initialContacted;

  console.log(`📈 Wave Results:`);
  console.log(`- Total Leads in Wave: ${leads.length}`);
  console.log(`- Successfully Contacted in Wave: ${contactedLeads.length}`);
  console.log(`- Net New Contacts Added: +${newContacts}`);
  console.log(`- Overall Total Contacted in Database: ${totalContacted}`);

  if (contactedLeads.length > 0) {
    console.log(`\n🎯 Newly Contacted Leads:`);
    contactedLeads.forEach(l => {
      console.log(`  ✓ #${l.id} ${l.company_name} (${l.website}) - ${l.notes}`);
    });
  }

  db.close();
  process.exit(0);
});
