import assert from 'assert';
import Database from 'better-sqlite3';
import { parseRawWebsites, normalizeWebsite, deriveCompanyNameFromDomain, importWebsitesToDb } from './url_importer.mjs';

console.log('🧪 RUNNING SMART URL IMPORTER TEST SUITE...');

// 1. Company Name Derivation
assert.strictEqual(deriveCompanyNameFromDomain('apex-precision.com'), 'Apex Precision');
assert.strictEqual(deriveCompanyNameFromDomain('norcal_mfg.org'), 'Norcal Mfg');
assert.strictEqual(deriveCompanyNameFromDomain('mcnichols-cnc-machining.net'), 'Mcnichols CNC Machining');
assert.strictEqual(deriveCompanyNameFromDomain('turntech.co'), 'Turntech');
console.log('  1/4 Company name derivation logic verified.');

// 2. Normalization of messy links
const n1 = normalizeWebsite('https://www.apex-precision.com/contact?ref=123');
assert.strictEqual(n1.cleanUrl, 'https://apex-precision.com');
assert.strictEqual(n1.domain, 'apex-precision.com');
assert.strictEqual(n1.companyName, 'Apex Precision');

const n2 = normalizeWebsite('norcal-steel.org/');
assert.strictEqual(n2.cleanUrl, 'https://norcal-steel.org');

const n3 = normalizeWebsite('"http://subdomain.acme-corp.com/path#tag",');
assert.strictEqual(n3.cleanUrl, 'https://subdomain.acme-corp.com');
console.log('  2/4 URL normalization & domain extraction verified.');

// 3. Raw text extraction with CSV, mixed paragraphs, commas, newlines
const messyInput = `
Here is a list of companies I found today:
1. https://titan-machining.com/about-us
2. www.vanguard-tools.net, check them out!
Also email me at info@example.com (not a website)
https://precision-welding-llc.com?utm_source=google
norcal-fabrication.org; texas-laser-cut.com
and duplicate https://titan-machining.com/contact
google.com (should be ignored as search engine)
`;

const parsed = parseRawWebsites(messyInput);
console.log('  3/4 Parsed messy input into', parsed.length, 'unique websites:');
for (const p of parsed) {
  console.log(`     -> [${p.companyName}] ${p.cleanUrl}`);
}

assert.strictEqual(parsed.length, 5, 'Should have exactly 5 unique valid company websites');
assert(parsed.some(p => p.domain === 'titan-machining.com'));
assert(parsed.some(p => p.domain === 'vanguard-tools.net'));
assert(parsed.some(p => p.domain === 'precision-welding-llc.com'));
assert(parsed.some(p => p.domain === 'norcal-fabrication.org'));
assert(parsed.some(p => p.domain === 'texas-laser-cut.com'));

// 4. In-Memory SQLite Database Insertion & Deduplication
const memDb = new Database(':memory:');
memDb.exec(`
  CREATE TABLE leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_name TEXT NOT NULL,
    website TEXT NOT NULL UNIQUE,
    status TEXT DEFAULT 'not_contacted',
    notes TEXT
  );
  INSERT INTO leads (company_name, website) VALUES ('Existing Co', 'https://vanguard-tools.net');
`);

const importResult = importWebsitesToDb(memDb, parsed);
console.log('  4/4 DB Import Result: Added:', importResult.added, 'Duplicates skipped:', importResult.skippedDuplicates);
assert.strictEqual(importResult.added, 4, 'Should add 4 new leads');
assert.strictEqual(importResult.skippedDuplicates, 1, 'Should skip 1 existing lead (vanguard-tools.net)');

const totalRows = memDb.prepare("SELECT COUNT(*) as count FROM leads").get().count;
assert.strictEqual(totalRows, 5, 'Total in database must be 5');

memDb.close();

console.log('✅ ALL URL IMPORTER TESTS PASSED PERFECTLY!\n');
