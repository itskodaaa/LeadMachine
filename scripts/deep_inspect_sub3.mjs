import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

async function run() {
  const browser = await puppeteer.launch({
    headless: "new",
    executablePath: CHROME_BIN,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  // 1. #4696 Ozz'z Metal Fab
  {
    console.log('\n--- 4696: Ozz\'z Metal Fabrication ---');
    const page = await browser.newPage();
    await page.goto('https://ozzmetalfab.com/', { waitUntil: 'networkidle2' });
    const info = await page.evaluate(() => {
      const form = document.querySelectorAll('form')[1];
      if (!form) return 'No second form';
      return Array.from(form.querySelectorAll('label, input, textarea, button')).map(el => ({
        tag: el.tagName,
        text: el.innerText,
        placeholder: el.placeholder,
        name: el.name,
        id: el.id,
        for: el.getAttribute('for')
      }));
    });
    console.log(JSON.stringify(info, null, 2));
    await page.close();
  }

  // 2. #4697 Jahm Iron Work
  {
    console.log('\n--- 4697: Jahm Iron Work ---');
    const page = await browser.newPage();
    await page.goto('https://www.jahm-iron-work.com/contact', { waitUntil: 'networkidle2' });
    const info = await page.evaluate(() => {
      const form = document.querySelector('form.jw-form-container') || document.querySelectorAll('form')[2];
      if (!form) return 'No form';
      return {
        html: form.outerHTML.substring(0, 1500),
        labels: Array.from(form.querySelectorAll('label')).map(l => l.innerText)
      };
    });
    console.log(JSON.stringify(info, null, 2));
    await page.close();
  }

  // 3. #4699 Southwest Steel Sales
  {
    console.log('\n--- 4699: Southwest Steel Sales ---');
    const page = await browser.newPage();
    await page.goto('https://www.sw-steel.com/contact', { waitUntil: 'networkidle2' });
    const info = await page.evaluate(() => {
      return {
        text: document.body.innerText.substring(0, 800),
        forms: document.querySelectorAll('form').length,
        inputs: document.querySelectorAll('input, textarea').length
      };
    });
    console.log(JSON.stringify(info, null, 2));
    await page.close();
  }

  // 4. #4700 Hogue Mobile Welding
  {
    console.log('\n--- 4700: Hogue Mobile Welding ---');
    const page = await browser.newPage();
    await page.goto('https://www.hoguemobileweldingllc.com/contact-us/', { waitUntil: 'networkidle2' });
    const info = await page.evaluate(() => {
      const form = document.querySelector('form.wpcf7-form');
      if (!form) return 'No wpcf7-form';
      return Array.from(form.querySelectorAll('label, input, textarea, p, span')).map(el => ({
        tag: el.tagName,
        className: el.className,
        text: el.innerText,
        name: el.name,
        type: el.type
      }));
    });
    console.log(JSON.stringify(info, null, 2));
    await page.close();
  }

  // 5. #4701 Bent Fabrication
  {
    console.log('\n--- 4701: Bent Fabrication ---');
    const page = await browser.newPage();
    await page.goto('https://bentfabaz.com/pages/contact', { waitUntil: 'networkidle2' });
    const info = await page.evaluate(() => {
      const form = document.querySelector('form[action*="contact"]');
      if (!form) return 'No form';
      return Array.from(form.querySelectorAll('label, input, textarea, button')).map(el => ({
        tag: el.tagName,
        text: el.innerText,
        placeholder: el.placeholder,
        name: el.name,
        id: el.id
      }));
    });
    console.log(JSON.stringify(info, null, 2));
    await page.close();
  }

  await browser.close();
}

run();
