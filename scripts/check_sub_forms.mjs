import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());
const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

async function check(url) {
  const browser = await puppeteer.launch({ executablePath: CHROME_BIN, headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });
    await new Promise(r => setTimeout(r, 3000));
    console.log('=== ' + url + ' ===');
    console.log('Title:', await page.title());
    const forms = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('form')).map(f => ({
        id: f.id,
        action: f.action,
        inputs: Array.from(f.querySelectorAll('input, textarea, select')).map(i => ({ name: i.name, type: i.type, placeholder: i.placeholder, id: i.id }))
      }));
    });
    console.log('Forms:', JSON.stringify(forms, null, 2));
    const recaptcha = await page.$('.g-recaptcha, iframe[src*="recaptcha"], iframe[src*="turnstile"]');
    console.log('Captcha:', !!recaptcha);
    const bodySnippet = await page.evaluate(() => document.body.innerText.slice(0, 400));
    console.log('Body snippet:', bodySnippet);
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await browser.close();
  }
}

async function run() {
  await check('https://www.perceptiveeng.com/connect-with-us');
  await check('https://www.mdgcgroup.com/get-a-bid');
  await check('https://texterra-eng.com/?page_id=110');
}
run();
