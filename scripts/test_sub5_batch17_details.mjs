import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

async function checkThree() {
  const browser = await puppeteer.launch({
    headless: "new",
    executablePath: CHROME_BIN,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled']
  });

  // 1. Check ustooldie.com
  console.log('--- Checking 4960 ustooldie.com ---');
  const page1 = await browser.newPage();
  await page1.goto('https://ustooldie.com/', { waitUntil: 'networkidle2' });
  const formHtml = await page1.evaluate(() => {
    const f = document.querySelector('form');
    return f ? f.outerHTML : 'no form';
  });
  console.log('ustooldie form HTML:', formHtml);
  await page1.close();

  // 2. Check bandel.com fields
  console.log('--- Checking 4959 bandel.com fields ---');
  const page2 = await browser.newPage();
  await page2.goto('https://www.bandel.com/contact', { waitUntil: 'networkidle2' });
  const bandelInputs = await page2.evaluate(() => {
    const f = document.querySelector('form');
    if (!f) return 'no form';
    return Array.from(f.querySelectorAll('input, textarea, select, button')).map(el => ({
      tag: el.tagName,
      name: el.name,
      id: el.id,
      type: el.type,
      placeholder: el.placeholder,
      outer: el.outerHTML.substring(0, 150)
    }));
  });
  console.log('bandel form inputs:', JSON.stringify(bandelInputs, null, 2));
  await page2.close();

  // 3. Check hollywood3dprinting.com wizard
  console.log('--- Checking 4962 hollywood3dprinting wizard ---');
  const page3 = await browser.newPage();
  await page3.goto('https://hollywood3dprinting.com/get-a-quote', { waitUntil: 'networkidle2' });
  const wizardDetails = await page3.evaluate(() => {
    return Array.from(document.querySelectorAll('form, .step, [class*="step"], [class*="wizard"]')).map(el => ({
      tag: el.tagName,
      className: el.className,
      text: el.innerText.substring(0, 200)
    }));
  });
  console.log('hollywood3dprinting wizard details:', wizardDetails);
  await page3.close();

  await browser.close();
}

checkThree().catch(console.error);
