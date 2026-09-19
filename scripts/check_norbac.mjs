import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

async function checkNorbacSubmit() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  page.on('request', req => {
    if (req.url().includes('form') || req.url().includes('wix') || req.url().includes('api')) {
      // log relevant requests
      if (!req.url().includes('statics.wix') && !req.url().includes('.js') && !req.url().includes('.css')) {
        console.log(`REQ: ${req.method()} ${req.url()}`);
      }
    }
  });
  page.on('response', resp => {
    if (resp.url().includes('form') || resp.url().includes('submit')) {
      console.log(`RESP: ${resp.status()} ${resp.url()}`);
      resp.text().then(t => console.log('RESP BODY:', t.slice(0, 300))).catch(() => {});
    }
  });

  await page.goto('https://www.norbac3.com/contact-us', { waitUntil: 'networkidle2', timeout: 30000 });

  // Let's inspect the submit button and inputs in detail
  const formStatus = await page.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll('#form-ce56e901-f9e2-40c3-8daf-d64e1f08b863 input, #form-ce56e901-f9e2-40c3-8daf-d64e1f08b863 textarea'));
    const btn = document.querySelector('#form-ce56e901-f9e2-40c3-8daf-d64e1f08b863 button');
    return {
      inputsCount: inputs.length,
      btnText: btn ? btn.innerText : null,
      btnDisabled: btn ? btn.disabled : null,
      btnOuter: btn ? btn.outerHTML : null
    };
  });
  console.log('Form status:', formStatus);

  await browser.close();
}

checkNorbacSubmit();
