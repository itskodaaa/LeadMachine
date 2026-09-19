import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

const CHROME_BIN = '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

const OUTREACH_PROFILE = {
  fullName: 'Pamela Jameson',
  email: 'pamela.jameson@nortiheastprecision.com',
  message: `Hello,

I am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects.

We look forward to your response and the possibility of working together.

Thank you for your time and attention.

Sincerely,
Pamela Jameson`
};

async function testLogicGate() {
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
    if (url.includes('form') || url.includes('contact') || url.includes('submit') || url.includes('godaddy') || url.includes('api')) {
      console.log(`[Response] ${res.status()} ${url.slice(0, 100)}`);
      try {
        const txt = await res.text();
        console.log(`Body: ${txt.slice(0, 200)}`);
      } catch (e) {}
    }
  });

  console.log('Navigating to https://logicgate-engineering.com/ ...');
  await page.goto('https://logicgate-engineering.com/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await new Promise(r => setTimeout(r, 4000));

  console.log('Filling fields...');
  const nameInput = await page.$('#input1');
  if (nameInput) {
    await nameInput.click();
    await nameInput.type(OUTREACH_PROFILE.fullName, { delay: 20 });
  }

  const emailInput = await page.$('#input2');
  if (emailInput) {
    await emailInput.click();
    await emailInput.type(OUTREACH_PROFILE.email, { delay: 20 });
  }

  const msgInput = await page.$('textarea');
  if (msgInput) {
    await msgInput.click();
    await msgInput.type(OUTREACH_PROFILE.message, { delay: 10 });
  }

  console.log('Clicking Send button...');
  const sendBtn = await page.$('button[data-aid="CONTACT_SUBMIT_BUTTON_REND"]');
  if (sendBtn) {
    await sendBtn.click();
  }

  console.log('Waiting 8s for confirmation...');
  await new Promise(r => setTimeout(r, 8000));

  const result = await page.evaluate(() => {
    const successMsg = document.querySelector('[data-aid="CONTACT_FORM_SUCCESS_MESSAGE"], [data-ux="Confirmation"], [role="alert"]');
    return {
      successEl: successMsg ? successMsg.innerText : null,
      pageText: document.body.innerText.slice(0, 800)
    };
  });

  console.log('Result:', result);
  await browser.close();
}

testLogicGate();
