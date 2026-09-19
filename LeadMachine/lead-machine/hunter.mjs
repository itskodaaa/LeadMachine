import puppeteer from 'puppeteer-core';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { checkWebsite } from './reachability.mjs';
import { getOrInstallChrome } from './worker.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.resolve(__dirname, '../data/leads.db');

export class LeadHunter {
  constructor() {
    this.status = 'idle'; // idle, running, completed, stopped, error
    this.currentTask = null;
    this.discoveredCount = 0;
    this.reachableCount = 0;
    this.skippedCount = 0;
    this.targetLimit = 20;
    this.browser = null;
    this.recentLeads = [];
    this.abortRequested = false;
  }

  getStatus() {
    return {
      status: this.status,
      query: this.currentTask?.query || '',
      state: this.currentTask?.state || '',
      limit: this.targetLimit,
      discovered: this.discoveredCount,
      reachable: this.reachableCount,
      skipped: this.skippedCount,
      recentLeads: this.recentLeads.slice(0, 30)
    };
  }

  stopHunting() {
    this.abortRequested = true;
    this.status = 'stopped';
    if (this.browser) {
      try { this.browser.close(); } catch (_) {}
    }
  }

  async startHunting({ query = 'Manufacturing', state = 'Illinois', city = '', limit = 20, onEvent = null }) {
    if (this.status === 'running') {
      throw new Error('A lead hunting session is already currently active.');
    }

    this.status = 'running';
    this.abortRequested = false;
    this.discoveredCount = 0;
    this.reachableCount = 0;
    this.skippedCount = 0;
    this.targetLimit = Math.max(1, Math.min(100, Number(limit) || 20));
    this.recentLeads = [];

    const searchQuery = city ? `${query} in ${city}, ${state}` : `${query} in ${state}`;
    this.currentTask = { query, state, city, fullQuery: searchQuery };

    const emit = (type, data) => {
      if (onEvent) onEvent({ type, ...data });
    };

    emit('hunter_started', { query: searchQuery, limit: this.targetLimit });

    const chromeBin = getOrInstallChrome();
    if (!chromeBin) {
      this.status = 'error';
      throw new Error('Could not locate or install browser engine for Lead Hunter.');
    }

    let db;
    try {
      db = new Database(dbPath);
    } catch (e) {
      this.status = 'error';
      throw new Error('Database connection failed: ' + e.message);
    }

    try {
      this.browser = await puppeteer.launch({
        executablePath: chromeBin,
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--window-size=1280,900'
        ]
      });

      const page = await this.browser.newPage();
      await page.setViewport({ width: 1280, height: 900 });
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');

      const mapsUrl = `https://www.google.com/maps/search/${encodeURIComponent(searchQuery)}?hl=en`;
      await page.goto(mapsUrl, { waitUntil: 'domcontentloaded', timeout: 35000 });

      // Handle Google consent modals if any
      try {
        await page.evaluate(() => {
          const btns = Array.from(document.querySelectorAll('button'));
          for (const b of btns) {
            const text = (b.innerText || '').toLowerCase();
            if (text.includes('accept all') || text.includes('agree') || text.includes('i agree')) {
              b.click();
              break;
            }
          }
        });
      } catch (_) {}

      // Wait for feed container
      try {
        await page.waitForSelector('div[role="feed"]', { timeout: 15000 });
      } catch (_) {}

      const checkExistingStmt = db.prepare("SELECT id FROM leads WHERE website LIKE ? OR company_name LIKE ? LIMIT 1");
      const insertLeadStmt = db.prepare(`
        INSERT INTO leads (company_name, website, city, state, phone, email, notes, contact_person, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'not_contacted')
      `);

      let totalFound = 0;
      let scrollAttempts = 0;
      const seenNames = new Set();

      while (this.reachableCount < this.targetLimit && scrollAttempts < 25 && !this.abortRequested) {
        scrollAttempts++;

        // Extract visible listing data from the Google Maps DOM
        const listings = await page.evaluate(() => {
          const items = [];
          const cards = document.querySelectorAll('div[role="article"], div.Nv2PK');
          for (const card of cards) {
            try {
              // Company Name
              const titleEl = card.querySelector('.fontHeadlineSmall, .qBF1Pd, a.hfpxzc');
              const name = titleEl ? (titleEl.innerText || titleEl.getAttribute('aria-label') || '').trim() : '';
              if (!name) continue;

              // Website link
              let website = '';
              const webEl = card.querySelector('a[data-value="Website"], a[aria-label*="Website"], a.lcr4fd');
              if (webEl) {
                website = webEl.getAttribute('href') || '';
              }

              // Phone
              let phone = '';
              const textContent = card.innerText || '';
              const phoneMatch = textContent.match(/(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
              if (phoneMatch) phone = phoneMatch[0];

              // Address / Snippet info
              let address = '';
              const lines = card.querySelectorAll('.fontBodyMedium');
              if (lines.length > 1) {
                address = (lines[1].innerText || '').replace(/[·•]/g, ', ').trim();
              }

              items.push({ name, website, phone, address });
            } catch (_) {}
          }
          return items;
        });

        for (const item of listings) {
          if (this.reachableCount >= this.targetLimit || this.abortRequested) break;
          if (!item.name || seenNames.has(item.name)) continue;
          seenNames.add(item.name);
          this.discoveredCount++;

          // Clean website URL
          let cleanUrl = item.website;
          if (cleanUrl.includes('google.com/url?q=')) {
            try {
              const u = new URL(cleanUrl);
              cleanUrl = u.searchParams.get('q') || cleanUrl;
            } catch (_) {}
          }

          if (!cleanUrl || cleanUrl.includes('facebook.com') || cleanUrl.includes('yelp.com') || cleanUrl.includes('instagram.com')) {
            this.skippedCount++;
            continue;
          }

          let normalized = cleanUrl.toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
          if (!normalized.includes('.')) {
            this.skippedCount++;
            continue;
          }

          // Check for duplicates in DB
          const existing = checkExistingStmt.get(`%${normalized}%`, item.name);
          if (existing) {
            this.skippedCount++;
            continue;
          }

          // Test domain reachability
          const check = await checkWebsite(cleanUrl, 8000);
          if (!check.ok) {
            this.skippedCount++;
            continue;
          }

          // Clean full URL
          const finalUrl = cleanUrl.startsWith('http') ? cleanUrl : `https://${cleanUrl}`;

          // Insert verified lead
          try {
            const notes = `Discovered via Lead Hunter: ${query} in ${state}${item.address ? ` | ${item.address}` : ''}`;
            insertLeadStmt.run(item.name, finalUrl, city || null, state || null, item.phone || null, null, notes, null);
            this.reachableCount++;

            const leadObj = {
              company: item.name,
              website: finalUrl,
              phone: item.phone || '—',
              state
            };
            this.recentLeads.unshift(leadObj);
            emit('lead_found', leadObj);
          } catch (insertErr) {
            console.error('Insert lead error:', insertErr.message);
          }
        }

        // Scroll the feed to trigger lazy loading of more listings
        const scrolled = await page.evaluate(() => {
          const feed = document.querySelector('div[role="feed"]');
          if (feed) {
            feed.scrollBy(0, 1000);
            return true;
          }
          window.scrollBy(0, 800);
          return false;
        });

        await new Promise(r => setTimeout(r, 2000));
      }

      this.status = this.abortRequested ? 'stopped' : 'completed';
      emit('hunter_finished', {
        discovered: this.discoveredCount,
        reachable: this.reachableCount,
        skipped: this.skippedCount
      });

    } catch (err) {
      this.status = 'error';
      emit('hunter_error', { error: err.message });
      console.error('Lead Hunter run error:', err);
    } finally {
      if (this.browser) {
        try { await this.browser.close(); } catch (_) {}
        this.browser = null;
      }
      if (db) {
        try { db.close(); } catch (_) {}
      }
    }

    return this.getStatus();
  }
}

export const leadHunter = new LeadHunter();
