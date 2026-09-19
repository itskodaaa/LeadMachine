import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

const CHROME_BIN = '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

const OUTREACH_PROFILE = {
  fullName: 'Pamela Jameson',
  email: 'pamela.jameson@nortiheastprecision.com',
  phone: '708-568-3708',
  message: `Hello,

I am reaching out to express our interest in your precision machining and fabrication services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects.

Thank you for your time and attention.

Sincerely,
Pamela Jameson`
};

async function testValley() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');

  page.on('response', async res => {
    const url = res.url();
    if (url.includes('contact') || url.includes('messages') || url.includes('secureserver')) {
      console.log(`[Response] ${res.status()} ${url}`);
      try {
        const text = await res.text();
        console.log('Body:', text.slice(0, 250));
      } catch (e) {}
    }
  });

  console.log('Navigating to https://valleymachineworks.com/contact ...');
  await page.goto('https://valleymachineworks.com/contact', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await new Promise(r => setTimeout(r, 4000));

  console.log('Setting React values directly...');
  await page.evaluate((p) => {
    const setVal = (el, val) => {
      const proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
      setter.call(el, val);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      el.dispatchEvent(new Event('blur', { bubbles: true }));
    };

    const nameEl = document.querySelector('[data-aid="CONTACT_FORM_NAME"]');
    if (nameEl) setVal(nameEl, p.fullName);

    const emailEl = document.querySelector('[data-aid="CONTACT_FORM_EMAIL"]');
    if (emailEl) setVal(emailEl, p.email);

    const phoneEl = document.querySelector('[data-aid="CONTACT_FORM_PHONE"]');
    if (phoneEl) setVal(phoneEl, p.phone);

    const msgEl = document.querySelector('[data-aid="CONTACT_FORM_MESSAGE"]');
    if (msgEl) setVal(msgEl, p.message);
  }, OUTREACH_PROFILE);

  console.log('Clicking Send button...');
  await page.evaluate(() => {
    const btn = document.querySelector('button[data-aid="CONTACT_SUBMIT_BUTTON_REND"]') || document.querySelector('form button[type="submit"]');
    if (btn) btn.click();
  });

  console.log('Waiting 8s...');
  await new Promise(r => setTimeout(r, 8000));

  const result = await page.evaluate(() => {
    const success = document.querySelector('[data-aid="CONTACT_FORM_SUCCESS_MESSAGE"], [data-ux="Confirmation"], [role="alert"]');
    return {
      successMsg: success ? success.innerText : null,
      pageText: document.body.innerText.slice(0, 500)
    };
  });

  console.log('Result:', result);
  await browser.close();
}

testValley();
