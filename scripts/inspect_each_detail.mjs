import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

async function check(name, url) {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');

  console.log(`\n========================================\n[${name}] ${url}`);
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 20000 });
    console.log(`Current URL: ${page.url()}`);
    const forms = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('form')).map((f, i) => {
        const fields = Array.from(f.querySelectorAll('input, textarea, select, button')).map(el => ({
          tag: el.tagName,
          type: el.type,
          name: el.name,
          id: el.id,
          placeholder: el.placeholder,
          required: el.required,
          visible: el.offsetWidth > 0 && el.offsetHeight > 0,
          classes: el.className
        }));
        return { formIndex: i, action: f.action, id: f.id, className: f.className, fields };
      });
    });
    console.log(`Found ${forms.length} forms:`, JSON.stringify(forms, null, 2));
  } catch (e) {
    console.error(`Error: ${e.message}`);
  } finally {
    await browser.close();
  }
}

async function run() {
  const lead = process.argv[2];
  if (lead === '1179') await check('LM3', 'https://www.lm3technologies.com/contact');
  if (lead === '1184') await check('GMMCO', 'https://www.gmmco.com/contact-us');
  if (lead === '1187') await check('DMC', 'https://www.dmcinfo.com/contact/');
  if (lead === '1188') await check('LogicGate', 'https://logicgate-engineering.com/');
  if (lead === '1191') await check('Kocsis', 'https://www.kocsisusa.com/request-for-a-quote/');
  if (lead === '1202') await check('CdT', 'https://cdtcncmachiningservices.com/');
}

run();
