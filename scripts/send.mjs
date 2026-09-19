#!/usr/bin/env node
import nodemailer from 'nodemailer';
import MailComposer from 'nodemailer/lib/mail-composer/index.js';
import { ImapFlow } from 'imapflow';
import dns from 'dns/promises';
import db, { log } from './db.mjs';
import { config, senderSignature } from './config.mjs';
import { renderBody, pickSubject } from './template.mjs';

const args = process.argv.slice(2);
const limit = +(args.find(a => a.startsWith('--limit='))?.split('=')[1] || 25);
const dryRun = args.includes('--dry-run');
const status = args.find(a => a.startsWith('--status='))?.split('=')[1] || 'not_contacted';
const toOverride = args.find(a => a.startsWith('--to='))?.split('=')[1];

function now() { return new Date().toISOString(); }

function fail(msg) { console.error(`ERROR: ${msg}`); process.exit(1); }

if (!config.titanEmail || !config.titanPassword) {
  if (dryRun) console.warn('WARN: TITAN_EMAIL / TITAN_PASSWORD not set — dry-run only, no real send.');
  else fail('TITAN_EMAIL / TITAN_PASSWORD not set in .env');
}
if (!config.sender.address) console.warn('WARN: SENDER_ADDRESS is empty — CAN-SPAM requires a real physical address in commercial email. Set it in .env.');

// Resolve SMTP and IMAP IPs using robust DNS resolvers
let smtpIp = config.smtp.host;
try {
  const ips = await dns.resolve4(config.smtp.host);
  if (ips && ips.length > 0) smtpIp = ips[0];
} catch {
  /* fallback to hostname */
}

let imapIp = config.imap.host;
try {
  const ips = await dns.resolve4(config.imap.host);
  if (ips && ips.length > 0) imapIp = ips[0];
} catch {
  /* fallback to hostname */
}

const transporter = nodemailer.createTransport({
  host: smtpIp,
  port: config.smtp.port,
  secure: config.smtp.port === 465,
  auth: { user: config.titanEmail, pass: config.titanPassword },
  tls: { servername: config.smtp.host },
});

let imapClient = null;

async function getImap() {
  if (imapClient && imapClient.authenticated && imapClient.usable) return imapClient;
  imapClient = new ImapFlow({
    host: imapIp,
    port: config.imap.port,
    secure: true,
    servername: config.imap.host,
    tls: { servername: config.imap.host },
    auth: { user: config.titanEmail, pass: config.titanPassword },
    logger: false,
  });
  imapClient.on('error', (err) => {
    // Prevent unhandled error event from crashing the process
    imapClient = null;
  });
  await imapClient.connect();
  return imapClient;
}

async function appendToSent(mailOptions) {
  try {
    const composer = new MailComposer(mailOptions);
    const buffer = await composer.compile().build();
    const client = await getImap();
    await client.append('Sent', buffer, ['\\Seen']);
  } catch (err) {
    console.warn(`  [WARN] Failed to sync copy to Sent folder: ${err.message}`);
    if (imapClient) {
      try { await imapClient.logout(); } catch { /* ignore */ }
      imapClient = null;
    }
  }
}

const sentToday = db.prepare(`SELECT COUNT(*) c FROM sent_emails WHERE date(sent_at) = date('now') AND status = 'sent'`).get().c;
const remainingCap = config.dailyCap - sentToday;
if (remainingCap <= 0) fail(`Daily cap reached (${sentToday}/${config.dailyCap}). Set DAILY_CAP in .env to raise it.`);
const batch = Math.min(limit, remainingCap);

let leads;
if (toOverride) {
  const match = db.prepare(`SELECT * FROM leads WHERE LOWER(email) = LOWER(?) OR LOWER(company_name) LIKE LOWER(?) LIMIT 1`)
    .get(toOverride, `%${toOverride}%`);
  leads = [match || { id: 0, company_name: 'Test Recipient', email: toOverride, contact_person: 'Test Contact', city: 'Alexandria', state: 'VA' }];
} else {
  leads = db.prepare(`
    SELECT l.* FROM leads l
    WHERE l.status = ? AND l.email IS NOT NULL AND l.email != ''
      AND NOT EXISTS (SELECT 1 FROM suppressions s WHERE s.email = l.email)
      AND NOT EXISTS (SELECT 1 FROM sent_emails se WHERE se.to_email = l.email AND se.status != 'bounced')
    ORDER BY l.id ASC
    LIMIT ?
  `).all(status, batch);
}

console.log(`Send run  |  batch=${leads.length} (cap allows ${batch})  |  dry-run=${dryRun}  |  from=${config.titanEmail}`);

if (leads.length === 0) {
  console.log('No leads to send. Run scripts/enrich.mjs first to find emails.');
  process.exit(0);
}

let sent = 0, bounced = 0, failed = 0;

const sendOne = async (lead, i) => {
  const subject = pickSubject(lead, sent + failed);
  const body = renderBody(lead);
  const address = toOverride || lead.email;

  console.log(`\n[${i + 1}/${leads.length}] ${lead.company_name}  →  ${address}`);
  console.log(`  Subject: ${subject}`);

  if (dryRun) {
    console.log(`  [DRY-RUN] would send ${body.split('\n')[0]}...`);
    return;
  }

  const mailOptions = {
    from: `${config.sender.name || config.titanEmail} <${config.titanEmail}>`,
    to: address,
    subject,
    text: body,
    headers: {
      'List-Unsubscribe': `<mailto:${config.titanEmail}?subject=unsubscribe>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    },
  };

  const leadId = lead.id > 0 ? lead.id : null;

  try {
    const info = await transporter.sendMail(mailOptions);
    db.prepare(`INSERT INTO sent_emails (lead_id, to_email, subject, body, status, message_id) VALUES (?, ?, ?, ?, 'sent', ?)`)
      .run(leadId, address, subject, body, info.messageId || null);
    if (leadId) log(leadId, 'sent', subject);
    sent++;

    // Sync a copy of the sent email to Titan's IMAP Sent folder
    if (info.messageId) mailOptions.messageId = info.messageId;
    await appendToSent(mailOptions);
  } catch (err) {
    const msg = err?.responseCode || err?.code || err.message;
    const isHardBounce = /5[0-9][0-9]/.test(String(err?.responseCode || '')) || /550|5\.1\.1|5\.1\.10|5\.7\.1|554/.test(msg);
    db.prepare(`INSERT INTO sent_emails (lead_id, to_email, subject, body, status) VALUES (?, ?, ?, ?, 'bounced')`)
      .run(leadId, address, subject, body);
    if (isHardBounce) {
      if (leadId) log(leadId, 'bounced', msg);
      bounced++;
      console.warn(`  [BOUNCE] ${msg}`);
    } else {
      failed++;
      console.warn(`  [FAILED] ${msg}`);
    }
  }
};

for (let i = 0; i < leads.length; i++) {
  await sendOne(leads[i], i);
  if (!dryRun && i < leads.length - 1) {
    const delay = config.sendDelayMs + Math.floor(Math.random() * config.sendDelayMs);
    await new Promise(r => setTimeout(r, delay));
  }
}

if (imapClient && imapClient.authenticated) {
  await imapClient.logout().catch(() => {});
}

console.log(`\nDone. sent=${sent} bounced=${bounced} failed=${failed}`);
