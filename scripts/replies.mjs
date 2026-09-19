#!/usr/bin/env node
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import db, { log } from './db.mjs';
import { config, senderSignature } from './config.mjs';

function fail(msg) { console.error(`ERROR: ${msg}`); process.exit(1); }
if (!config.titanEmail || !config.titanPassword) fail('TITAN_EMAIL / TITAN_PASSWORD not set in .env');

function emailDomain(email) {
  const at = email.lastIndexOf('@');
  return at === -1 ? '' : email.slice(at + 1).toLowerCase();
}

function classify(body, subject) {
  const t = `${body} ${subject}`.toLowerCase();
  if (/undelivered mail|mail delivery failed|delivery status notification|failure notice|undeliverable|permanent (?:failure|error)|remote host said.*5[0-9][0-9]|could not be delivered/i.test(t)) return 'bounce';
  if (/unsubscribe|opt-?out|remove me|don't (?:email|contact|write)|stop (?:emailing|contacting)/i.test(t)) return 'unsubscribe';
  if (/out of office|auto-?reply|currently out of the office|on (?:annual )?leave|will be away/i.test(t)) return 'out_of_office';
  if (/not interested|no thank|no thanks|not at this time|not right now|not looking|please don't|remove (?:me|us) (?:from|off)/i.test(t)) return 'not_interested';
  if (/interested|let's talk|lets talk|sounds good|call me|give me a call|schedule|book.*call|have (?:some )?time|what time|go ahead|send (?:it|over)|proceed|yes, please|would like/i.test(t)) return 'interested';
  if (/question|price|cost|quote|how much|what (?:is|are|about)|specification|deadline|timeline|nda|can you|do you offer|need more|clarif/i.test(t)) return 'question';
  return 'other';
}

async function llm(prompt, maxTokens = 300) {
  if (!config.llm.apiKey) return null;
  const res = await fetch(`${config.llm.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.llm.apiKey}` },
    body: JSON.stringify({
      model: config.llm.model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: maxTokens,
      temperature: 0.4,
    }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data?.choices?.[0]?.message?.content?.trim() || null;
}

async function draftReply(lead, parsed, classification) {
  if (classification === 'interested') {
    const name = lead.contact_person || lead.company_name || 'there';
    return `Hi ${name},

Great to hear from you. Happy to set up a call — what day and time works best for you this week?

In the meantime, if you have any questions, feel free to send them over and I'll make sure we have the answers before we talk.

Best regards,

${senderSignature()}`;
  }
  if (classification === 'question' && config.llm.apiKey) {
    const facts = [
      `Company: ${config.sender.company}, ${config.sender.address}`,
    ].filter(Boolean).join('\n');
    const prompt = `You are ${config.sender.name}, ${config.sender.title} at ${config.sender.company}.
A lead (${lead.company_name}) replied to a business inquiry email.
Facts you may use: ${facts}
Write a short, professional reply (max 80 words) answering their question. If the question needs information you don't have, say you'll confirm with the team and get back to them, and offer a call. Sign it with:
${senderSignature()}`;
    const reply = await llm(prompt);
    if (reply) return reply;
  }
  return null;
}

const client = new ImapFlow({
  host: config.imap.host,
  port: config.imap.port,
  secure: true,
  auth: { user: config.titanEmail, pass: config.titanPassword },
  logger: false,
});

const insertReply = db.prepare(`
  INSERT OR IGNORE INTO replies (lead_id, from_email, subject, body, classification, reply_sent, reply_body, uid)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

await client.connect();
console.log('Connected to IMAP.');

let processed = 0;

async function processMessage(msg) {
  let parsed;
  try {
    parsed = await simpleParser(msg.source);
  } catch (err) {
    console.warn(`  [parse error] uid ${msg.uid}: ${err.message}`);
    return;
  }
  const from = parsed.from?.value?.[0]?.address || '';
  if (!from) return;
  if (from.toLowerCase() === config.titanEmail.toLowerCase()) return;

  const bodyText = parsed.text || '';
  if (!bodyText && !parsed.subject) return;

  const lead = db.prepare(`
    SELECT l.* FROM leads l
    WHERE LOWER(l.email) = LOWER(?)
       OR LOWER(REPLACE(REPLACE(REPLACE(l.website,'https://',''),'http://',''),'www.','')) = LOWER(?)
    LIMIT 1
  `).get(from, emailDomain(from));

  const classification = classify(bodyText, parsed.subject || '');
  const replyBody = await draftReply(lead || { company_name: emailDomain(from), contact_person: null }, parsed, classification);

  const action = lead ? lead.id : null;
  insertReply.run(action, from, parsed.subject || '', bodyText.slice(0, 3000), classification, replyBody ? 1 : 0, replyBody, String(msg.uid));

  if (lead) {
    if (classification === 'unsubscribe') {
      db.prepare('INSERT OR IGNORE INTO suppressions (email, domain, reason) VALUES (?, ?, ?)').run(lead.email, emailDomain(from), 'unsubscribe');
      log(lead.id, 'closed', 'Unsubscribed');
    } else if (classification === 'bounce') {
      log(lead.id, 'bounced', 'Email bounced');
    } else {
      log(lead.id, 'replied', `${classification}: ${parsed.subject || ''}`);
    }
  }

  console.log(`[${processed + 1}] from=${from}  →  ${classification}${action ? ` (lead #${action})` : ' (unmatched)'}${replyBody ? '  [reply drafted]' : ''}`);
  processed++;
}

const lock = await client.getMailboxLock('INBOX');
try {
  const knownUids = new Set(db.prepare('SELECT uid FROM replies WHERE uid IS NOT NULL').all().map(r => String(r.uid)));
  const toFetchUids = [];

  if (client.mailbox.exists > 0) {
    for await (const msg of client.fetch('1:*', { envelope: true, uid: true })) {
      const uid = String(msg.uid);
      if (!knownUids.has(uid)) {
        toFetchUids.push(uid);
      }
    }
  }

  console.log(`Found ${toFetchUids.length} new message(s) to process.`);

  if (toFetchUids.length > 0) {
    for await (const msg of client.fetch(toFetchUids.join(','), { envelope: true, uid: true, source: true }, { uid: true })) {
      await processMessage(msg);
    }
  }
} finally {
  try { lock.release(); } catch { /* ignore */ }
  try { await client.logout(); } catch { /* ignore */ }
}

console.log(`\nDone. ${processed} new reply/email(s) processed.`);
