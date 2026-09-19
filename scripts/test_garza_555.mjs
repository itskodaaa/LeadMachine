import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

async function testGarza() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');

  console.log('Navigating to https://www.garzaemc.com ...');
  await page.goto('https://www.garzaemc.com', { waitUntil: 'networkidle2', timeout: 30000 });
  console.log('Loaded Garza EMC. URL:', page.url());

  // Find contact links
  const contactLinks = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('a[href]'))
      .map(a => ({ text: a.innerText.trim(), href: a.href }))
      .filter(a => /contact/i.test(a.text) || /contact/i.test(a.href));
  });
  console.log('Contact links:', contactLinks);

  // If there is a contact page, navigate there
  if (contactLinks.length > 0) {
    console.log('Navigating to contact page:', contactLinks[0].href);
    await page.goto(contactLinks[0].href, { waitUntil: 'networkidle2', timeout: 30000 });
    console.log('Contact page URL:', page.url());
  }

  // Inspect forms
  const formDetails = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('form')).map(f => ({
      id: f.id,
      action: f.action,
      method: f.method,
      html: f.outerHTML.slice(0, 500),
      fields: Array.from(f.querySelectorAll('input, textarea, select, button')).map(el => ({
        tag: el.tagName,
        type: el.type,
        name: el.name,
        id: el.id,
        placeholder: el.placeholder,
        required: el.required
      }))
    }));
  });
  console.log('Forms on Garza EMC:', JSON.stringify(formDetails, null, 2));

  await browser.close();
}

testGarza().catch(console.error);
