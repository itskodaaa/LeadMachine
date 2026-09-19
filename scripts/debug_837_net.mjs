import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
puppeteer.use(StealthPlugin());
const CHROME_BIN = '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

async function check() {
  const browser = await puppeteer.launch({ executablePath: CHROME_BIN, headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  // Listen to network responses
  page.on('response', async res => {
    if (res.url().includes('contact') || res.url().includes('form') || res.url().includes('conversations') || res.request().method() === 'POST') {
      try {
        console.log('Response:', res.status(), res.url());
        const body = await res.text();
        console.log('Response body:', body.substring(0, 300));
      } catch (e) {}
    }
  });

  await page.goto('https://qnspc.com/contact', { waitUntil: 'networkidle2' });
  await page.type('input[data-aid="CONTACT_FORM_NAME"]', 'Pamela Jameson', { delay: 30 });
  await page.type('input[data-aid="CONTACT_FORM_EMAIL"]', 'pamela.jameson@northeastprecision.com', { delay: 30 });
  await page.type('textarea[data-aid="CONTACT_FORM_MESSAGE"]', 'Hello, we would like to inquire about your structural engineering services for commercial facility projects. Please contact us at your earliest convenience.', { delay: 10 });

  console.log('Clicking submit...');
  await page.click('button[data-aid="CONTACT_SUBMIT_BUTTON_REND"]');

  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 1000));
    const info = await page.evaluate(() => {
      const btn = document.querySelector('button[data-aid="CONTACT_SUBMIT_BUTTON_REND"]');
      const alerts = Array.from(document.querySelectorAll('[role="alert"], .alert, [data-aid*="SUCCESS"], [data-aid*="ERROR"]')).map(e => e.innerText);
      const text = document.body.innerText;
      return {
        btnText: btn ? btn.innerText : null,
        alerts,
        hasSuccess: text.toLowerCase().includes('thank') || text.toLowerCase().includes('received') || text.toLowerCase().includes('sent')
      };
    });
    console.log(`Time ${i+1}s:`, JSON.stringify(info));
    if (info.alerts.length > 0 || (info.btnText && info.btnText !== 'SENDING' && info.btnText !== 'SEND')) break;
  }

  await browser.close();
}
check();
