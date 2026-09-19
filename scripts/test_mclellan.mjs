import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const OUTREACH_PROFILE = {
  fullName: 'Pamela Jameson',
  firstName: 'Pamela',
  lastName: 'Jameson',
  email: 'pamela.jameson@nortiheastprecision.com',
  phone: '708-568-3708',
  company: 'Northeast Precision Machinery, Inc.',
  subject: 'Exploring Collaboration Opportunities',
  message: 'Hello, I am reaching out to express interest in your services and would appreciate the opportunity to explore potential collaboration and project quotes. Kindly arrange for a representative to contact us. Thank you, Pamela Jameson.'
};

async function testMclellan() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--ignore-certificate-errors']
  });

  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('response', resp => {
    if (resp.url().includes('wp-json') || resp.url().includes('admin-ajax')) {
      console.log(`NETWORK RESP: ${resp.status()} ${resp.url()}`);
      resp.text().then(t => console.log('RESP BODY:', t.slice(0, 300))).catch(() => {});
    }
  });

  try {
    console.log('Navigating to McLellan contact page...');
    await page.goto('https://www.mclellanengineering.com/contact_us/', { waitUntil: 'networkidle2', timeout: 30000 });

    // Fill form
    await page.evaluate((p) => {
      const nameInput = document.querySelector('input[name="your-name"]');
      if (nameInput) {
        nameInput.value = p.fullName;
        nameInput.dispatchEvent(new Event('input', { bubbles: true }));
        nameInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
      const emailInput = document.querySelector('input[name="your-email"]');
      if (emailInput) {
        emailInput.value = p.email;
        emailInput.dispatchEvent(new Event('input', { bubbles: true }));
        emailInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
      const subInput = document.querySelector('input[name="your-subject"]');
      if (subInput) {
        subInput.value = p.subject;
        subInput.dispatchEvent(new Event('input', { bubbles: true }));
        subInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
      const phoneInput = document.querySelector('input[name="tel-649"]');
      if (phoneInput) {
        phoneInput.value = p.phone;
        phoneInput.dispatchEvent(new Event('input', { bubbles: true }));
        phoneInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
      const msgInput = document.querySelector('textarea[name="your-message"]');
      if (msgInput) {
        msgInput.value = p.message;
        msgInput.dispatchEvent(new Event('input', { bubbles: true }));
        msgInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }, OUTREACH_PROFILE);

    console.log('Clicking send...');
    await page.click('form.wpcf7-form input[type="submit"]');

    await new Promise(r => setTimeout(r, 8000));

    const result = await page.evaluate(() => {
      const form = document.querySelector('form.wpcf7-form');
      const output = document.querySelector('.wpcf7-response-output');
      return {
        formClass: form ? form.className : null,
        outputClass: output ? output.className : null,
        outputText: output ? output.innerText.trim() : null
      };
    });
    console.log('McLellan Result:', result);
  } catch (e) {
    console.log('McLellan error:', e.message);
  } finally {
    await browser.close();
  }
}

testMclellan();
