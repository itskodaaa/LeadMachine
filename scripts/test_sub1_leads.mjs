import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

async function check(id, url) {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  page.on('dialog', async dialog => {
    console.log(`[#${id} DIALOG]`, dialog.type(), dialog.message());
    await dialog.dismiss();
  });

  console.log(`\n========================================\nChecking #${id}: ${url}`);
  try {
    const res = await page.goto(url, { waitUntil: 'networkidle2', timeout: 25000 });
    console.log(`Status: ${res ? res.status() : 'null'}, Final URL: ${page.url()}`);
    
    const contactLinks = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('a'))
        .filter(a => /contact|reach|quote|about/i.test(a.innerText || a.href))
        .map(a => ({ text: a.innerText.trim(), href: a.href }));
    });
    console.log("Contact/Quote links:", JSON.stringify(contactLinks.slice(0, 5)));

    const forms = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('form')).map(f => ({
        id: f.id,
        name: f.name,
        action: f.action,
        method: f.method,
        inputs: Array.from(f.querySelectorAll('input, textarea, button, select')).map(el => ({
          tag: el.tagName,
          type: el.type,
          name: el.name,
          id: el.id,
          placeholder: el.placeholder,
          required: el.required
        }))
      }));
    });
    console.log("Forms:", JSON.stringify(forms, null, 2));

    const iframes = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('iframe')).map(i => ({ src: i.src, id: i.id, name: i.name }));
    });
    console.log("IFrames:", JSON.stringify(iframes));

  } catch (err) {
    console.error(`Error on #${id}:`, err.message);
  } finally {
    await browser.close();
  }
}

async function run() {
  await check(4968, 'https://vvndies.com');
  await check(4970, 'https://kegher.com');
  await check(4973, 'https://cityindustrial.com');
}
run();
