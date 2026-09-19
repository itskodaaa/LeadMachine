import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

async function run() {
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: CHROME_BIN,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(30000);

    page.on('response', async res => {
      const u = res.url();
      if (u.includes('contact') || u.includes('messages') || u.includes('form') || res.request().method() === 'POST') {
        try {
          console.log(`[HTTP ${res.status()}] ${u}`);
          if (res.status() === 200 || res.status() === 201) {
            const txt = await res.text().catch(() => '');
            console.log(`Response text: ${txt.slice(0, 300)}`);
          }
        } catch(e) {}
      }
    });

    console.log('Navigating to https://genesiscontrols.org...');
    await page.goto('https://genesiscontrols.org', { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 2000));

    const fillResult = await page.evaluate(() => {
      function setNativeValue(element, value) {
        const valueSetter = Object.getOwnPropertyDescriptor(element, 'value') ? Object.getOwnPropertyDescriptor(element, 'value').set : null;
        const prototype = Object.getPrototypeOf(element);
        const prototypeValueSetter = Object.getOwnPropertyDescriptor(prototype, 'value') ? Object.getOwnPropertyDescriptor(prototype, 'value').set : null;
        if (prototypeValueSetter && valueSetter !== prototypeValueSetter) {
          prototypeValueSetter.call(element, value);
        } else if (valueSetter) {
          valueSetter.call(element, value);
        } else {
          element.value = value;
        }
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
        element.dispatchEvent(new Event('blur', { bubbles: true }));
      }

      const form = document.querySelector('form');
      if (!form) return { ok: false, error: 'no form' };

      const nameInput = document.querySelector('input#input76003, input[aria-label*="Name" i], input[data-aid="CONTACT_FORM_NAME"]');
      const emailInput = document.querySelector('input#input76004, input[aria-label*="Email" i], input[data-aid="CONTACT_FORM_EMAIL"]');
      const textarea = document.querySelector('textarea');
      const submitBtn = document.querySelector('form button, [data-aid="CONTACT_SUBMIT_BUTTON_REND"]');

      if (!nameInput || !emailInput || !textarea || !submitBtn) {
        return { ok: false, nameInput: !!nameInput, emailInput: !!emailInput, textarea: !!textarea, submitBtn: !!submitBtn };
      }

      setNativeValue(nameInput, 'Pamela Jameson');
      setNativeValue(emailInput, 'pamela.jameson@nortiheastprecision.com');
      setNativeValue(textarea, 'Hello, I am reaching out from Northeast Precision Machinery, Inc. to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects. Thank you, Pamela Jameson | 708-568-3708');

      return { ok: true };
    });

    console.log('Fill result:', fillResult);

    if (fillResult.ok) {
      await new Promise(r => setTimeout(r, 1000));
      const btn = await page.$('form button, [data-aid="CONTACT_SUBMIT_BUTTON_REND"]');
      if (btn) {
        console.log('Clicking GoDaddy submit button...');
        await btn.click();
        await new Promise(r => setTimeout(r, 7000));

        const finalStatus = await page.evaluate(() => {
          const form = document.querySelector('form');
          const successEl = document.querySelector('[data-aid="CONTACT_FORM_SUCCESS_MSG"], [data-aid="CONTACT_FORM_SUCCESS_MSG_REND"], [class*="success"]');
          const formText = form ? form.innerText : '';
          const bodyText = document.body.innerText;
          return {
            successElText: successEl ? successEl.innerText : null,
            formTextSnippet: formText.slice(0, 300),
            hasThankYou: /thank you|we will be in touch|message sent|thanks for reaching out/i.test(bodyText)
          };
        });

        console.log('Final status:', JSON.stringify(finalStatus, null, 2));
      }
    }
  } catch(e) {
    console.error('Error:', e);
  } finally {
    await browser.close();
  }
}

run();
