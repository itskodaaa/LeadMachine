import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
puppeteer.use(StealthPlugin());
const CHROME_BIN = '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

async function testWixReactSetter() {
  const browser = await puppeteer.launch({ executablePath: CHROME_BIN, headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.goto('https://www.lera.com/offices', { waitUntil: 'networkidle2' });

  // Listen to network responses
  page.on('response', async res => {
    if (res.url().includes('wix') && res.request().method() === 'POST') {
      try {
        console.log('POST Response:', res.status(), res.url());
        const body = await res.text();
        console.log('POST Body:', body.substring(0, 300));
      } catch (e) {}
    }
  });

  const filled = await page.evaluate(() => {
    function setReactValue(el, value) {
      el.focus();
      const proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
      setter.call(el, value);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      el.blur();
    }

    const fName = document.querySelector('input[id*="form-field-input-7e9d"]');
    const lName = document.querySelector('input[id*="form-field-input-4f00"]');
    const email = document.querySelector('input[id*="form-field-input-8ffe"]');
    const msg = document.querySelector('textarea[id*="form-field-input-8aea"]');

    if (!fName || !email) return { success: false, reason: 'Inputs not found' };

    setReactValue(fName, 'Pamela');
    setReactValue(lName, 'Jameson');
    setReactValue(email, 'pamela.jameson@northeastprecision.com');
    setReactValue(msg, 'Hello, Northeast Precision Machinery would like to explore structural engineering collaboration opportunities for upcoming facilities. Could someone from your team please contact us? Thank you.');

    return {
      success: true,
      values: {
        fName: fName.value,
        lName: lName.value,
        email: email.value,
        msg: msg.value
      }
    };
  });

  console.log('React setter filled:', filled);

  // Click submit button
  await page.evaluate(() => {
    const b = Array.from(document.querySelectorAll('button')).find(b => (b.innerText || '').trim() === 'Submit');
    if (b) {
      b.scrollIntoView({ behavior: 'instant', block: 'center' });
      b.click();
    }
  });

  for (let i = 0; i < 10; i++) {
    await new Promise(r => setTimeout(r, 1000));
    const status = await page.evaluate(() => {
      const text = document.body.innerText;
      const alerts = Array.from(document.querySelectorAll('[role="alert"], [data-hook*="message"], .wixui-form__message, [data-hook*="notification"]')).map(e => e.innerText.trim()).filter(Boolean);
      return {
        alerts,
        hasSuccess: text.toLowerCase().includes('thanks for submitting') || text.toLowerCase().includes('thank you')
      };
    });
    console.log(`Sec ${i+1}:`, status);
    if (status.hasSuccess || (status.alerts.length > 0 && status.alerts.some(a => a.toLowerCase().includes('thank') || a.toLowerCase().includes('submit')))) {
      break;
    }
  }

  await browser.close();
}

testWixReactSetter();
