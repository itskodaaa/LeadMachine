import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

async function checkPage(url, name) {
  console.log(`\n======================================================`);
  console.log(`Checking ${name}: ${url}`);
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  try {
    const res = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
    console.log(`Loaded URL: ${page.url()} (Status: ${res?.status()})`);
    
    // Check if any iframes exist
    const iframes = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('iframe')).map(f => f.src);
    });
    console.log(`Iframes:`, iframes);

    // Check forms
    const formData = await page.evaluate(() => {
      const forms = Array.from(document.querySelectorAll('form'));
      return forms.map((f, i) => ({
        index: i,
        action: f.action,
        id: f.id,
        className: f.className,
        inputs: Array.from(f.querySelectorAll('input:not([type="hidden"]), textarea, select')).map(el => ({
          tag: el.tagName,
          type: el.type,
          name: el.name,
          id: el.id,
          placeholder: el.placeholder,
          required: el.required
        }))
      }));
    });
    console.log(`Forms:`, JSON.stringify(formData, null, 2));

    // Captchas
    const captchas = await page.evaluate(() => {
      const c = document.querySelectorAll('.g-recaptcha, iframe[src*="recaptcha"], iframe[src*="hcaptcha"], iframe[src*="turnstile"], .cf-turnstile, [data-sitekey]');
      return Array.from(c).map(el => el.outerHTML.slice(0, 150));
    });
    console.log(`Captchas:`, captchas);

    // Page text snippet / email addresses
    const textInfo = await page.evaluate(() => {
      const body = document.body ? document.body.innerText : '';
      const emails = (body.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || []);
      const phones = (body.match(/\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g) || []);
      return {
        hasEmail: Array.from(new Set(emails)).slice(0, 5),
        hasPhone: Array.from(new Set(phones)).slice(0, 5),
        snippet: body.slice(0, 300).replace(/\s+/g, ' ')
      };
    });
    console.log(`Text info:`, textInfo);

  } catch (err) {
    console.log(`Error on ${name}: ${err.message}`);
  } finally {
    await browser.close();
  }
}

async function run() {
  await checkPage('https://www.protechmachinetool.com/contact-us', 'Protech #1814 Contact');
  await checkPage('https://calmachine.com', 'California Machine #1815');
  await checkPage('https://anaheimmachining.com', 'Arrow Machining #1817');
  await checkPage('https://cavmachine.com/contact-us', 'Cavanaugh #1818 Contact');
  await checkPage('https://toomacengineering.com/contact', 'Too Mac #1821 Contact');
  await checkPage('https://southernmanufacturing.com/contact-us/', 'Southern Mfg #1829 Contact');
  await checkPage('https://metalworkscorp.com/contact', 'Metalworks #1835 Contact');
}

run();
