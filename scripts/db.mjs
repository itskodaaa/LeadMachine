import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '..', 'data', 'leads.db');
const dataDir = path.dirname(dbPath);

if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('busy_timeout = 10000');
db.pragma('foreign_keys = ON');

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
    status TEXT DEFAULT 'not_contacted' CHECK(status IN ('not_contacted', 'pending', 'contacted', 'responded', 'unable_to_reach', 'won', 'closed')),
    notes TEXT,
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

  CREATE TABLE IF NOT EXISTS duplicate_warnings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_name TEXT NOT NULL,
    website TEXT NOT NULL,
    reason TEXT NOT NULL,
    source TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    dismissed INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS sent_emails (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lead_id INTEGER,
    to_email TEXT NOT NULL,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    status TEXT DEFAULT 'sent' CHECK(status IN ('sent', 'bounced', 'replied')),
    message_id TEXT,
    sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS suppressions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    domain TEXT,
    reason TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS email_candidates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lead_id INTEGER NOT NULL,
    email TEXT NOT NULL,
    confidence INTEGER NOT NULL,
    source TEXT,
    verified INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(lead_id, email),
    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS replies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lead_id INTEGER,
    from_email TEXT NOT NULL,
    subject TEXT,
    body TEXT NOT NULL,
    classification TEXT,
    reply_sent INTEGER DEFAULT 0,
    reply_body TEXT,
    uid TEXT UNIQUE,
    received_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE SET NULL
  );

  CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
  CREATE INDEX IF NOT EXISTS idx_leads_state ON leads(state);
  CREATE INDEX IF NOT EXISTS idx_leads_website ON leads(website);
  CREATE INDEX IF NOT EXISTS idx_sent_emails_lead ON sent_emails(lead_id);
  CREATE INDEX IF NOT EXISTS idx_suppressions_email ON suppressions(email);
  CREATE INDEX IF NOT EXISTS idx_email_candidates_lead ON email_candidates(lead_id);
  CREATE INDEX IF NOT EXISTS idx_replies_lead ON replies(lead_id);
  CREATE INDEX IF NOT EXISTS idx_replies_from ON replies(from_email);
`);

export function log(leadId, action, notes) {
  db.prepare('INSERT INTO contact_logs (lead_id, action, notes) VALUES (?, ?, ?)')
    .run(leadId, action, notes || null);
  db.prepare('UPDATE leads SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run(action === 'sent' ? 'contacted' : action === 'replied' ? 'responded' : action === 'bounced' ? 'unable_to_reach' : action === 'closed' ? 'closed' : 'not_contacted', leadId);
}

export default db;
