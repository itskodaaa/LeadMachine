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
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('response', async res => {
    const u = res.url();
    if (u.includes('contact') || u.includes('email') || u.includes('message') || u.includes('godaddy') || u.includes('api')) {
      console.log(`Response: ${res.status()} ${u.substring(0, 100)}`);
      try {
        const text = await res.text();
        console.log(`Response body: ${text.substring(0, 200)}`);
      } catch (e) {}
    }
  });

  try {
    await page.goto('https://twistedmetalswelding.com', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await new Promise(r => setTimeout(r, 2000));

    // Fill the contact form
    await page.evaluate(() => {
      const nameInput = document.querySelector('[data-aid="CONTACT_FORM_NAME"]');
      const emailInput = document.querySelector('[data-aid="CONTACT_FORM_EMAIL"]');
      const msgInput = document.querySelector('[data-aid="CONTACT_FORM_MESSAGE"]');

      if (nameInput) {
        nameInput.value = 'Pamela Jameson';
        nameInput.dispatchEvent(new Event('input', { bubbles: true }));
        nameInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
      if (emailInput) {
        emailInput.value = 'pamela.jameson@nortiheastprecision.com';
        emailInput.dispatchEvent(new Event('input', { bubbles: true }));
        emailInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
      if (msgInput) {
        msgInput.value = 'Hello, Pamela Jameson reaching out regarding metal fabrication quotes and upcoming project collaboration.';
        msgInput.dispatchEvent(new Event('input', { bubbles: true }));
        msgInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });

    console.log('Fields filled. Clicking submit...');
    await page.evaluate(() => {
      const btn = document.querySelector('[data-aid="CONTACT_SUBMIT_BUTTON_REND"]');
      if (btn) btn.click();
    });

    for (let i = 0; i < 6; i++) {
      await new Promise(r => setTimeout(r, 1500));
      const status = await page.evaluate(() => {
        const form = document.querySelector('[data-aid="CONTACT_FORM_CONTAINER"]') || document.querySelector('form.x-el-form:nth-of-type(2)');
        const text = document.body.innerText;
        const alerts = Array.from(document.querySelectorAll('[role="alert"], [data-aid*="SUCCESS"], [data-aid*="CONFIRM"], [data-aid*="MESSAGE"], [class*="success"], [class*="alert"]')).map(el => el.innerText.trim()).filter(Boolean);
        return {
          alerts,
          hasThankYou: /thank you|received|sent|success/i.test(text),
          sampleText: text.substring(0, 300)
        };
      });
      console.log(`Step ${i} status:`, JSON.stringify(status));
    }

  } catch (err) {
    console.log('Error:', err.message);
  } finally {
    await browser.close();
  }
}

run();
