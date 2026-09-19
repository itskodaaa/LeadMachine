import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import db from './db.mjs';

import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const leads = [4005, 4006, 4007, 4008, 4009, 4010, 4011, 4012, 4014];

async function inspect() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  for (const id of leads) {
    const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(id);
    console.log(`\n========================================`);
    console.log(`Inspecting Lead #${lead.id}: ${lead.company_name} - ${lead.website}`);
    const page = await browser.newPage();
    page.on('dialog', async d => { console.log(`Dialog: ${d.message()}`); await d.dismiss(); });

    let url = lead.website.startsWith('http') ? lead.website : 'https://' + lead.website;
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
      console.log(`Main page loaded: ${page.url()}`);

      // Check contact links
      const contactLinks = await page.$$eval('a[href]', links => 
        links.map(a => ({ text: a.innerText.trim(), href: a.href }))
          .filter(a => /contact|reach|about|inquir/i.test(a.text) || /contact/i.test(a.href))
      );
      console.log(`Contact links found:`, contactLinks.slice(0, 5));

      // Check forms on current page
      const forms = await page.$$eval('form', forms => forms.map(f => ({
        id: f.id,
        name: f.name,
        action: f.action,
        method: f.method,
        inputs: Array.from(f.querySelectorAll('input, textarea, select, button')).map(i => ({
          type: i.type,
          name: i.name,
          id: i.id,
          placeholder: i.placeholder,
          tagName: i.tagName,
          text: i.innerText
        }))
      })));
      console.log(`Forms found on current page: ${forms.length}`);
      if (forms.length > 0) {
        console.log(`Form details:`, JSON.stringify(forms, null, 2));
      }

      // Check emails or phone numbers on page
      const pageText = await page.evaluate(() => document.body.innerText);
      const emails = pageText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
      const uniqueEmails = [...new Set(emails)].filter(e => !e.endsWith('.png') && !e.endsWith('.jpg'));
      console.log(`Emails on page:`, uniqueEmails);

    } catch (e) {
      console.log(`Error visiting ${url}:`, e.message);
      // Try with http or www if failed
      try {
        const altUrl = url.includes('www.') ? url.replace('www.', '') : url.replace('://', '://www.');
        console.log(`Trying alternative: ${altUrl}`);
        await page.goto(altUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
        console.log(`Alternative loaded: ${page.url()}`);
      } catch (err2) {
        console.log(`Alternative also failed:`, err2.message);
      }
    } finally {
      await page.close();
    }
  }

  await browser.close();
}

inspect();
