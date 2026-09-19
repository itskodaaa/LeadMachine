import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

async function run() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');
  try {
    const res = await page.goto('https://weldingaustin.com', { waitUntil: 'domcontentloaded', timeout: 20000 });
    console.log('Status:', res.status(), 'Title:', await page.title());

    const forms = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('form')).map(f => ({
        id: f.id,
        action: f.action,
        inputs: Array.from(f.querySelectorAll('input, textarea')).map(i => ({ name: i.name, type: i.type, id: i.id }))
      }));
    });
    console.log('Forms:', JSON.stringify(forms, null, 2));

    const contactLinks = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('a[href]'))
        .map(a => ({ text: a.innerText.trim(), href: a.href }))
        .filter(l => /contact|quote/i.test(l.text) || /contact|quote/i.test(l.href));
    });
    console.log('Contact links:', contactLinks);

    const captchas = await page.evaluate(() => {
      const els = document.querySelectorAll('.g-recaptcha, iframe[src*="recaptcha"], iframe[src*="hcaptcha"], iframe[src*="turnstile"], .cf-turnstile, [data-sitekey]');
      return Array.from(els).map(e => ({ tag: e.tagName, src: e.getAttribute('src'), class: e.className }));
    });
    console.log('Captchas:', captchas);

  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await browser.close();
  }
}

run();
