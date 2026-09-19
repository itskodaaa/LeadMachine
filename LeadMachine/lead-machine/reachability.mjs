import https from 'https';
import http from 'http';
import dns from 'dns/promises';

const TIMEOUT_MS = 15000;

export async function checkWebsite(website, timeout = TIMEOUT_MS) {
  if (!website) return { ok: false, reason: 'No website URL', isDefinitiveDead: true };
  let domain = String(website).toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/+$/, '')
    .split('/')[0]
    .split('?')[0]
    .split('#')[0];

  if (!domain || !domain.includes('.')) return { ok: false, reason: 'Invalid domain', isDefinitiveDead: true };

  try {
    const dnsRace = Promise.race([
      dns.lookup(domain),
      new Promise((_, reject) => setTimeout(() => reject(new Error('DNS Timeout')), 8000))
    ]);
    const addresses = await dnsRace;
    if (!addresses || !addresses.address) return { ok: false, reason: 'DNS lookup failed', isDefinitiveDead: false };
  } catch (dnsErr) {
    const reason = dnsErr.message === 'DNS Timeout' ? 'DNS Timeout' : 'Domain does not resolve';
    return { ok: false, reason, isDefinitiveDead: false };
  }

  const tryUrl = (url) => new Promise((resolve) => {
    const client = url.startsWith('https') ? https : http;
    let settled = false;

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        try { req.destroy(); } catch (_) {}
        resolve({ ok: false, reason: 'Connection Timeout', isDefinitiveDead: false });
      }
    }, timeout);

    const req = client.request(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
      timeout,
      rejectUnauthorized: false
    }, (res) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      res.resume();
      if (res.statusCode === 404 || res.statusCode === 410) {
        resolve({ ok: false, reason: `HTTP ${res.statusCode}`, isDefinitiveDead: true });
      } else if (res.statusCode >= 200 && res.statusCode < 400) {
        resolve({ ok: true, statusCode: res.statusCode });
      } else if (res.statusCode === 403 || res.statusCode === 401 || res.statusCode === 429) {
        resolve({ ok: true, statusCode: res.statusCode, note: 'Protected/WAF' });
      } else if (res.statusCode >= 500) {
        resolve({ ok: false, reason: `HTTP ${res.statusCode}`, isDefinitiveDead: false });
      } else {
        resolve({ ok: true, statusCode: res.statusCode });
      }
    });

    req.on('timeout', () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      req.destroy();
      resolve({ ok: false, reason: 'Connection Timeout', isDefinitiveDead: false });
    });

    req.on('error', (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ ok: false, reason: err.code || err.message, isDefinitiveDead: false });
    });

    req.end();
  });

  const resHttps = await tryUrl(`https://${domain}`);
  if (resHttps.ok) return resHttps;
  if (resHttps.isDefinitiveDead) return resHttps;

  const resHttp = await tryUrl(`http://${domain}`);
  if (resHttp.ok) return resHttp;

  return { ok: false, reason: resHttps.reason || resHttp.reason, isDefinitiveDead: Boolean(resHttps.isDefinitiveDead || resHttp.isDefinitiveDead) };
}

export async function batchCheckWebsites(items, concurrency = 15, onProgress = null) {
  const results = [];
  let index = 0;

  async function worker() {
    while (index < items.length) {
      const i = index++;
      const item = items[i];
      const check = await checkWebsite(item.website);
      results[i] = { ...item, reachability: check };
      if (onProgress) onProgress(i + 1, items.length, results[i]);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}
