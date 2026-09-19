import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const targets = [
  { id: 5000, url: 'https://pase.com' },
  { id: 5003, url: 'https://uandr.com' },
  { id: 5004, url: 'https://daedalus-eng.com' },
  { id: 5006, url: 'https://structuralengineersinc.com' },
  { id: 5007, url: 'https://cnmengineering.com' },
  { id: 5009, url: 'https://kipsengineering.com' }
];

async function run() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  for (const t of targets) {
    const page = await browser.newPage();
    try {
      console.log(`\n=== Inspecting #${t.id}: ${t.url} ===`);
      await page.goto(t.url, { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(e => console.log('goto err:', e.message));
      
      const currentUrl = page.url();
      const title = await page.title();
      console.log(`Loaded URL: ${currentUrl} | Title: ${title}`);

      // Check contact links
      const links = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('a[href]'))
          .map(a => ({ text: (a.innerText || '').trim(), href: a.href }))
          .filter(a => /contact|inquir|about|quote|get-in-touch/i.test(a.text) || /contact/i.test(a.href));
      });
      console.log('Contact links found:', links.slice(0, 5));

      // Inspect forms on current page
      const formsInfo = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('form')).map((f, i) => {
          const action = f.getAttribute('action') || '';
          const method = f.getAttribute('method') || '';
          const inputs = Array.from(f.querySelectorAll('input, textarea, select')).map(inp => ({
            tag: inp.tagName.toLowerCase(),
            type: inp.getAttribute('type') || '',
            name: inp.getAttribute('name') || '',
            id: inp.getAttribute('id') || '',
            placeholder: inp.getAttribute('placeholder') || '',
            required: inp.hasAttribute('required')
          }));
          return { index: i, action, method, inputs };
        });
      });
      console.log('Forms on page:', JSON.stringify(formsInfo, null, 2));

    } catch (e) {
      console.log(`Error inspecting ${t.id}:`, e.message);
    } finally {
      await page.close().catch(() => {});
    }
  }

  await browser.close();
}

run();
