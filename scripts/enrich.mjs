#!/usr/bin/env node
import db from './db.mjs';
import dnsPromises from 'dns/promises';
import dns from 'dns';

try {
  dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
} catch {
  /* ignore */
}

const CONCURRENCY = 15;
const FETCH_TIMEOUT = 4000;

const args = process.argv.slice(2);
const limitArg = args.find(a => a.startsWith('--limit='))?.split('=')[1];
const offsetArg = args.find(a => a.startsWith('--offset='))?.split('=')[1];
const processAll = args.includes('--all');
const aggressive = args.includes('--aggressive');
const PROMOTE_MIN = aggressive ? 45 : 60;
const limit = processAll ? 100000 : +(limitArg || 100);
const offset = +(offsetArg || 0);

const JUNK_PATTERNS = [
  /\.(png|jpe?g|gif|svg|webp|css|js|woff2?|ico|mp4|pdf|zip|ttf|eot)([?#].*)?$/i,
  /wixpress\.com|sentry\.io|example\.com|schema\.org|wordpress\.(com|org)|godaddy|mailchimp|squarespace|webflow|yandex\.|shutterstock|getresponse|elementor|unlayer|microsoft\.com|googleusercontent|cloudflare|wordpress\.org|gravatar|typekit|wix\.com|blogspot|linkedin|facebook|instagram|twitter|youtube|whatsapp|telegram/i,
  /^(webmaster|no-reply|donotreply|noreply|nobody|postmaster)@/i,
];

const JUNK_TLDS = /\.(png|jpg|jpeg|gif|svg|webp|css|js|ico)$/;

const mxCache = new Map();
async function hasMx(domain) {
  if (mxCache.has(domain)) return mxCache.get(domain);
  try {
    const records = await dnsPromises.resolveMx(domain);
    const ok = Array.isArray(records) && records.length > 0;
    mxCache.set(domain, ok);
    return ok;
  } catch {
    mxCache.set(domain, false);
    return false;
  }
}

function toDomain(website) {
  if (!website) return '';
  return website.toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/+$/, '')
    .split('/')[0]
    .split('?')[0];
}

function decodeHtmlEntities(str) {
  return str
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(+d))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function stripScriptsAndStyles(html) {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ');
}

function deobfuscate(str) {
  return decodeHtmlEntities(str)
    .replace(/\s*(?:\[|\(|\{)\s*at\s*(?:\]|\)|\})\s*/gi, '@')
    .replace(/\s*(?:\[|\(|\{)\s*dot\s*(?:\]|\)|\})\s*/gi, '.')
    .replace(/\b([a-zA-Z0-9._%+-]+)\s+(?:\[at\]|\(at\)|at)\s+([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/gi, '$1@$2');
}

function extractEmails(html, domain) {
  const found = new Map();

  // 1. Direct mailto: links (highest accuracy)
  const mailtoRe = /href=["']mailto:([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})(?:\?[^"']*)?["']/gi;
  let m;
  while ((m = mailtoRe.exec(html)) !== null) {
    const email = m[1].toLowerCase();
    if (JUNK_TLDS.test(email) || JUNK_PATTERNS.some(p => p.test(email))) continue;
    const domainMatch = email.split('@')[1] === domain;
    const isRole = /^(info|office|contact|sales|admin|quotes|purchasing|procurement|estimat|hello)@/.test(email);
    const score = domainMatch ? (isRole ? 90 : 95) : 50;
    found.set(email, score);
  }

  // 2. Visible text extraction (excluding scripts/styles)
  const cleaned = deobfuscate(stripScriptsAndStyles(html));
  const textRe = /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g;
  while ((m = textRe.exec(cleaned)) !== null) {
    const email = m[0].toLowerCase();
    if (JUNK_TLDS.test(email) || JUNK_PATTERNS.some(p => p.test(email)) || email.length > 80) continue;
    const domainMatch = email.split('@')[1] === domain;
    const isRole = /^(info|office|contact|sales|admin|quotes|purchasing|procurement|estimat|hello)@/.test(email);
    const score = domainMatch ? (isRole ? 85 : 90) : 40;
    const existing = found.get(email);
    if (!existing || score > existing) found.set(email, score);
  }

  return [...found.entries()];
}

function parseName(person) {
  if (!person) return null;
  const parts = person.trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return null;
  const first = parts[0].toLowerCase().replace(/[^a-z]/g, '');
  const last = parts[parts.length - 1].toLowerCase().replace(/[^a-z]/g, '');
  if (!first || !last) return null;
  return { first, last };
}

function candidatePatterns(domain, person) {
  const out = [];
  const n = parseName(person);
  if (n) {
    out.push(
      { email: `${n.first}.${n.last}@${domain}`, conf: 55, source: 'name_pattern' },
      { email: `${n.first}@${domain}`, conf: 45, source: 'name_pattern' },
      { email: `${n.first[0]}${n.last}@${domain}`, conf: 45, source: 'name_pattern' }
    );
  }
  for (const role of ['info', 'office', 'contact', 'admin', 'sales', 'quotes']) {
    out.push({ email: `${role}@${domain}`, conf: 45, source: 'role_pattern' });
  }
  return out;
}

async function fetchText(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: { 'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36' },
    });
    if (!res.ok) return '';
    const buf = await res.arrayBuffer();
    return Buffer.from(buf).toString('utf-8');
  } catch {
    return '';
  } finally {
    clearTimeout(timer);
  }
}

const CONTACT_PATHS = ['', '/contact', '/contact-us', '/about', '/about-us'];

async function findEmailsForLead(lead) {
  const domain = toDomain(lead.website);
  if (!domain || !domain.includes('.')) return { candidates: [], domain, mx: false };

  const mx = await hasMx(domain);
  const candidates = new Map();

  for (const p of CONTACT_PATHS) {
    const html = await fetchText(`https://${domain}${p}`) || await fetchText(`http://${domain}${p}`);
    if (!html) continue;
    for (const [email, score] of extractEmails(html, domain)) {
      if (!candidates.has(email) || score > candidates.get(email)) candidates.set(email, score);
    }
    const hasDomainMatch = [...candidates.values()].some(s => s >= 85);
    if (hasDomainMatch) break;
  }

  const result = [];
  for (const [email, score] of candidates) {
    result.push({ email, confidence: mx ? Math.min(95, score + 5) : score, source: 'website' });
  }

  if (result.length === 0 && mx) {
    for (const c of candidatePatterns(domain, lead.contact_person)) {
      result.push({ email: c.email, confidence: c.conf, source: c.source });
    }
  }

  return { candidates: result, domain, mx };
}

async function mapPool(items, limit, fn) {
  const results = new Array(items.length);
  let i = 0;
  const workers = Array(Math.min(limit, items.length)).fill(0).map(async () => {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await fn(items[idx], idx);
    }
  });
  await Promise.all(workers);
  return results;
}

const insertCandidate = db.prepare(`
  INSERT OR REPLACE INTO email_candidates (lead_id, email, confidence, source, verified)
  VALUES (?, ?, ?, ?, ?)
`);
const updateLeadEmail = db.prepare(`
  UPDATE leads SET email = ?, notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
`);

const leads = db.prepare(`
  SELECT id, company_name, website, city, state, contact_person, notes
  FROM leads
  WHERE (email IS NULL OR email = '') AND website IS NOT NULL AND website != ''
  ORDER BY id ASC
  LIMIT ? OFFSET ?
`).all(limit, offset);

console.log(`Enriching ${leads.length} leads (limit=${limit}, offset=${offset})...`);

const results = await mapPool(leads, CONCURRENCY, async (lead) => {
  const r = await findEmailsForLead(lead);
  for (const c of r.candidates) {
    insertCandidate.run(lead.id, c.email, c.confidence, c.source, r.mx ? 1 : 0);
  }
  const best = r.candidates.filter(c => c.source === 'website' && c.confidence >= 85).sort((a, b) => b.confidence - a.confidence)[0];
  if (best) {
    const note = `email_src: ${best.source} (${best.confidence}%)`;
    const mergedNotes = [lead.notes, note].filter(Boolean).join('\n');
    updateLeadEmail.run(lead.id, best.email, mergedNotes);
    return { id: lead.id, company: lead.company_name, domain: r.domain, email: best.email, conf: best.confidence, source: best.source };
  }
  return { id: lead.id, company: lead.company_name, domain: r.domain, email: null, conf: 0, source: 'none' };
});

const found = results.filter(r => r.email);
const noMx = results.filter(r => r.domain && !r.mx);

console.log('');
console.log(`Done. ${found.length}/${results.length} leads now have an email.`);
console.log(`( ${noMx.length} domains had no MX record — no email possible there. )`);

const existing = db.prepare('SELECT COUNT(*) c FROM leads WHERE email IS NOT NULL AND email != ?').get('');
console.log(`Total leads with email in DB now: ${existing.c}`);
