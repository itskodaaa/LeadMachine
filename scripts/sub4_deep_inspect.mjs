import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

async function inspectSite(url, name) {
  console.log(`\n=== Inspecting ${name} (${url}) ===`);
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    timeout: 30000,
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  try {
    const res = await page.goto(url, { waitUntil: 'networkidle2', timeout: 20000 }).catch(e => {
      console.log(`Goto failed: ${e.message}`);
      return null;
    });

    if (!res) {
      console.log('Retrying with http...');
      await page.goto(url.replace('https://', 'http://'), { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(e => console.log('Http failed:', e.message));
    }

    const currentUrl = page.url();
    const title = await page.title();
    console.log(`Final URL: ${currentUrl}, Title: ${title}`);

    const forms = await page.evaluate(() => {
      const allForms = Array.from(document.querySelectorAll('form'));
      return allForms.map((f, idx) => ({
        index: idx,
        action: f.getAttribute('action'),
        method: f.getAttribute('method'),
        id: f.id,
        className: f.className,
        inputs: Array.from(f.querySelectorAll('input, textarea, select, button')).map(el => ({
          tag: el.tagName.toLowerCase(),
          type: el.getAttribute('type'),
          name: el.getAttribute('name'),
          id: el.id,
          placeholder: el.placeholder,
          required: el.required
        }))
      }));
    });

    console.log(`Forms found: ${forms.length}`);
    forms.forEach(f => console.log(JSON.stringify(f, null, 2)));

    // Check contact links
    const contactLinks = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a[href]'));
      return links
        .map(a => ({ text: a.innerText?.trim(), href: a.href }))
        .filter(l => /contact|quote|about|touch/i.test(l.text) || /contact|quote/i.test(l.href));
    });
    console.log(`Contact links:`, contactLinks);

    // Check captchas
    const captchas = await page.evaluate(() => {
      const els = Array.from(document.querySelectorAll('.g-recaptcha, iframe[src*="recaptcha"], iframe[src*="hcaptcha"], iframe[src*="turnstile"], .cf-turnstile, [data-sitekey]'));
      return els.map(e => ({ tag: e.tagName, class: e.className, src: e.getAttribute('src'), sitekey: e.getAttribute('data-sitekey') }));
    });
    console.log(`Captchas:`, captchas);

  } catch (err) {
    console.log(`Error inspecting ${name}:`, err.message);
  } finally {
    await browser.close();
  }
}

async function run() {
  await inspectSite('https://twistedmetalswelding.com', '#4592 Twisted Metals');
  await inspectSite('https://slightofhandmetalworks.com', '#4594 Slight of Hand Metalworks');
  await inspectSite('https://martinmetalworks.co', '#4595 Martin Metalworks');
  await inspectSite('https://westbrookmetals.com', '#4597 Westbrook Metals');
  await inspectSite('https://weldingaustin.com', '#4599 Welding Shop');
}

run();
