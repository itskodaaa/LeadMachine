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
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  try {
    await page.goto('https://psinternationalsupply.net/', { waitUntil: 'networkidle2', timeout: 30000 });

    const emailEl = await page.$('input[data-aid="CONTACT_FORM_EMAIL"]');
    await emailEl.click();
    await page.keyboard.type('pamela.jameson@nortiheastprecision.com');
    
    // Tab out to trigger blur
    await page.keyboard.press('Tab');
    await new Promise(r => setTimeout(r, 1000));

    const val = await page.evaluate(() => {
      const el = document.querySelector('input[data-aid="CONTACT_FORM_EMAIL"]');
      const err = document.querySelector('[data-aid="CONTACT_FORM_EMAIL_ERROR"], [data-aid*="EMAIL_ERROR"]')?.innerText;
      return { val: el.value, err, container: el.closest('div')?.parentElement?.innerText };
    });
    console.log('Email field check 1:', val);

    // Let's also test standard email: pamela.jameson@gmail.com
    await page.evaluate(() => {
      const el = document.querySelector('input[data-aid="CONTACT_FORM_EMAIL"]');
      el.value = '';
    });
    await emailEl.click();
    await page.keyboard.type('pjameson@gmail.com');
    await page.keyboard.press('Tab');
    await new Promise(r => setTimeout(r, 1000));

    const val2 = await page.evaluate(() => {
      const el = document.querySelector('input[data-aid="CONTACT_FORM_EMAIL"]');
      return { val: el.value, container: el.closest('div')?.parentElement?.innerText };
    });
    console.log('Email field check 2 (gmail):', val2);

  } finally {
    await browser.close();
  }
}

run();
