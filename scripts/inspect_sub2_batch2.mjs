import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const targets = [
  { id: 2533, name: 'Paragon Homes', url: 'https://paragonhomesdenver.com' },
  { id: 2535, name: 'Saunders Construction Inc.', url: 'https://saundersinc.com' },
  { id: 2536, name: 'Colas Inc', url: 'https://colasusa.com' },
  { id: 2537, name: 'Global Construction, LLC', url: 'https://globalconstructionco.com' },
  { id: 2538, name: 'M&C Construction, LLC', url: 'https://mendelandcompany.com' },
  { id: 2542, name: 'Altitude Contracting', url: 'https://altitudecontracting.com' },
  { id: 2544, name: 'Coggeshall Construction', url: 'https://coggeshall.com' }
];

async function run() {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: CHROME_BIN,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  for (const t of targets) {
    console.log(`\n=== Checking #${t.id} ${t.name} (${t.url}) ===`);
    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(25000);
    try {
      await page.goto(t.url, { waitUntil: 'domcontentloaded', timeout: 20000 });
      console.log('Final URL:', page.url(), '| Title:', await page.title());

      const links = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('a'))
          .filter(a => /contact|reach|quote|touch|about/i.test(a.innerText || a.href))
          .map(a => ({ text: a.innerText.trim(), href: a.href }));
      });
      console.log('Contact links:', JSON.stringify(links.slice(0, 4)));

      const forms = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('form')).map(f => ({
          action: f.action,
          method: f.method,
          id: f.id,
          inputs: Array.from(f.querySelectorAll('input:not([type="hidden"]), textarea, button')).map(i => ({
            tag: i.tagName, type: i.type, name: i.name, id: i.id, placeholder: i.placeholder, text: i.innerText
          }))
        }));
      });
      console.log('Forms on page:', forms.length);
      forms.forEach((f, i) => console.log(`Form ${i}: action=${f.action}, inputs=${f.inputs.length}`));

    } catch (e) {
      console.log('Nav error:', e.message);
    } finally {
      await page.close().catch(() => {});
    }
  }

  await browser.close();
}

run();
