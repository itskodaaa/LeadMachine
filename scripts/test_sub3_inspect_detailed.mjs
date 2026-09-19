import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const testLeads = [
  { id: 3871, name: 'Eagle Precision Machining', url: 'https://eagleprecisionmachining.com' },
  { id: 3861, name: 'Moffatt & Nichol', url: 'https://moffattnichol.com' },
  { id: 3867, name: '3D Pros', url: 'https://3dpros.online' },
  { id: 3863, name: 'Keller Mechanical', url: 'https://kellermechanical.com' }
];

async function run() {
  const browser = await puppeteer.launch({
    headless: "new",
    executablePath: CHROME_BIN,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
  });

  for (const lead of testLeads) {
    console.log(`\n--- Inspecting ${lead.id} ${lead.name} (${lead.url}) ---`);
    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(30000);
    try {
      const resp = await page.goto(lead.url, { waitUntil: 'domcontentloaded' });
      console.log(`Loaded ${page.url()} with status ${resp?.status()}`);
      
      // Look for contact links
      const links = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('a'))
          .map(a => ({ text: a.innerText.trim(), href: a.href }))
          .filter(a => /contact|quote|about|reach/i.test(a.text) || /contact|quote/i.test(a.href));
      });
      console.log('Contact links found:', links.slice(0, 5));

      // Look for forms on current page
      const forms = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('form')).map((f, i) => {
          return {
            id: f.id,
            action: f.action,
            method: f.method,
            inputs: Array.from(f.querySelectorAll('input, textarea, select')).map(el => ({
              name: el.name,
              type: el.type,
              id: el.id,
              placeholder: el.placeholder,
              required: el.required
            }))
          };
        });
      });
      console.log(`Forms found on homepage (${forms.length}):`, JSON.stringify(forms, null, 2));

      // If contact link exists, let's also check contact page
      const contactLink = links.find(l => /contact/i.test(l.text) || /contact/i.test(l.href));
      if (contactLink && contactLink.href !== page.url()) {
        console.log(`Navigating to contact link: ${contactLink.href}`);
        await page.goto(contactLink.href, { waitUntil: 'domcontentloaded', timeout: 20000 });
        const cForms = await page.evaluate(() => {
          return Array.from(document.querySelectorAll('form')).map((f, i) => {
            return {
              id: f.id,
              action: f.action,
              method: f.method,
              inputs: Array.from(f.querySelectorAll('input, textarea, select')).map(el => ({
                name: el.name,
                type: el.type,
                id: el.id,
                placeholder: el.placeholder,
                required: el.required
              }))
            };
          });
        });
        console.log(`Forms on contact page (${cForms.length}):`, JSON.stringify(cForms, null, 2));
      }

    } catch (err) {
      console.error(`Error on ${lead.name}:`, err.message);
    } finally {
      await page.close();
    }
  }

  await browser.close();
}

run();
