import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const targets = [
  { id: 2665, name: 'Total Construction', url: 'https://totalconstructionandremodeling.com' },
  { id: 2666, name: '360 Construction', url: 'https://360c-d.com' },
  { id: 2667, name: 'Utopio Construction', url: 'https://utopio.io' },
  { id: 2668, name: 'Dakota Contractors', url: 'https://dakotacon.com' },
  { id: 2670, name: 'EarthSky Builders', url: 'https://earthskybuilders.com' },
  { id: 2671, name: 'M2REST', url: 'https://m2rest.com' }
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
    try {
      await page.goto(t.url, { waitUntil: 'domcontentloaded', timeout: 20000 });
      const forms = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('form')).map(f => ({
          action: f.action,
          id: f.id,
          className: f.className,
          inputs: Array.from(f.querySelectorAll('input:not([type="hidden"]), textarea, button')).map(i => ({
            name: i.name, id: i.id, type: i.type, placeholder: i.placeholder, text: i.innerText
          })),
          hasRecaptcha: !!f.querySelector('.g-recaptcha, iframe[src*="recaptcha"], iframe[src*="turnstile"]')
        }));
      });
      console.log('Forms on page:', JSON.stringify(forms, null, 2));
    } catch (e) {
      console.log(`Error on #${t.id}:`, e.message);
    } finally {
      await page.close().catch(() => {});
    }
  }

  await browser.close();
}

run();
