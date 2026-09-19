import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import db from './db.mjs';

puppeteer.use(StealthPlugin());

import fs from 'fs';

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const leadIds = [3300, 3301, 3302, 3303, 3304, 3305, 3306, 3307];

async function inspect() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  for (const id of leadIds) {
    const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(id);
    const page = await browser.newPage();
    console.log(`\n========================================\n--- Inspecting #${lead.id} ${lead.company_name} (${lead.website}) ---`);
    try {
      await page.goto(lead.website.startsWith('http') ? lead.website : 'https://' + lead.website, { waitUntil: 'domcontentloaded', timeout: 15000 });
      console.log('Current URL:', page.url());
      console.log('Title:', await page.title());

      // Look for contact links
      const links = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('a[href]'))
          .map(a => ({ text: a.innerText.trim(), href: a.href }))
          .filter(a => /contact|inquir|quote|reach/i.test(a.text) || /contact|inquir|quote/i.test(a.href))
          .slice(0, 5);
      });
      console.log('Contact links:', links);

      const checkPageForms = async () => {
        return await page.evaluate(() => {
          return Array.from(document.querySelectorAll('form')).map(f => ({
            action: f.action,
            id: f.id,
            inputs: Array.from(f.querySelectorAll('input, textarea, select')).map(i => ({
              tag: i.tagName,
              name: i.name,
              id: i.id,
              type: i.type,
              placeholder: i.placeholder,
              required: i.required,
              classes: i.className
            })),
            buttons: Array.from(f.querySelectorAll('button, input[type="submit"]')).map(b => b.innerText || b.value),
            hasRecaptcha: !!f.querySelector('.g-recaptcha, iframe[src*="recaptcha"], iframe[src*="turnstile"], [data-sitekey]')
          }));
        });
      };

      let forms = await checkPageForms();
      console.log('Forms on initial page:', JSON.stringify(forms, null, 2));

      if ((!forms || forms.length === 0 || forms.every(f => f.inputs.length < 2)) && links.length > 0) {
        console.log('Navigating to contact link:', links[0].href);
        await page.goto(links[0].href, { waitUntil: 'domcontentloaded', timeout: 15000 });
        console.log('Contact Page URL:', page.url());
        forms = await checkPageForms();
        console.log('Forms on contact page:', JSON.stringify(forms, null, 2));
      }
    } catch (e) {
      console.log('Error inspecting:', e.message);
    } finally {
      await page.close();
    }
  }
  await browser.close();
}

inspect();
