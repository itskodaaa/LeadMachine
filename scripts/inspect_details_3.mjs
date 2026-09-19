import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

async function checkDetails() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  // 1. Inspect #3301 fields and labels
  try {
    const p1 = await browser.newPage();
    await p1.setRequestInterception(true);
    p1.on('request', req => {
      if (['image', 'font', 'media'].includes(req.resourceType())) req.abort();
      else req.continue();
    });
    await p1.goto('https://industrialelectricinc.com/contact-us-bid-request/', { waitUntil: 'domcontentloaded', timeout: 20000 });
    const f3301 = await p1.evaluate(() => {
      return Array.from(document.querySelectorAll('.gfield')).map(gf => ({
        id: gf.id,
        label: gf.querySelector('label')?.innerText,
        class: gf.className,
        inputName: gf.querySelector('input, textarea, select')?.name,
        display: window.getComputedStyle(gf).display
      }));
    });
    console.log('3301 fields:', JSON.stringify(f3301, null, 2));
    await p1.close();
  } catch (e) {
    console.log('3301 err:', e.message);
  }

  // 2. Inspect #3305 fields and labels
  try {
    const p2 = await browser.newPage();
    await p2.goto('https://idspower.com/contact-us/', { waitUntil: 'domcontentloaded', timeout: 20000 });
    const f3305 = await p2.evaluate(() => {
      return Array.from(document.querySelectorAll('.gfield')).map(gf => ({
        id: gf.id,
        label: gf.querySelector('label')?.innerText,
        class: gf.className,
        inputName: gf.querySelector('input, textarea, select')?.name,
        display: window.getComputedStyle(gf).display
      }));
    });
    console.log('3305 fields:', JSON.stringify(f3305, null, 2));
    await p2.close();
  } catch (e) {
    console.log('3305 err:', e.message);
  }

  // 3. Inspect #3302
  try {
    const p3 = await browser.newPage();
    await p3.goto('https://bekelectricaz.com/', { waitUntil: 'domcontentloaded', timeout: 20000 });
    const res3302 = await p3.evaluate(() => ({
      title: document.title,
      text: document.body.innerText,
      forms: document.querySelectorAll('form').length
    }));
    console.log('3302 info:', JSON.stringify(res3302, null, 2));
    await p3.close();
  } catch (e) {
    console.log('3302 err:', e.message);
  }

  await browser.close();
}

checkDetails();
