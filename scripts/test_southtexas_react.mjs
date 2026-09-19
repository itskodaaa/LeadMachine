import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const profile = {
  firstName: 'Pamela',
  lastName: 'Jameson',
  email: 'pamela.jameson@nortiheastprecision.com',
  subject: 'Custom Sheet Metal & Precision Fabrication Inquiry',
  message: 'Hello, reaching out on behalf of Northeast Precision Machinery regarding custom sheet metal fabrication capabilities and potential collaboration. Thank you, Pamela Jameson'
};

async function testSouthTexas() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--window-size=1280,800']
  });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');

  page.on('response', async res => {
    if (res.url().includes('wix-forms') || res.url().includes('submit')) {
      try {
        console.log('[Wix Form API]:', res.url(), res.status(), await res.text());
      } catch (_) {}
    }
  });

  try {
    await page.goto('https://southtexassheetmetal.com', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));

    await page.evaluate((p) => {
      function setVal(el, val) {
        if (!el) return;
        const proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
        const set = Object.getOwnPropertyDescriptor(proto, 'value').set;
        set.call(el, val);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        el.dispatchEvent(new Event('blur', { bubbles: true }));
      }

      const fName = document.querySelector('input[aria-label="First Name"]');
      const lName = document.querySelector('input[aria-label="Last Name"]');
      const email = document.querySelector('input[aria-label="Email"]');
      const subject = document.querySelector('input[aria-label="Subject"]');
      const message = document.querySelector('textarea[aria-label="Message"]');

      setVal(fName, p.firstName);
      setVal(lName, p.lastName);
      setVal(email, p.email);
      setVal(subject, p.subject);
      setVal(message, p.message);
    }, profile);

    await new Promise(r => setTimeout(r, 1000));

    console.log('Submitting via button click...');
    await page.evaluate(() => {
      const btn = document.querySelector('button[data-hook="submit-button"]');
      if (btn) btn.click();
    });

    await new Promise(r => setTimeout(r, 7000));

    const result = await page.evaluate(() => {
      const formText = document.querySelector('form[aria-label="Contact Form"]')?.innerText;
      const success = document.querySelector('[data-hook*="success"], .wixui-form__message');
      return {
        formText,
        success: success ? success.innerText : null,
        bodyMatches: document.body.innerText.match(/(?:thank you|thanks|received|submitted)[^\n.!]*/i)
      };
    });
    console.log('Result:', result);

  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await browser.close();
  }
}

testSouthTexas();
