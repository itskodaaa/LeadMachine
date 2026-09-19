import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import db from './db.mjs';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

const leadIds = [4728, 4729, 4730, 4731, 4732, 4733, 4734, 4735, 4736, 4737];

async function diagnose() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const placeholders = leadIds.map(() => '?').join(',');
  const leads = db.prepare(`SELECT id, company_name, website FROM leads WHERE id IN (${placeholders}) ORDER BY id ASC`).all(...leadIds);

  for (const lead of leads) {
    console.log(`\n======================================================`);
    console.log(`Analyzing Lead #${lead.id}: ${lead.company_name} (${lead.website})`);
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    try {
      let targetUrl = lead.website.startsWith('http') ? lead.website : `https://${lead.website}`;
      try {
        await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
      } catch (e) {
        if (targetUrl.startsWith('https://')) {
          targetUrl = targetUrl.replace('https://', 'http://');
          await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
        }
      }

      console.log(`Landed on: ${page.url()} | Title: ${await page.title()}`);

      // Find contact / quote links
      const links = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('a[href]'))
          .map(a => ({ href: a.href, text: (a.innerText || '').trim().replace(/\s+/g, ' ') }))
          .filter(a => {
            const h = a.href.toLowerCase();
            const t = a.text.toLowerCase();
            return (t.includes('contact') || t.includes('quote') || t.includes('touch') || t.includes('inquir') || h.includes('contact') || h.includes('quote'))
              && !h.startsWith('mailto:') && !h.startsWith('tel:');
          })
          .slice(0, 10);
      });

      console.log('Contact links found:', links);

      let contactUrl = page.url();
      const bestLink = links.find(l => /contact/i.test(l.text) || /contact/i.test(l.href)) || links[0];
      if (bestLink && bestLink.href !== page.url()) {
        console.log(`Navigating to best contact link: ${bestLink.href} (${bestLink.text})`);
        try {
          await page.goto(bestLink.href, { waitUntil: 'domcontentloaded', timeout: 15000 });
        } catch (e) {
          console.log('Nav error:', e.message);
        }
        contactUrl = page.url();
      }

      // Check forms on contactUrl
      const formAnalysis = await page.evaluate(() => {
        const forms = Array.from(document.querySelectorAll('form'));
        const captchas = Array.from(document.querySelectorAll('.g-recaptcha, iframe[src*="recaptcha"], iframe[src*="hcaptcha"], iframe[src*="turnstile"], .cf-turnstile, [data-sitekey], input[name*="captcha"]'));
        
        const details = forms.map((f, i) => {
          const inputs = Array.from(f.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]), textarea, select'));
          const submitBtn = f.querySelector('button, input[type="submit"], input[type="button"]');
          return {
            formIndex: i,
            action: f.action,
            inputNames: inputs.map(inp => inp.name || inp.id || inp.placeholder || inp.type),
            submitText: submitBtn ? (submitBtn.innerText || submitBtn.value || '').trim() : null
          };
        });

        const standAloneInputs = Array.from(document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]), textarea, select'));

        return {
          currentUrl: window.location.href,
          formCount: forms.length,
          forms: details,
          captchas: captchas.map(c => c.className || c.tagName),
          totalInputs: standAloneInputs.length
        };
      });

      console.log('Form Analysis:', JSON.stringify(formAnalysis, null, 2));

    } catch (err) {
      console.log(`Error analyzing #${lead.id}: ${err.message}`);
    } finally {
      await page.close();
    }
  }

  await browser.close();
}

diagnose();
