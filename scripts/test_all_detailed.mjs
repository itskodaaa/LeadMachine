import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';
import db from './db.mjs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const leadIds = [3418, 3419, 3420, 3421, 3422, 3423, 3424, 3425, 3426, 3427];

async function checkLead(browser, id) {
  const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(id);
  console.log(`\n============================================================`);
  console.log(`[Lead #${id}] ${lead.company_name} | Website: ${lead.website}`);

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');

  page.on('dialog', async d => {
    console.log(`[#${id} DIALOG]`, d.message());
    await d.accept();
  });

  try {
    let url = lead.website;
    if (!url.startsWith('http')) url = 'https://' + url;

    console.log(`Navigating to ${url}...`);
    try {
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 15000 });
    } catch (e) {
      console.log(`Failed initial load: ${e.message}, trying http...`);
      url = url.replace('https://', 'http://');
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(err => console.log('Http also failed:', err.message));
    }

    console.log(`Current URL: ${page.url()}`);
    console.log(`Title: ${await page.title()}`);

    // Find contact link
    const contactLinks = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('a[href]'))
        .map(a => ({ text: a.innerText.trim(), href: a.href }))
        .filter(l => /contact|quote|reach|rfq/i.test(l.text) || /contact|quote|rfq/i.test(l.href));
    });
    console.log(`Contact links found:`, contactLinks);

    // If current page doesn't have a form, navigate to contact link if available
    let hasForm = await page.evaluate(() => document.querySelectorAll('form').length > 0);
    if (!hasForm && contactLinks.length > 0) {
      const best = contactLinks.find(l => !l.href.includes('#') && !l.href.startsWith('mailto:')) || contactLinks[0];
      if (best && best.href && !best.href.startsWith('mailto:')) {
        console.log(`Navigating to contact page: ${best.href}`);
        await page.goto(best.href, { waitUntil: 'networkidle2', timeout: 15000 }).catch(e => console.log('Contact nav error:', e.message));
        console.log(`Now at: ${page.url()}`);
      }
    }

    // Inspect forms
    const forms = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('form')).map((f, idx) => {
        const inputs = Array.from(f.querySelectorAll('input, textarea, select, button')).map(el => ({
          tag: el.tagName.toLowerCase(),
          type: el.type || '',
          name: el.name || '',
          id: el.id || '',
          required: el.required || false,
          placeholder: el.placeholder || '',
          visible: el.offsetParent !== null
        }));
        const captchas = Array.from(f.querySelectorAll('.g-recaptcha, iframe[src*="recaptcha"], iframe[src*="hcaptcha"], iframe[src*="turnstile"], .cf-turnstile, [data-sitekey]')).map(c => c.outerHTML.slice(0, 100));
        return { idx, action: f.action, inputs, captchas };
      });
    });

    console.log(`Forms found (${forms.length}):`, JSON.stringify(forms, null, 2));

    const emailLinks = await page.evaluate(() => Array.from(document.querySelectorAll('a[href^="mailto:"]')).map(a => a.href));
    const phoneLinks = await page.evaluate(() => Array.from(document.querySelectorAll('a[href^="tel:"]')).map(a => a.href));
    console.log(`Emails: ${emailLinks.join(', ')} | Phones: ${phoneLinks.join(', ')}`);

  } catch (err) {
    console.error(`Error on #${id}:`, err.message);
  } finally {
    await page.close().catch(() => {});
  }
}

async function main() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    timeout: 30000,
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  for (const id of leadIds) {
    await checkLead(browser, id);
  }

  await browser.close();
}

main();
