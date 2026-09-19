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

async function submitValley() {
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

  console.log('Finding visible inputs...');
  const inputs = await page.$$('form input[type="text"]:not([name="_app_id"])');
  console.log(`Found ${inputs.length} text inputs.`);

  if (inputs.length >= 3) {
    console.log('Typing name...');
    await inputs[0].click();
    await inputs[0].type(OUTREACH_PROFILE.fullName, { delay: 30 });

    console.log('Typing email...');
    await inputs[1].click();
    await inputs[1].type(OUTREACH_PROFILE.email, { delay: 30 });

    console.log('Typing phone...');
    await inputs[2].click();
    await inputs[2].type(OUTREACH_PROFILE.phone, { delay: 30 });
  }

  const textarea = await page.$('form textarea');
  if (textarea) {
    console.log('Typing message...');
    await textarea.click();
    await textarea.type(OUTREACH_PROFILE.message, { delay: 10 });
  }

  console.log('Clicking Send button...');
  const submitBtn = await page.$('form button[type="submit"]');
  if (submitBtn) {
    await submitBtn.click();
  }

  console.log('Waiting 8s...');
  await new Promise(r => setTimeout(r, 8000));

  const result = await page.evaluate(() => {
    const confirmation = document.querySelector('[data-aid="CONTACT_FORM_SUCCESS_MESSAGE"], [data-ux="Confirmation"], [role="alert"]');
    return {
      confirmationMsg: confirmation ? confirmation.innerText : null,
      pageText: document.body.innerText.slice(0, 500)
    };
  });

  console.log('Result:', result);
  await browser.close();
}

submitValley();
