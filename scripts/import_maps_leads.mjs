#!/usr/bin/env node
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '..', 'data', 'leads.db');
const jsonPath = path.join(__dirname, '..', 'output', 'responses', 'get_tasks.json');

console.log('=== LeadFlow Google Maps Leads Importer ===\n');

// 1. Check if files exist
if (!fs.existsSync(dbPath)) {
  console.error(`Database not found at ${dbPath}`);
  process.exit(1);
}

if (!fs.existsSync(jsonPath)) {
  console.error(`Scraper output JSON not found at ${jsonPath}`);
  process.exit(1);
}

// 2. Open DB and collect current websites to isolate the 532 new ones
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const currentWebsites = new Set(
  db.prepare('SELECT website FROM leads WHERE website IS NOT NULL')
    .all()
    .map(r => r.website.toLowerCase().replace(/^www\./, ''))
);

console.log(`Current leads count in DB before reset: ${currentWebsites.size}`);

// 3. Create Backup
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupPath = path.join(__dirname, '..', 'data', `leads.backup.${timestamp}.db`);
fs.copyFileSync(dbPath, backupPath);
console.log(`✓ Backup successfully created at: ${backupPath}\n`);

// 4. Parse get_tasks.json
console.log(`Parsing ${jsonPath}...`);
const rawData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

function extractDomain(url) {
  if (!url) return '';
  let s = url.trim().toLowerCase();
  s = s.replace(/^https?:\/\//, '').replace(/^www\./, '');
  s = s.replace(/\/+$/, '');
  s = s.split('/')[0].split('?')[0].split('#')[0];
  return s;
}

const usStateAbbrev = {
  alabama: 'AL', alaska: 'AK', arizona: 'AZ', arkansas: 'AR', california: 'CA',
  colorado: 'CO', connecticut: 'CT', delaware: 'DE', florida: 'FL', georgia: 'GA',
  hawaii: 'HI', idaho: 'ID', illinois: 'IL', indiana: 'IN', iowa: 'IA',
  kansas: 'KS', kentucky: 'KY', louisiana: 'LA', maine: 'ME', maryland: 'MD',
  massachusetts: 'MA', michigan: 'MI', minnesota: 'MN', mississippi: 'MS', missouri: 'MO',
  montana: 'MT', nebraska: 'NE', nevada: 'NV', 'new hampshire': 'NH', 'new jersey': 'NJ',
  'new mexico': 'NM', 'new york': 'NY', 'north carolina': 'NC', 'north dakota': 'ND',
  ohio: 'OH', oklahoma: 'OK', oregon: 'OR', pennsylvania: 'PA', 'rhode island': 'RI',
  'south carolina': 'SC', 'south dakota': 'SD', tennessee: 'TN', texas: 'TX',
  utah: 'UT', vermont: 'VT', virginia: 'VA', washington: 'WA', 'west virginia': 'WV',
  wisconsin: 'WI', wyoming: 'WY'
};

const leadsByDomain = new Map();

for (const task of rawData.results) {
  const taskCity = task.data?.cities?.[0];
  const taskState = task.data?.states?.[0];

  if (Array.isArray(task.result)) {
    for (const item of task.result) {
      if (!item.name || !item.website) continue;
      const domain = extractDomain(item.website);
      if (!domain || !domain.includes('.')) continue;

      let state = item.detailed_address?.state || null;
      let city = item.detailed_address?.city || null;

      if (!state && taskState) {
        const parts = taskState.split('__');
        if (parts.length >= 2) {
          const stateName = parts[1].replace(/_/g, ' ').toLowerCase();
          state = usStateAbbrev[stateName] || parts[1];
        }
      }

      if (state && state.length > 2) {
        state = usStateAbbrev[state.toLowerCase()] || state.slice(0, 2).toUpperCase();
      } else if (state) {
        state = state.toUpperCase();
      }

      if (!city && taskCity) {
        const parts = taskCity.split('__');
        if (parts.length >= 3) {
          city = parts[2].replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
        }
      }

      if (!city && item.address) {
        const addrParts = item.address.split(',');
        if (addrParts.length >= 2) {
          city = addrParts[addrParts.length - 2].trim();
        }
      }

      const phone = item.phone || item.phone_international || null;

      let notes = '';
      if (item.main_category) notes += item.main_category + '. ';
      if (item.rating) notes += item.rating + ' stars';
      if (item.reviews) notes += ' (' + item.reviews + ' reviews). ';
      if (item.address) notes += 'Address: ' + item.address + '. ';
      notes += 'Scraped via Google Maps Scraper.';

      if (!leadsByDomain.has(domain)) {
        leadsByDomain.set(domain, {
          company_name: item.name.trim(),
          website: domain,
          city: city || null,
          state: state || null,
          phone: phone || null,
          notes: notes.trim(),
          rating: item.rating || 0,
          reviews: item.reviews || 0
        });
      } else {
        const existing = leadsByDomain.get(domain);
        if (!existing.phone && phone) existing.phone = phone;
        if (!existing.city && city) existing.city = city;
        if (!existing.state && state) existing.state = state;
        if ((!existing.reviews || existing.reviews < item.reviews) && item.reviews) {
          existing.rating = item.rating;
          existing.reviews = item.reviews;
        }
      }
    }
  }
}

// 5. Filter only the 532 unique NEW leads
const targetLeads = [];
for (const [domain, lead] of leadsByDomain) {
  if (!currentWebsites.has(domain)) {
    targetLeads.push(lead);
  }
}

console.log(`Total unique domains in extractor dataset: ${leadsByDomain.size}`);
console.log(`Identified NEW unique leads to import: ${targetLeads.length}\n`);

// 6. Clear DB and reset tables
console.log('Clearing database tables...');
const resetTx = db.transaction(() => {
  db.prepare('DELETE FROM contact_logs').run();
  db.prepare('DELETE FROM duplicate_warnings').run();
  db.prepare('DELETE FROM email_candidates').run();
  db.prepare('DELETE FROM replies').run();
  db.prepare('DELETE FROM sent_emails').run();
  db.prepare('DELETE FROM suppressions').run();
  db.prepare('DELETE FROM leads').run();
  try {
    db.prepare("DELETE FROM sqlite_sequence WHERE name IN ('leads', 'contact_logs', 'duplicate_warnings', 'email_candidates', 'replies', 'sent_emails', 'suppressions')").run();
  } catch {}
});
resetTx();
console.log('✓ All database tables cleared and sequences reset.\n');

// 7. Batch insert the new leads
console.log(`Importing ${targetLeads.length} leads into leads table...`);
const insertStmt = db.prepare(`
  INSERT INTO leads (company_name, website, city, state, phone, notes, status)
  VALUES (?, ?, ?, ?, ?, ?, 'not_contacted')
`);

let inserted = 0;
const insertTx = db.transaction(() => {
  for (const lead of targetLeads) {
    insertStmt.run(
      lead.company_name,
      lead.website,
      lead.city,
      lead.state,
      lead.phone,
      lead.notes
    );
    inserted++;
  }
});
insertTx();

console.log(`✓ Successfully imported ${inserted} leads!\n`);

// 8. Verification & Summary
const totalInDb = db.prepare('SELECT count(*) c FROM leads').get().c;
const stateStats = db.prepare('SELECT state, count(*) c FROM leads GROUP BY state ORDER BY c DESC').all();
const phoneStats = db.prepare('SELECT count(*) c FROM leads WHERE phone IS NOT NULL').get().c;

console.log('=== Summary Report ===');
console.log(`Total leads in DB: ${totalInDb}`);
console.log(`Leads with phone number: ${phoneStats} (${((phoneStats/totalInDb)*100).toFixed(1)}%)`);
console.log('State distribution:');
console.table(stateStats);

db.close();
console.log('Database closed. Import complete!');
