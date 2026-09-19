import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';
import db from './db.mjs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

const leadIds = [4051, 4052, 4053, 4054, 4055, 4056, 4057, 4058, 4059, 4060];
const leads = db.prepare(`SELECT id, company_name, website, status, notes FROM leads WHERE id IN (${leadIds.join(',')}) ORDER BY id ASC`).all();

async function diagnose() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  for (const lead of leads) {
    console.log(`\n======================================================`);
    console.log(`Checking #${lead.id}: ${lead.company_name} (${lead.website})`);
    const page = await browser.newPage();
    page.on('dialog', async d => { console.log(`Dialog: ${d.message()}`); await d.dismiss(); });

    let reachable = false;
    let finalUrl = '';
    const testUrls = [
      lead.website.startsWith('http') ? lead.website : `https://${lead.website}`,
      lead.website.startsWith('http') ? lead.website : `http://${lead.website}`,
      lead.website.startsWith('http') ? lead.website : `https://www.${lead.website}`,
      lead.website.startsWith('http') ? lead.website : `http://www.${lead.website}`
    ];

    for (const u of testUrls) {
      try {
        const resp = await page.goto(u, { waitUntil: 'domcontentloaded', timeout: 12000 });
        console.log(`Loaded ${u} -> status: ${resp ? resp.status() : 'none'}, current: ${page.url()}`);
        reachable = true;
        finalUrl = page.url();
        break;
      } catch (err) {
        console.log(`Failed loading ${u}: ${err.message}`);
      }
    }

    if (!reachable) {
      console.log(`RESULT: Inaccessible`);
      await page.close();
      continue;
    }

    // Inspect page structure
    const pageData = await page.evaluate(() => {
      const title = document.title;
      const forms = Array.from(document.querySelectorAll('form')).map((f, idx) => ({
        idx,
        action: f.action,
        method: f.method,
        id: f.id,
        className: f.className,
        inputCount: f.querySelectorAll('input:not([type="hidden"]), textarea, select').length,
        inputs: Array.from(f.querySelectorAll('input, textarea, select, button')).map(i => ({
          tag: i.tagName,
          type: i.type,
          name: i.name,
          id: i.id,
          placeholder: i.placeholder,
          text: i.innerText
        }))
      }));

      const captchas = Array.from(document.querySelectorAll('.g-recaptcha, iframe[src*="recaptcha"], iframe[src*="hcaptcha"], iframe[src*="turnstile"], .cf-turnstile, [data-sitekey]')).map(c => ({
        tag: c.tagName,
        src: c.getAttribute('src'),
        class: c.className
      }));

      const contactLinks = Array.from(document.querySelectorAll('a[href]'))
        .filter(a => /contact|quote|reach|get-in-touch/i.test((a.innerText || '') + ' ' + (a.getAttribute('href') || '')))
        .map(a => ({ text: a.innerText.trim(), href: a.href }));

      return { title, forms, captchas, contactLinks: contactLinks.slice(0, 5) };
    });

    console.log(`Title: ${pageData.title}`);
    console.log(`Forms found: ${pageData.forms.length}`);
    console.log(`Captchas found: ${pageData.captchas.length}`, pageData.captchas);
    console.log(`Contact links:`, pageData.contactLinks);

    if (pageData.forms.length === 0 && pageData.contactLinks.length > 0) {
      const contactUrl = pageData.contactLinks[0].href;
      console.log(`Navigating to contact link: ${contactUrl}`);
      try {
        await page.goto(contactUrl, { waitUntil: 'domcontentloaded', timeout: 12000 });
        const subData = await page.evaluate(() => {
          const forms = Array.from(document.querySelectorAll('form')).map((f, idx) => ({
            idx,
            action: f.action,
            method: f.method,
            id: f.id,
            className: f.className,
            inputCount: f.querySelectorAll('input:not([type="hidden"]), textarea, select').length,
            inputs: Array.from(f.querySelectorAll('input, textarea, select, button')).map(i => ({
              tag: i.tagName,
              type: i.type,
              name: i.name,
              id: i.id,
              placeholder: i.placeholder,
              text: i.innerText
            }))
          }));
          const captchas = Array.from(document.querySelectorAll('.g-recaptcha, iframe[src*="recaptcha"], iframe[src*="hcaptcha"], iframe[src*="turnstile"], .cf-turnstile, [data-sitekey]')).map(c => ({
            tag: c.tagName,
            src: c.getAttribute('src'),
            class: c.className
          }));
          return { url: window.location.href, forms, captchas };
        });
        console.log(`Contact page forms: ${subData.forms.length}, captchas: ${subData.captchas.length}`, subData);
      } catch (e) {
        console.log(`Failed navigating to contact page: ${e.message}`);
      }
    }

    await page.close();
  }

  await browser.close();
}

diagnose();
