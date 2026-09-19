import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());
const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const leads = [
  { id: 580, name: 'Lee & Lee', url: 'http://leenlee.net' },
  { id: 581, name: 'PSFEG', url: 'https://psfeg.com' },
  { id: 583, name: 'Brandow & Johnston', url: 'https://bjsce.com' },
  { id: 584, name: 'Cordoba Corp', url: 'https://cordobacorp.com' },
  { id: 585, name: 'Brown and Caldwell', url: 'https://brownandcaldwell.com' },
  { id: 586, name: 'AMIA Engineering', url: 'https://amiaengineering.com' },
  { id: 587, name: 'Omega Structural', url: 'https://omegastructuralinc.com' },
  { id: 590, name: 'LA Engineering', url: 'https://laeng.net' },
  { id: 591, name: 'Sierra consulting', url: 'https://sierra-eng.com' }
];

async function check() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  for (const l of leads) {
    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(25000);
    try {
      console.log(`\n--- Checking #${l.id} ${l.name} (${l.url}) ---`);
      let resp;
      try {
        resp = await page.goto(l.url, { waitUntil: 'domcontentloaded', timeout: 15000 });
      } catch (e) {
        if (l.url.startsWith('https://')) {
          console.log(`HTTPS failed (${e.message}), trying HTTP...`);
          resp = await page.goto(l.url.replace('https://', 'http://'), { waitUntil: 'domcontentloaded', timeout: 15000 });
        } else {
          throw e;
        }
      }
      console.log('Status:', resp ? resp.status() : 'none', 'Current URL:', page.url());
      const title = await page.title();
      console.log('Title:', title);

      const links = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('a'))
          .map(a => ({ text: a.innerText.trim(), href: a.href }))
          .filter(a => /contact|about|touch|reach|get-in-touch/i.test(a.text) || /contact/i.test(a.href));
      });
      console.log('Contact links:', JSON.stringify(links.slice(0, 5)));

      const forms = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('form')).map(f => ({
          action: f.action,
          method: f.method,
          inputs: Array.from(f.querySelectorAll('input,textarea,select')).map(i => ({
            tag: i.tagName.toLowerCase(),
            name: i.name,
            id: i.id,
            type: i.type,
            placeholder: i.placeholder
          }))
        }));
      });
      console.log('Forms on main page:', forms.length, JSON.stringify(forms, null, 2));

      // Also check iframes
      const iframes = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('iframe')).map(f => f.src);
      });
      if (iframes.length > 0) {
        console.log('Iframes found:', JSON.stringify(iframes));
      }

    } catch (e) {
      console.log(`Error checking #${l.id}:`, e.message);
    } finally {
      await page.close();
    }
  }
  await browser.close();
}

check();
