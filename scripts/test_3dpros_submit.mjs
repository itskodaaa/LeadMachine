import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

async function test3DPros() {
  const browser = await puppeteer.launch({
    headless: "new",
    executablePath: CHROME_BIN,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  try {
    await page.goto('https://3dpros.online/pages/contact', { waitUntil: 'domcontentloaded', timeout: 30000 });
    console.log('Opened 3D Pros contact page:', page.url());

    // Check captcha
    const captchas = await page.evaluate(() => {
      return {
        recaptcha: !!document.querySelector('.g-recaptcha, iframe[src*="recaptcha"]'),
        hcaptcha: !!document.querySelector('.h-captcha, iframe[src*="hcaptcha"]'),
        turnstile: !!document.querySelector('.cf-turnstile, iframe[src*="turnstile"]')
      };
    });
    console.log('Captchas:', captchas);

    // Fill form
    await page.type('#ContactForm-name', 'Pamela Jameson');
    await page.type('#ContactForm-email', 'pamela.jameson@nortiheastprecision.com');
    await page.type('#ContactForm-phone', '708-568-3708');
    await page.type('#ContactForm-body', 'Hello, Northeast Precision Machinery is reaching out regarding potential collaboration and upcoming project quotes. Please contact us at your earliest convenience.');

    console.log('Submitting ContactForm...');
    const [response] = await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 20000 }).catch(e => e.message),
      page.click('#ContactForm button[type="submit"], #ContactForm input[type="submit"]')
    ]);

    console.log('Navigated to:', page.url());
    const content = await page.content();
    console.log('Page title:', await page.title());
    
    // Check if challenge / recaptcha or success
    const result = await page.evaluate(() => {
      const formStatus = document.querySelector('.form-status, .form-message, .form__message');
      const bodyText = document.body.innerText;
      return {
        formStatus: formStatus ? formStatus.innerText : null,
        hasThanks: /thank|received/i.test(bodyText),
        hasChallenge: /challenge|recaptcha|verify/i.test(bodyText) || !!document.querySelector('#challenge-form, .g-recaptcha')
      };
    });
    console.log('Result:', result);

  } catch (e) {
    console.error('Error on 3D Pros:', e.message);
  } finally {
    await browser.close();
  }
}

test3DPros();
