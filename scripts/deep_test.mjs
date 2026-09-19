import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';
import db from './db.mjs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const leadId = parseInt(process.argv[2], 10);

async function inspectUrl(url) {
  console.log(`\n========================================`);
  console.log(`🔍 Inspecting URL: ${url}`);
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    timeout: 30000,
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  page.on('dialog', async d => { console.log('Dialog popped:', d.message()); await d.accept(); });
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));

  try {
    const res = await page.goto(url, { waitUntil: 'networkidle2', timeout: 20000 });
    console.log('Final URL:', page.url());
    console.log('Status:', res ? res.status() : 'null');
    console.log('Title:', await page.title());

    // Check all forms and iframes
    const forms = await page.evaluate(() => {
      const list = [];
      document.querySelectorAll('form').forEach((f, idx) => {
        const inputs = Array.from(f.querySelectorAll('input, textarea, select, button')).map(el => ({
          tag: el.tagName.toLowerCase(),
          type: el.type,
          name: el.name,
          id: el.id,
          placeholder: el.placeholder,
          visible: el.offsetParent !== null,
          required: el.required
        }));
        list.push({ idx, id: f.id, action: f.action, inputs });
      });
      return list;
    });
    console.log('Forms:', JSON.stringify(forms, null, 2));

    const iframes = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('iframe')).map(f => f.src);
    });
    console.log('Iframes:', iframes);

    const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 500));
    console.log('Body snippet:\n', bodyText);
  } catch (err) {
    console.error('Inspect error:', err.message);
  } finally {
    await browser.close();
  }
}

const targetUrls = {
  3418: ['https://hactexas.com/contact', 'https://hactexas.com'],
  3419: ['https://teamconsultants.net', 'https://www.teamconsultants.net/contact'],
  3420: ['https://hpmbengineers.com', 'https://hpmbengineers.com/contact'],
  3421: ['https://dragonstreetlaser.com', 'https://dragonstreetlaser.com/contact'],
  3422: ['https://mageemachine.com', 'https://www.mageemachine.com/contact-us'],
  3423: ['https://keithmachine.com', 'https://keithmachine.com/contact-us'],
  3424: ['https://optimummetrology.com', 'https://optimummetrology.com/contact'],
  3425: ['https://mspace.com/request-for-quote', 'https://mspace.com/contact'],
  3426: ['https://hhmercer.com', 'https://hhmercer.com/contact'],
  3427: ['https://camtroninc.com', 'https://camtroninc.com/contact']
};

async function run() {
  const urls = targetUrls[leadId] || [process.argv[2]];
  for (const u of urls) {
    await inspectUrl(u);
  }
}

run();
