import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import db from './db.mjs';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const leadIds = [4673, 4674, 4676, 4677, 4680, 4681, 4682, 4684];

function normalizeUrl(url) {
  if (!url) return null;
  let clean = url.trim();
  if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
    clean = 'https://' + clean;
  }
  return clean;
}

async function main() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  for (const id of leadIds) {
    const lead = db.prepare('SELECT id, company_name, website FROM leads WHERE id = ?').get(id);
    const targetUrl = normalizeUrl(lead.website);
    console.log(`\n========================================`);
    console.log(`Checking #${lead.id}: ${lead.company_name} - ${targetUrl}`);
    const page = await browser.newPage();
    try {
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      const resp = await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
      console.log(`Status: ${resp ? resp.status() : 'null'}, Final URL: ${page.url()}`);
      
      // Look for contact links
      const links = await page.$$eval('a', as => as.map(a => ({ href: a.href, text: a.innerText.trim().replace(/\s+/g, ' ') })).filter(a => /contact|reach|quote|estimate/i.test(a.text) || /contact|quote/i.test(a.href)));
      console.log('Contact links found:', links.slice(0, 5));

      // Look for forms
      const forms = await page.$$eval('form', fs => fs.map(f => ({
        id: f.id,
        action: f.action,
        method: f.method,
        inputs: Array.from(f.querySelectorAll('input, textarea, select')).map(i => ({
          type: i.type,
          name: i.name,
          id: i.id,
          placeholder: i.placeholder,
          required: i.required
        }))
      })));
      console.log(`Forms found: ${forms.length}`);
      if (forms.length > 0) {
        console.log(JSON.stringify(forms, null, 2));
      }

      // Check for captchas
      const captcha = await page.evaluate(() => {
        const hasRecaptcha = !!document.querySelector('.g-recaptcha, iframe[src*="recaptcha"], [data-sitekey]');
        const hasHCaptcha = !!document.querySelector('.h-captcha, iframe[src*="hcaptcha"]');
        const hasTurnstile = !!document.querySelector('.cf-turnstile, iframe[src*="turnstile"]');
        return { hasRecaptcha, hasHCaptcha, hasTurnstile };
      });
      console.log('Captcha presence:', captcha);

    } catch (e) {
      console.log(`Error navigating to ${targetUrl}:`, e.message);
    } finally {
      await page.close();
    }
  }

  await browser.close();
}

main().catch(console.error);
