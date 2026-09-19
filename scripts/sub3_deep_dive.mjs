import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

async function investigate(url, name) {
  console.log(`\n======================================================`);
  console.log(`Investigating ${name}: ${url}`);
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  try {
    const res = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
    console.log(`Final URL: ${page.url()} (Status: ${res?.status()})`);
    const title = await page.title();
    console.log(`Title: ${title}`);

    // Forms
    const forms = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('form')).map((f, i) => ({
        index: i,
        action: f.action,
        method: f.method,
        id: f.id,
        className: f.className,
        inputs: Array.from(f.querySelectorAll('input, textarea, select')).map(el => ({
          tag: el.tagName,
          type: el.type,
          name: el.name,
          id: el.id,
          placeholder: el.placeholder,
          required: el.required
        }))
      }));
    });
    console.log(`Forms found: ${forms.length}`);
    forms.forEach(f => console.log(JSON.stringify(f, null, 2)));

    // Links to contact / quote
    const links = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('a[href]'))
        .map(a => ({ href: a.href, text: a.innerText.trim().replace(/\s+/g, ' ') }))
        .filter(a => /contact|quote|reach|touch|estimate|inquir/i.test(a.text) || /contact|quote|inquir/i.test(a.href))
        .slice(0, 10);
    });
    console.log(`Contact links:`, links);

    // Any captcha
    const captchas = await page.evaluate(() => {
      const c = document.querySelectorAll('.g-recaptcha, iframe[src*="recaptcha"], iframe[src*="hcaptcha"], iframe[src*="turnstile"], .cf-turnstile, [data-sitekey]');
      return Array.from(c).map(el => el.outerHTML.slice(0, 150));
    });
    console.log(`Captchas:`, captchas);

  } catch (err) {
    console.log(`Error: ${err.message}`);
  } finally {
    await browser.close();
  }
}

async function run() {
  await investigate('https://metalworkscorp.com', 'Metalworks #1835');
  await investigate('https://metalworkscorp.com/contact-us/', 'Metalworks #1835 Contact');
  await investigate('https://protechmachinetool.com', 'Protech #1814');
  await investigate('https://southernmanufacturing.com', 'Southern Mfg #1829');
  await investigate('https://cnczarmachine.com', 'CNC Zar #1816');
  await investigate('https://cavmachine.com', 'Cavanaugh #1818');
  await investigate('https://toomacengineering.com', 'Too Mac #1821');
}

run();
