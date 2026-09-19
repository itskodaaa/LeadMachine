import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import db from './db.mjs';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const leads = [
  { id: 5432, url: 'https://infrateng.com' },
  { id: 5437, url: 'https://dokkenengineering.com' },
  { id: 5438, url: 'https://momentengineering.us' }
];

async function inspect() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  for (const lead of leads) {
    console.log(`\n================ Inspecting #${lead.id} (${lead.url}) ================`);
    const page = await browser.newPage();
    page.on('dialog', async d => { console.log(`Dialog: ${d.message()}`); await d.dismiss(); });
    
    try {
      await page.goto(lead.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      console.log('Page Title:', await page.title());
      console.log('Current URL:', page.url());

      // Look for contact link if on home
      const links = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('a[href]')).map(a => ({ text: a.innerText.trim(), href: a.href })).filter(a => /contact|inquir|quote/i.test(a.text) || /contact|inquir|quote/i.test(a.href));
      });
      console.log('Contact links found:', links.slice(0, 5));

      let contactUrl = page.url();
      if (links.length > 0 && !contactUrl.includes('contact')) {
        contactUrl = links[0].href;
        console.log(`Navigating to contact page: ${contactUrl}`);
        await page.goto(contactUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
      }

      // Check forms on contactUrl
      const formInfo = await page.evaluate(() => {
        const forms = Array.from(document.querySelectorAll('form'));
        return forms.map((f, idx) => ({
          idx,
          id: f.id,
          name: f.name,
          action: f.action,
          method: f.method,
          inputs: Array.from(f.querySelectorAll('input, textarea, select, button')).map(el => ({
            tag: el.tagName,
            type: el.type,
            name: el.name,
            id: el.id,
            placeholder: el.placeholder,
            text: el.innerText
          }))
        }));
      });

      console.log('Forms:', JSON.stringify(formInfo, null, 2));

      // Also check if any recaptcha / iframe
      const iframes = await page.evaluate(() => Array.from(document.querySelectorAll('iframe')).map(i => i.src));
      console.log('Iframes:', iframes);

    } catch (e) {
      console.log(`Error on #${lead.id}:`, e.message);
    } finally {
      await page.close();
    }
  }

  await browser.close();
}

inspect();
