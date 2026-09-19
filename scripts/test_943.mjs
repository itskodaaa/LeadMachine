import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());
const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const OUTREACH_PROFILE = {
  firstName: 'Pamela',
  lastName: 'Jameson',
  email: 'pamela.jameson@nortiheastprecision.com',
  message: 'Hello, I am reaching out to express our interest in your engineering and architectural services and would appreciate the opportunity to explore potential collaboration. Kindly arrange for a representative to contact us. Thank you, Pamela Jameson'
};

async function test() {
  const browser = await puppeteer.launch({ executablePath: CHROME_BIN, headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  page.on('response', async res => {
    if (res.request().method() === 'POST' || res.url().includes('contact')) {
      console.log('Response:', res.status(), res.url());
      try {
        console.log('Body:', (await res.text()).substring(0, 200));
      } catch (e) {}
    }
  });

  try {
    await page.goto('https://nyengineering.com/', { waitUntil: 'networkidle2', timeout: 20000 });
    await new Promise(r => setTimeout(r, 2000));

    await page.type('#g1-firstname', OUTREACH_PROFILE.firstName);
    await page.type('#g1-lastname', OUTREACH_PROFILE.lastName);
    await page.type('#g1-email', OUTREACH_PROFILE.email);
    await page.type('#contact-form-comment-g1-serviceexpected', OUTREACH_PROFILE.message);

    console.log('Form typed. Clicking Book a Consultation...');
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }).catch(e => console.log('Nav:', e.message)),
      page.click('button.wp-block-jetpack-button, input[type="submit"], button[type="submit"]')
    ]);

    await new Promise(r => setTimeout(r, 4000));

    const result = await page.evaluate(() => {
      const text = document.body ? document.body.innerText : '';
      const alerts = Array.from(document.querySelectorAll('.contact-form-success, .form-success, [role="alert"], h3')).map(el => el.innerText);
      return {
        url: window.location.href,
        alerts,
        bodyHasThank: text.toLowerCase().includes('thank') || text.toLowerCase().includes('message sent') || text.toLowerCase().includes('received'),
        snippet: text.substring(0, 500)
      };
    });

    console.log('Result:', result);

  } catch (e) {
    console.log('Error:', e.message);
  } finally {
    await browser.close();
  }
}

test();
