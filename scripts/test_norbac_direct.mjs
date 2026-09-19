import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const OUTREACH_PROFILE = {
  fullName: 'Pamela Jameson',
  email: 'pamela.jameson@nortiheastprecision.com',
  phone: '7085683708',
  company: 'Northeast Precision Machinery, Inc.',
  message: 'Hello, I am reaching out to express interest in your industrial supply and engineering services. Please contact us regarding upcoming project quotes. Thank you, Pamela Jameson.'
};

async function testNorbacDirect() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,900']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  page.on('response', async resp => {
    const url = resp.url();
    if (url.includes('form') || url.includes('wix') || url.includes('submission')) {
      if (resp.status() >= 200 && resp.status() < 400 && (url.includes('submit') || url.includes('submission') || url.includes('form'))) {
        console.log(`SUBMIT RESP ${resp.status()}: ${url}`);
        try {
          const body = await resp.text();
          console.log('BODY:', body.slice(0, 300));
        } catch (_) {}
      }
    }
  });

  try {
    await page.goto('https://www.norbac3.com/contact-us', { waitUntil: 'networkidle2', timeout: 30000 });

    // Fill all inputs across all form components
    await page.evaluate((p) => {
      const allInputs = Array.from(document.querySelectorAll('input, textarea'));
      for (const el of allInputs) {
        const ph = (el.placeholder || '').toLowerCase();
        const aria = (el.getAttribute('aria-label') || '').toLowerCase();
        const combo = ph + ' ' + aria;

        let val = null;
        if (combo.includes('name')) val = p.fullName;
        else if (combo.includes('phone')) val = p.phone;
        else if (combo.includes('email')) val = p.email;
        else if (combo.includes('company')) val = p.company;
        else if (combo.includes('product') || el.tagName === 'TEXTAREA') val = p.message;

        if (val !== null) {
          el.focus();
          const setter = el.tagName === 'TEXTAREA'
            ? Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set
            : Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
          if (setter) setter.call(el, val);
          else el.value = val;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
          el.dispatchEvent(new Event('blur', { bubbles: true }));
        }
      }
    }, OUTREACH_PROFILE);

    console.log('Clicking submit buttons...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('[data-hook="submit-button"]'));
      console.log(`Found ${btns.length} submit buttons.`);
      for (const btn of btns) {
        btn.click();
      }
    });

    await new Promise(r => setTimeout(r, 6000));

    const result = await page.evaluate(() => {
      const notifications = Array.from(document.querySelectorAll('[data-hook="notification-root"], [data-testid="form-submitted"], .wixui-form__message, [role="alert"]'))
        .map(el => el.innerText.trim())
        .filter(Boolean);
      return {
        notifications,
        bodyExcerpt: document.body.innerText.slice(0, 600)
      };
    });

    console.log('Norbac Result:', result);
  } catch (e) {
    console.log('Error:', e.message);
  } finally {
    await browser.close();
  }
}

testNorbacDirect();
