import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const leads = [
  { id: 4149, name: 'United Engineers, Inc.', url: 'https://unitede.com' },
  { id: 4150, name: 'Pepe Engineering', url: 'https://pepe-engineering.com' },
  { id: 4152, name: 'Jarvis Civil Engineering', url: 'https://jarvisciveng.com' },
  { id: 4153, name: 'DEC', url: 'https://decorp.com' },
  { id: 4154, name: 'Fabric Estimating LLC', url: 'https://fabricestimating.us' },
  { id: 4155, name: 'Stanford Engineering, LLC', url: 'https://stanfordeng.com' },
  { id: 4156, name: 'MEZGA Consulting Engineering', url: 'https://mezgaconsulting.com' },
  { id: 4157, name: 'MOMENTUM STRUCTURAL ENGINEERING LLC', url: 'https://msetexas.com' },
  { id: 4158, name: 'Atlas Foundation Repair', url: 'https://atlasfoundation.net' }
];

async function runDiag() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  for (const lead of leads) {
    console.log(`\n========================================`);
    console.log(`Checking Lead #${lead.id}: ${lead.name} (${lead.url})`);
    const page = await browser.newPage();
    page.on('dialog', async d => { await d.dismiss(); });
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');

    try {
      await page.goto(lead.url, { waitUntil: 'domcontentloaded', timeout: 15000 });
      console.log(`Loaded URL: ${page.url()}`);
      const title = await page.title();
      console.log(`Title: ${title}`);

      // Check contact links
      const links = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('a'))
          .map(a => ({ text: a.innerText.trim(), href: a.href }))
          .filter(a => /contact|reach|touch|quote|estimate/i.test(a.text) || /contact/i.test(a.href));
      });
      console.log(`Contact Links found:`, links.slice(0, 5));

      // Check forms on current page
      const formsInfo = await page.evaluate(() => {
        const forms = Array.from(document.querySelectorAll('form'));
        return forms.map((f, i) => ({
          index: i,
          action: f.action,
          method: f.method,
          inputs: Array.from(f.querySelectorAll('input, textarea, select')).map(el => ({
            tag: el.tagName.toLowerCase(),
            type: el.type || '',
            name: el.name || '',
            id: el.id || '',
            placeholder: el.placeholder || '',
            required: el.required
          }))
        }));
      });
      console.log(`Forms on main page:`, JSON.stringify(formsInfo, null, 2));

      // Check if contact page exists and examine it
      if (links.length > 0 && formsInfo.length === 0) {
        const contactHref = links[0].href;
        console.log(`Navigating to contact page: ${contactHref}`);
        await page.goto(contactHref, { waitUntil: 'domcontentloaded', timeout: 15000 });
        console.log(`Contact Page URL: ${page.url()}`);
        const cForms = await page.evaluate(() => {
          const forms = Array.from(document.querySelectorAll('form'));
          return forms.map((f, i) => ({
            index: i,
            action: f.action,
            method: f.method,
            inputs: Array.from(f.querySelectorAll('input, textarea, select')).map(el => ({
              tag: el.tagName.toLowerCase(),
              type: el.type || '',
              name: el.name || '',
              id: el.id || '',
              placeholder: el.placeholder || '',
              required: el.required
            }))
          }));
        });
        console.log(`Forms on contact page:`, JSON.stringify(cForms, null, 2));
      }

    } catch (e) {
      console.log(`Error navigating ${lead.url}:`, e.message);
    } finally {
      await page.close();
    }
  }

  await browser.close();
}

runDiag();
