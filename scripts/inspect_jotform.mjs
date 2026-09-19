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
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,800']
  });

  const page = await browser.newPage();
  await page.goto('https://form.jotform.com/220984738836168', { waitUntil: 'networkidle2', timeout: 20000 });
  const reqFields = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('[data-type], .form-line')).map(line => {
      const isReq = line.className.includes('form-line-error') || line.querySelector('.form-required') !== null;
      const label = line.querySelector('label')?.innerText?.replace('*', '').trim();
      const inputs = Array.from(line.querySelectorAll('input, select, textarea')).map(i => ({ id: i.id, name: i.name, type: i.type }));
      return { label, isReq, inputs };
    }).filter(f => f.isReq);
  });
  console.log('Required fields in JotForm:', JSON.stringify(reqFields, null, 2));

  await browser.close();
}

run();
