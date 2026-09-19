import Database from 'better-sqlite3';
import puppeteer from 'puppeteer';

const db = new Database('./data/leads.db');
const leads = db.prepare(`SELECT id, company_name, website, outreach_status, outreach_notes FROM leads WHERE id >= 4902 AND id <= 4911`).all();
console.log(JSON.stringify(leads, null, 2));
