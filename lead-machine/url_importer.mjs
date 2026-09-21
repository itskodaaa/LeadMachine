/**
 * Lead Machine — Smart URL List Importer & Domain Normalizer
 * Extracts, cleans, dedupes, and auto-names company domains from raw text or CSVs.
 */

// Common generic TLDs and ccTLDs
const COMMON_TLDS = new Set([
  'com', 'org', 'net', 'edu', 'gov', 'mil', 'io', 'co', 'ai', 'app', 'dev', 'tech',
  'biz', 'info', 'pro', 'mobi', 'me', 'us', 'uk', 'ca', 'de', 'fr', 'it', 'es',
  'nl', 'au', 'jp', 'cn', 'in', 'br', 'ru', 'ch', 'se', 'no', 'fi', 'dk', 'at',
  'be', 'za', 'mx', 'nz', 'sg', 'ae', 'pl', 'cz', 'ro', 'gr', 'cl', 'global', 'solutions'
]);

// Ignored domain noise (search engines, hosting, social)
const IGNORED_DOMAINS = new Set([
  'google.com', 'facebook.com', 'twitter.com', 'x.com', 'instagram.com',
  'linkedin.com', 'youtube.com', 'tiktok.com', 'pinterest.com', 'reddit.com',
  'github.com', 'wikipedia.org', 'schema.org', 'w3.org', 'godaddy.com', 'wordpress.org',
  'wix.com', 'squarespace.com', 'cloudflare.com', 'bit.ly', 't.co', 'example.com'
]);

/**
 * Derives a readable, professional company name from a domain name.
 * e.g. "apex-precision.com" -> "Apex Precision"
 *      "norcal-mfg.net"     -> "Norcal Mfg"
 *      "turntech_machining.org" -> "Turntech Machining"
 */
export function deriveCompanyNameFromDomain(domain) {
  if (!domain || typeof domain !== 'string') return 'Company';

  // Strip port, www., and TLDs
  let core = domain.toLowerCase().replace(/:\d+$/, '').replace(/^www\./, '');
  const parts = core.split('.');
  if (parts.length > 1) {
    core = parts[0]; // Take primary domain label
  }

  // Split on hyphens, underscores, dots, or numbers
  const tokens = core
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .split(/\s+/)
    .filter(Boolean);

  if (tokens.length === 0) return 'Company';

  const knownAcronyms = {
    llc: 'LLC',
    inc: 'Inc',
    ltd: 'Ltd',
    corp: 'Corp',
    co: 'Co',
    mfg: 'Mfg',
    cnc: 'CNC',
    usa: 'USA',
    uk: 'UK',
    eng: 'Engineering',
    ind: 'Industrial',
    tech: 'Tech'
  };

  const formattedTokens = tokens.map(token => {
    const lower = token.toLowerCase();
    if (knownAcronyms[lower]) return knownAcronyms[lower];
    return token.charAt(0).toUpperCase() + token.slice(1).toLowerCase();
  });

  return formattedTokens.join(' ');
}

/**
 * Normalizes a single raw URL/domain string.
 * Returns { cleanUrl, domain, companyName } or null if invalid.
 */
export function normalizeWebsite(raw) {
  if (!raw || typeof raw !== 'string') return null;
  let str = raw.trim();

  // Strip quotes, brackets, trailing commas, trailing semicolons
  str = str.replace(/^["'<(\[]+|["'>)\];,]+$/g, '').trim();
  if (!str) return null;

  // Ignore email addresses
  if (str.includes('@') && !str.includes('/')) return null;

  // If no protocol, prepend https://
  let candidate = str;
  if (!candidate.startsWith('http://') && !candidate.startsWith('https://')) {
    candidate = 'https://' + candidate;
  }

  try {
    const parsed = new URL(candidate);
    let hostname = parsed.hostname.toLowerCase().trim();

    // Strip www. prefix for clean domain comparison
    hostname = hostname.replace(/^www\./, '');

    // Must have at least one dot
    if (!hostname.includes('.')) return null;

    // Check TLD
    const parts = hostname.split('.');
    const tld = parts[parts.length - 1];
    if (!tld || tld.length < 2 || !/^[a-z]+$/.test(tld)) return null;

    // Reject ignored social/search domains
    if (IGNORED_DOMAINS.has(hostname)) return null;

    // Reject localhost / IP / invalid chars
    if (hostname === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(hostname)) return null;

    const cleanUrl = `https://${hostname}`;
    const companyName = deriveCompanyNameFromDomain(hostname);

    return {
      cleanUrl,
      domain: hostname,
      companyName
    };
  } catch (_) {
    return null;
  }
}

/**
 * Parses raw text, CSV data, or multi-line link dumps.
 * Individually identifies and extracts unique websites.
 */
export function parseRawWebsites(rawText) {
  if (!rawText || typeof rawText !== 'string') return [];

  // Strip email addresses first so they aren't parsed as websites
  const sanitized = rawText.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, ' ');

  // 1. Regex to discover candidate tokens (links, domains, CSV cells)
  const tokenRegex = /(https?:\/\/[^\s,"'<>()]+|(?:www\.)?[a-zA-Z0-9][-a-zA-Z0-9]*\.[a-zA-Z]{2,}(?::\d+)?(?:\/[^\s,"'<>()]*)?)/gi;

  const matches = sanitized.match(tokenRegex) || [];
  const seenDomains = new Set();
  const results = [];

  for (const match of matches) {
    const norm = normalizeWebsite(match);
    if (norm && !seenDomains.has(norm.domain)) {
      seenDomains.add(norm.domain);
      results.push(norm);
    }
  }

  return results;
}

/**
 * Imports a list of parsed websites into SQLite database with full deduplication.
 * @param {import('better-sqlite3').Database} db
 * @param {Array<{ cleanUrl: string, companyName: string, domain: string }>} websites
 */
export function importWebsitesToDb(db, websites) {
  if (!Array.isArray(websites) || websites.length === 0) {
    return { added: 0, skippedDuplicates: 0, importedLeads: [] };
  }

  // Load existing websites for high-speed in-memory deduplication
  const existingRows = db.prepare("SELECT website FROM leads").all();
  const existingDomains = new Set();

  for (const row of existingRows) {
    if (row.website) {
      try {
        const u = row.website.startsWith('http') ? row.website : `https://${row.website}`;
        const h = new URL(u).hostname.replace(/^www\./, '').toLowerCase();
        existingDomains.add(h);
      } catch (_) {
        existingDomains.add(row.website.toLowerCase());
      }
    }
  }

  let added = 0;
  let skippedDuplicates = 0;
  const importedLeads = [];

  const insertStmt = db.prepare(`
    INSERT INTO leads (company_name, website, status, notes)
    VALUES (?, ?, 'not_contacted', 'Quick Website Import')
  `);

  const insertMany = db.transaction((items) => {
    for (const item of items) {
      if (existingDomains.has(item.domain)) {
        skippedDuplicates++;
        continue;
      }

      try {
        const info = insertStmt.run(item.companyName, item.cleanUrl);
        existingDomains.add(item.domain);
        added++;
        importedLeads.push({
          id: info.lastInsertRowid,
          company_name: item.companyName,
          website: item.cleanUrl,
          status: 'not_contacted',
          notes: 'Quick Website Import'
        });
      } catch (err) {
        if (err.message && err.message.includes('UNIQUE')) {
          skippedDuplicates++;
        } else {
          console.error('[URL Importer] Insert error:', err.message);
        }
      }
    }
  });

  insertMany(websites);

  return {
    added,
    skippedDuplicates,
    importedLeads
  };
}
