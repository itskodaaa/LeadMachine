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

const DIRECTORY_IGNORED_DOMAINS = new Set([
  'google.com', 'google.co.uk', 'maps.google.com', 'facebook.com', 'fb.com',
  'twitter.com', 'x.com', 'instagram.com', 'linkedin.com', 'youtube.com',
  'tiktok.com', 'pinterest.com', 'reddit.com', 'github.com', 'gitlab.com',
  'wikipedia.org', 'schema.org', 'w3.org', 'godaddy.com', 'wordpress.org',
  'wordpress.com', 'wix.com', 'squarespace.com', 'weebly.com', 'cloudflare.com',
  'bit.ly', 'tinyurl.com', 't.co', 'apple.com', 'microsoft.com', 'amazon.com',
  'shopify.com', 'stripe.com', 'paypal.com', 'medium.com', 'substack.com',
  'yelp.com', 'yellowpages.com', 'bbb.org', 'glassdoor.com', 'indeed.com',
  'archive.org', 'cookiebot.com', 'onetrust.com', 'trustarc.com', 'termly.io',
  'hubspot.com', 'salesforce.com', 'mailchimp.com', 'constantcontact.com',
  'intercom.com', 'zendesk.com', 'drift.com', 'disqus.com'
]);

const GENERIC_ANCHORS = new Set([
  'website', 'visit website', 'official website', 'visit site', 'web', 'site',
  'click here', 'learn more', 'read more', 'view more', 'more info', 'details',
  'view profile', 'profile', 'homepage', 'home', 'link', 'url', 'here',
  'contact', 'contact us', 'about', 'about us', 'privacy policy', 'terms of service',
  'terms & conditions', 'terms', 'privacy', 'facebook', 'twitter', 'linkedin', 'instagram',
  'read article', 'source', 'external link', 'view listing'
]);

function getRootDomain(hostname) {
  const parts = hostname.toLowerCase().replace(/^www\./, '').split('.');
  if (parts.length <= 2) return parts.join('.');
  // Check two-part ccTLDs like .co.uk, .com.au
  const secondToLast = parts[parts.length - 2];
  if (['co', 'com', 'org', 'net', 'edu', 'gov'].includes(secondToLast) && parts[parts.length - 1].length === 2) {
    return parts.slice(-3).join('.');
  }
  return parts.slice(-2).join('.');
}

/**
 * Crawls a webpage or company directory URL and extracts outbound company websites.
 * @param {string} targetUrl - Webpage URL (e.g. directory, member list, partner page)
 * @returns {Promise<{ success: boolean, targetUrl: string, companies: Array<{ cleanUrl: string, domain: string, companyName: string }>, error?: string }>}
 */
export async function crawlDirectoryPage(targetUrl) {
  if (!targetUrl || typeof targetUrl !== 'string') {
    return { success: false, error: 'A valid webpage URL is required.' };
  }

  let fullUrl = targetUrl.trim();
  if (!fullUrl.startsWith('http://') && !fullUrl.startsWith('https://')) {
    fullUrl = 'https://' + fullUrl;
  }

  let parsedTarget;
  try {
    parsedTarget = new URL(fullUrl);
  } catch (_) {
    return { success: false, error: 'Invalid URL format.' };
  }

  const hostTarget = parsedTarget.hostname.toLowerCase().replace(/^www\./, '');
  const rootTarget = getRootDomain(hostTarget);

  let html = '';
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 25000);

    const response = await fetch(fullUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache'
      }
    });
    clearTimeout(timer);

    if (!response.ok) {
      return { success: false, error: `Failed to fetch webpage (HTTP ${response.status} ${response.statusText})` };
    }

    html = await response.text();
  } catch (err) {
    return { success: false, error: `Network error reaching webpage: ${err.message}` };
  }

  if (!html || html.length < 50) {
    return { success: false, error: 'Webpage returned empty or invalid content.' };
  }

  // Regex to extract all anchor tags with href and inner text
  const anchorRegex = /<a\b[^>]*\bhref=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  const titleRegex = /\btitle=["']([^"']+)["']/i;

  const discoveredCompanies = new Map();
  let match;

  while ((match = anchorRegex.exec(html)) !== null) {
    const rawHref = match[1].trim();
    const innerHtml = match[2] || '';
    const fullTag = match[0] || '';

    // Ignore javascript, mailto, tel, anchor anchors
    if (!rawHref || rawHref.startsWith('#') || rawHref.startsWith('javascript:') || rawHref.startsWith('mailto:') || rawHref.startsWith('tel:')) {
      continue;
    }

    // Ignore binary/media links
    if (/\.(pdf|zip|rar|tar|gz|exe|dmg|iso|png|jpg|jpeg|gif|svg|webp|mp4|mp3|avi|css|js)$/i.test(rawHref.split('?')[0])) {
      continue;
    }

    let resolvedUrl;
    try {
      resolvedUrl = new URL(rawHref, fullUrl);
    } catch (_) {
      continue;
    }

    // Must be HTTP or HTTPS
    if (resolvedUrl.protocol !== 'http:' && resolvedUrl.protocol !== 'https:') {
      continue;
    }

    const hostname = resolvedUrl.hostname.toLowerCase().replace(/^www\./, '');
    if (!hostname || !hostname.includes('.')) continue;

    // Filter out internal links (same domain or subdomain of directory)
    const linkRoot = getRootDomain(hostname);
    if (linkRoot === rootTarget || hostname === hostTarget || hostname.endsWith('.' + hostTarget)) {
      continue;
    }

    // Filter out ignored non-company domains
    if (DIRECTORY_IGNORED_DOMAINS.has(hostname) || DIRECTORY_IGNORED_DOMAINS.has(linkRoot)) {
      continue;
    }

    // Check if domain is already parsed
    if (discoveredCompanies.has(hostname)) {
      continue;
    }

    // Clean inner text
    let candidateName = innerHtml
      .replace(/<[^>]+>/g, ' ') // Strip HTML tags
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .replace(/\s+/g, ' ')
      .trim();

    // Check title attribute if inner text is blank or generic
    if (!candidateName || candidateName.length < 2 || GENERIC_ANCHORS.has(candidateName.toLowerCase())) {
      const titleMatch = fullTag.match(titleRegex);
      if (titleMatch && titleMatch[1]) {
        const titleCandidate = titleMatch[1].replace(/\s+/g, ' ').trim();
        if (titleCandidate.length >= 2 && !GENERIC_ANCHORS.has(titleCandidate.toLowerCase())) {
          candidateName = titleCandidate;
        }
      }
    }

    // If still blank or generic or overly long (e.g. entire paragraph), derive from domain
    if (!candidateName || candidateName.length < 2 || candidateName.length > 70 || GENERIC_ANCHORS.has(candidateName.toLowerCase())) {
      candidateName = deriveCompanyNameFromDomain(hostname);
    }

    const cleanUrl = `https://${hostname}`;

    discoveredCompanies.set(hostname, {
      cleanUrl,
      domain: hostname,
      companyName: candidateName
    });
  }

  const companies = Array.from(discoveredCompanies.values());

  return {
    success: true,
    targetUrl: fullUrl,
    totalFound: companies.length,
    companies
  };
}
