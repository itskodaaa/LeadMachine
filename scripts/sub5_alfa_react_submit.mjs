import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
puppeteer.use(StealthPlugin());

const CHROME_BIN = '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

const PROFILE = {
  firstName: 'Pamela',
  lastName: 'Jameson',
  fullName: 'Pamela Jameson',
  email: 'pamela.jameson@nortiheastprecision.com',
  phone: '708-568-3708',
  company: 'Northeast Precision Machinery, Inc.',
  address: '100 Main St, Chicago, IL 60601',
  message: 'Hello, I am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects. Thank you for your time and attention.'
};

async function submitAlfa() {
  const browser = await puppeteer.launch({ executablePath: CHROME_BIN, headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  await page.goto('https://alfaengllc.com/contact', { waitUntil: 'networkidle2' });

  // Use evaluate to set React state via native setters and click
  const result = await page.evaluate(async (profile) => {
    function setReactValue(input, val) {
      const isTextarea = input.tagName === 'TEXTAREA';
      const proto = isTextarea ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
      setter.call(input, val);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }

    const inputs = Array.from(document.querySelectorAll('form input'));
    setReactValue(inputs[0], profile.fullName);
    setReactValue(inputs[1], profile.email);
    setReactValue(inputs[2], profile.phone);
    setReactValue(inputs[3], profile.address);

    const textarea = document.querySelector('form textarea');
    setReactValue(textarea, profile.message);

    // Click service button "Civil Engineering Consulting" or "Other"
    const buttons = Array.from(document.querySelectorAll('form button[type="button"]'));
    const targetBtn = buttons.find(b => b.innerText.includes('Civil Engineering Consulting') || b.innerText.includes('Other'));
    if (targetBtn) {
      targetBtn.click();
    }

    // Now submit
    const submitBtn = document.querySelector('form button[type="submit"]');
    submitBtn.click();
    return { clicked: true, selectedService: targetBtn ? targetBtn.innerText : 'none' };
  }, PROFILE);

  console.log('Submission initiated:', result);
  await new Promise(r => setTimeout(r, 6000));

  console.log('Current URL after submit:', page.url());
  const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 500));
  console.log('Page text snippet:\n', bodyText);

  await browser.close();
}

submitAlfa();
