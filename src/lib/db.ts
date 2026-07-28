import Database from 'better-sqlite3';
import { dev } from '$app/environment';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '..', '..', 'data', 'leads.db');

import fs from 'fs';
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
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
    status TEXT DEFAULT 'not_contacted' CHECK(status IN ('not_contacted', 'contacted', 'responded', 'unable_to_reach', 'won', 'closed')),
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

  CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
  CREATE INDEX IF NOT EXISTS idx_leads_state ON leads(state);
  CREATE INDEX IF NOT EXISTS idx_leads_website ON leads(website);
  CREATE INDEX IF NOT EXISTS idx_contact_logs_lead ON contact_logs(lead_id);
`);

export default db;

export interface CreateLeadInput {
  company_name: string;
  website: string;
  city?: string;
  state?: string;
  phone?: string;
  email?: string;
  contact_person?: string;
  notes?: string;
}

export interface UpdateLeadInput extends Partial<CreateLeadInput> {
  status?: 'not_contacted' | 'contacted' | 'responded' | 'closed';
}

export interface LeadFilters {
  search?: string;
  status?: string;
  state?: string;
  page?: number;
  limit?: number;
}

export function getLeads(filters: LeadFilters = {}) {
  const { search, status, state, page = 1, limit = 25 } = filters;
  const offset = (page - 1) * limit;

  let where = 'WHERE 1=1';
  const params: any[] = [];

  if (search) {
    where += ' AND (company_name LIKE ? OR website LIKE ? OR city LIKE ? OR email LIKE ?)';
    const s = `%${search}%`;
    params.push(s, s, s, s);
  }

  if (status && status !== 'all') {
    where += ' AND status = ?';
    params.push(status);
  }

  if (state && state !== 'all') {
    where += ' AND state = ?';
    params.push(state);
  }

  const countRow = db.prepare(`SELECT COUNT(*) as total FROM leads ${where}`).get(...params) as any;
  const total = countRow?.total || 0;

  const leads = db.prepare(`SELECT * FROM leads ${where} ORDER BY updated_at DESC LIMIT ? OFFSET ?`)
    .all(...params, limit, offset);

  return { leads, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export function getLeadById(id: number) {
  return db.prepare('SELECT * FROM leads WHERE id = ?').get(id);
}

export function createLead(input: CreateLeadInput) {
  const stmt = db.prepare(`
    INSERT INTO leads (company_name, website, city, state, phone, email, contact_person, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    input.company_name,
    input.website.toLowerCase().replace(/^https?:\/\//, '').replace(/\/+$/, ''),
    input.city || null,
    input.state?.toUpperCase() || null,
    input.phone || null,
    input.email || null,
    input.contact_person || null,
    input.notes || null
  );
  return getLeadById(result.lastInsertRowid as number);
}

export function updateLead(id: number, input: UpdateLeadInput) {
  const fields: string[] = [];
  const values: any[] = [];

  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined) {
      fields.push(`${key} = ?`);
      values.push(key === 'website' ? value.toLowerCase().replace(/^https?:\/\//, '').replace(/\/+$/, '') : value);
    }
  }

  if (fields.length === 0) return getLeadById(id);

  fields.push('updated_at = CURRENT_TIMESTAMP');
  values.push(id);

  db.prepare(`UPDATE leads SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  return getLeadById(id);
}

export function deleteLead(id: number) {
  return db.prepare('DELETE FROM leads WHERE id = ?').run(id);
}

export function addContactLog(leadId: number, action: string, notes?: string) {
  db.prepare('INSERT INTO contact_logs (lead_id, action, notes) VALUES (?, ?, ?)')
    .run(leadId, action, notes || null);
  db.prepare('UPDATE leads SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run(action === 'sent' ? 'contacted' : action === 'replied' ? 'responded' : action === 'closed' ? 'closed' : 'not_contacted', leadId);
  return getLeadById(leadId);
}

export function getContactLogs(leadId: number) {
  return db.prepare('SELECT * FROM contact_logs WHERE lead_id = ? ORDER BY created_at DESC').all(leadId);
}

export function importLeads(leads: Record<string, string>[]) {
  const insert = db.prepare(`
    INSERT OR IGNORE INTO leads (company_name, website, city, state, phone, email, contact_person, notes, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let imported = 0;
  let skipped = 0;

  const transaction = db.transaction(() => {
    for (const lead of leads) {
      const website = (lead.website || '').toLowerCase().replace(/^https?:\/\//, '').replace(/\/+$/, '');
      if (!website && !lead.company_name) continue;
      const existing = website ? db.prepare('SELECT id FROM leads WHERE website = ?').get(website) : null;
      if (existing) { skipped++; continue; }
      insert.run(
        lead.company_name || null,
        website || null,
        lead.city || null,
        lead.state?.toUpperCase() || null,
        lead.phone || null,
        lead.email || null,
        lead.contact_person || null,
        lead.notes || null,
        lead.status || 'not_contacted'
      );
      imported++;
    }
  });

  transaction();
  return { imported, skipped };
}

export function getStats() {
  const total = (db.prepare('SELECT COUNT(*) as count FROM leads').get() as any).count;
  const byStatus = db.prepare('SELECT status, COUNT(*) as count FROM leads GROUP BY status').all();
  const byState = db.prepare('SELECT state, COUNT(*) as count FROM leads WHERE state IS NOT NULL GROUP BY state ORDER BY count DESC LIMIT 10').all();
  return { total, byStatus, byState };
}
