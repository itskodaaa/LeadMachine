#!/usr/bin/env node
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { ImapFlow } from 'imapflow';
import { config } from './config.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '..', 'data', 'leads.db');
const db = new Database(dbPath);

const args = process.argv.slice(2);
const days = +(args.find(a => a.startsWith('--days='))?.split('=')[1] || 5);
const dryRun = args.includes('--dry-run');
const deleteImap = args.includes('--imap');

console.log(`Email Cleanup Tool | Target: Older than ${days} days | dry-run: ${dryRun}`);

// 1. Database cleanup
const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
console.log(`Cutoff timestamp: ${cutoffDate}`);

const oldReplies = db.prepare(`SELECT COUNT(*) c FROM replies WHERE received_at < ?`).get(cutoffDate).c;
const oldSent = db.prepare(`SELECT COUNT(*) c FROM sent_emails WHERE sent_at < ?`).get(cutoffDate).c;

console.log(`\n--- Local Database ---`);
console.log(`Found ${oldReplies} reply/inbox records older than ${days} days.`);
console.log(`Found ${oldSent} sent email records older than ${days} days.`);

if (!dryRun) {
  const delReplies = db.prepare(`DELETE FROM replies WHERE received_at < ?`).run(cutoffDate);
  const delSent = db.prepare(`DELETE FROM sent_emails WHERE sent_at < ?`).run(cutoffDate);
  console.log(`Deleted ${delReplies.changes} records from 'replies' table.`);
  console.log(`Deleted ${delSent.changes} records from 'sent_emails' table.`);
} else {
  console.log(`[DRY RUN] Skipping database deletions.`);
}

// 2. IMAP cleanup (if requested and credentials configured)
if (deleteImap) {
  console.log(`\n--- IMAP Mailbox Cleanup ---`);
  if (!config.titanEmail || !config.titanPassword) {
    console.warn(`Cannot clean IMAP: TITAN_EMAIL or TITAN_PASSWORD not configured.`);
  } else {
    const client = new ImapFlow({
      host: config.imap.host,
      port: config.imap.port,
      secure: true,
      auth: { user: config.titanEmail, pass: config.titanPassword },
      logger: false,
    });

    try {
      await client.connect();
      console.log(`Connected to IMAP server.`);

      const lock = await client.getMailboxLock('INBOX');
      try {
        const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        const uidsToDelete = [];

        for await (const msg of client.fetch('1:*', { envelope: true, uid: true })) {
          if (msg.envelope && msg.envelope.date && new Date(msg.envelope.date) < cutoff) {
            uidsToDelete.push(msg.uid);
          }
        }

        console.log(`Found ${uidsToDelete.length} IMAP messages older than ${days} days.`);
        if (!dryRun && uidsToDelete.length > 0) {
          await client.messageDelete(uidsToDelete.join(','), { uid: true });
          console.log(`Deleted ${uidsToDelete.length} messages from INBOX.`);
        }
      } finally {
        lock.release();
        await client.logout();
      }
    } catch (err) {
      console.error(`IMAP cleanup error: ${err.message}`);
    }
  }
}

console.log('\nCleanup operation complete.');
