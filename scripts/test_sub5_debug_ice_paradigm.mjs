import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const PROFILE = {
  name: 'Pamela Jameson',
  email: 'pamela.jameson@nortiheastprecision.com',
  phone: '708-568-3708',
  company: 'Northeast Precision Machinery, Inc.',
  subject: 'Exploring Collaboration Opportunities',
  message: 'Hello, I am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects. Thank you for your time and attention.'
};

async function run() {
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: CHROME_BIN,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  // ICE Check
  console.log('--- EXAMINING ICE (4429) ---');
  try {
    const page = await browser.newPage();
    await page.goto('https://iceagents.com/', { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 2000));

    const iceForms = await page.evaluate(() => {
      const forms = Array.from(document.querySelectorAll('form'));
      return forms.map((f, idx) => ({
        idx,
        id: f.id,
        className: f.className,
        action: f.action,
        inputs: Array.from(f.querySelectorAll('input, textarea')).map(i => ({ name: i.name, type: i.type, value: i.value }))
      }));
    });
    console.log('ICE Forms count:', iceForms.length);
    console.log('ICE Forms details:', JSON.stringify(iceForms, null, 2));

    // Try filling the form directly via FormData / value setter and submit
    page.on('request', req => {
      if (req.url().includes('feedback')) {
        console.log('ICE feedback POST data:', req.postData());
      }
    });
    page.on('response', async res => {
      if (res.url().includes('feedback')) {
        console.log('ICE feedback response:', await res.text());
      }
    });

    // Fill via page.evaluate
    await page.evaluate((p) => {
      const f = document.querySelector('form.wpcf7-form');
      if (!f) return;
      const setVal = (name, val) => {
        const el = f.querySelector(`[name="${name}"]`);
        if (el) {
          el.focus();
          el.value = val;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
          el.dispatchEvent(new Event('blur', { bubbles: true }));
        }
      };
      setVal('your-name', p.name);
      setVal('your-email', p.email);
      setVal('your-subject', p.subject);
      setVal('your-message', p.message);
    }, PROFILE);

    console.log('Clicking ICE submit button directly...');
    await page.click('form.wpcf7-form input[type="submit"]');
    await new Promise(r => setTimeout(r, 6000));

    const finalIce = await page.evaluate(() => {
      const out = document.querySelector('.wpcf7-response-output');
      return out ? out.innerText : 'no output';
    });
    console.log('Final ICE output:', finalIce);

    await page.close();
  } catch (e) {
    console.log('ICE err:', e.message);
  }

  // Paradigm Check
  console.log('\n--- EXAMINING PARADIGM (4430) ---');
  try {
    const page = await browser.newPage();
    page.on('request', req => {
      if (req.url().includes('secureserver.net') || req.url().includes('paradigmeng')) {
        console.log(`[Paradigm Req ${req.method()}] ${req.url()}`, req.postData() ? req.postData().slice(0, 200) : '');
      }
    });
    page.on('response', async res => {
      if (res.url().includes('secureserver.net') || res.url().includes('messages') || res.url().includes('contact')) {
        try {
          const t = await res.text();
          if (t.length < 500) console.log(`[Paradigm Res ${res.status()}] ${res.url()}:`, t);
        } catch(e) {}
      }
    });

    await page.goto('https://paradigmeng.net/', { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 2000));

    // Fill using native value setter for React
    await page.evaluate((p) => {
      function setReactValue(el, value) {
        const lastValue = el.value;
        el.value = value;
        const event = new Event('input', { bubbles: true });
        // React 16+ hack
        const tracker = el._valueTracker;
        if (tracker) {
          tracker.setValue(lastValue);
        }
        el.dispatchEvent(event);
        el.dispatchEvent(new Event('change', { bubbles: true }));
        el.dispatchEvent(new Event('blur', { bubbles: true }));
      }

      const nameInput = document.querySelector('#input1') || document.querySelector('input[data-aid="CONTACT_FORM_NAME"]');
      const emailInput = document.querySelector('#input2') || document.querySelector('input[data-aid="CONTACT_FORM_EMAIL"]');
      const msgInput = document.querySelector('textarea[data-aid="CONTACT_FORM_MESSAGE"]');

      if (nameInput) setReactValue(nameInput, p.name);
      if (emailInput) setReactValue(emailInput, p.email);
      if (msgInput) setReactValue(msgInput, p.message);
    }, PROFILE);

    console.log('Values set in Paradigm. Waiting 1s before clicking Send...');
    await new Promise(r => setTimeout(r, 1000));

    const submitBtn = await page.$('button[data-aid="CONTACT_SUBMIT_BUTTON_REND"]');
    if (submitBtn) {
      await submitBtn.click();
      console.log('Clicked Send button in Paradigm');
      await new Promise(r => setTimeout(r, 8000));
    }

    const paraRes = await page.evaluate(() => {
      const text = document.body.innerText;
      const modal = document.querySelector('[role="dialog"], [data-aid*="CONFIRMATION"], [data-aid*="SUCCESS"]');
      return {
        modalText: modal ? modal.innerText : null,
        bodyContainsThankYou: /thank you/i.test(text),
        bodyContainsSent: /message sent/i.test(text),
        buttonState: document.querySelector('button[data-aid="CONTACT_SUBMIT_BUTTON_REND"]')?.innerText
      };
    });
    console.log('Paradigm final check:', paraRes);

    await page.close();
  } catch (e) {
    console.log('Paradigm err:', e.message);
  }

  await browser.close();
}

run();
