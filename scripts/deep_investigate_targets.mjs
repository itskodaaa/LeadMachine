import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import db from './db.mjs';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

async function checkSites() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,800']
  });

  const urls = [
    { id: 3953, url: 'https://ea3civil.com/contact-us/' },
    { id: 3957, url: 'https://cuetoengineering.com' },
    { id: 3958, url: 'https://speathengineering.com' },
    { id: 3960, url: 'https://doubledayengineering.com' }
  ];

  for (const item of urls) {
    console.log(`\nChecking #${item.id}: ${item.url}`);
    const page = await browser.newPage();
    try {
      const t0 = Date.now();
      await page.goto(item.url, { waitUntil: 'domcontentloaded', timeout: 15000 });
      console.log(`Loaded in ${Date.now() - t0}ms. Title: ${await page.title()}`);
      
      // Check forms and captchas
      const forms = await page.evaluate(() => {
        const formEls = Array.from(document.querySelectorAll('form'));
        const captchas = Array.from(document.querySelectorAll('.g-recaptcha, iframe[src*="recaptcha"], iframe[src*="hcaptcha"], iframe[src*="turnstile"], .cf-turnstile, [data-sitekey]'));
        const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"]), textarea, select'));
        return {
          formsCount: formEls.length,
          captchasCount: captchas.length,
          captchas: captchas.map(c => c.className || c.src),
          inputs: inputs.map(i => ({ name: i.name, type: i.type, tag: i.tagName, id: i.id }))
        };
      });
      console.log(`Forms & Captchas:`, JSON.stringify(forms, null, 2));

    } catch (e) {
      console.log(`Failed:`, e.message);
    } finally {
      await page.close();
    }
  }

  await browser.close();
}

checkSites();
