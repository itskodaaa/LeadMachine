import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

const P = {
  fullName: 'Pamela Jameson',
  email: 'pamela.jameson@nortiheastprecision.com',
  phone: '708-568-3708',
  message: 'Hello, I am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects.'
};

(async () => {
  const browser = await puppeteer.launch({ headless: true, executablePath: CHROME_BIN, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  page.on('response', async (res) => {
    if (res.request().method() === 'POST' || res.url().includes('contact')) {
      console.log('NET:', res.url(), res.status());
      try {
        const t = await res.text();
        console.log('Body:', t.slice(0, 300));
      } catch (e) {}
    }
  });

  await page.goto('https://odysseyfab.com/pages/contact-us', { waitUntil: 'networkidle2', timeout: 30000 });

  console.log('Typing fields into OdysseyFAB...');
  await page.type('#ContactForm-name', P.fullName, { delay: 20 });
  await page.type('#ContactForm-email', P.email, { delay: 20 });
  await page.type('#ContactForm-phone', P.phone, { delay: 20 });
  await page.type('#ContactForm-message', P.message, { delay: 10 });

  await new Promise(r => setTimeout(r, 1000));
  console.log('Clicking Send button...');
  const sendBtn = await page.$('form[action*="contact"] input[type="submit"], form[action*="contact"] button[type="submit"]');
  if (sendBtn) {
    await sendBtn.click();
  }

  await new Promise(r => setTimeout(r, 6000));

  const result = await page.evaluate(() => {
    const postMessage = document.querySelector('.form-status, .form__message, [tabindex="-1"], .form-status-list')?.innerText;
    const body = document.body.innerText;
    return {
      url: window.location.href,
      postMessage,
      hasCaptcha: !!document.querySelector('iframe[src*="captcha"], iframe[src*="recaptcha"], iframe[src*="hcaptcha"]'),
      bodySnippet: body.slice(0, 600)
    };
  });
  console.log('OdysseyFAB result:', result);

  await browser.close();
})();
