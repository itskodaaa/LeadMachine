import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import db from './db.mjs';

puppeteer.use(StealthPlugin());
const CHROME_BIN = '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

async function testSlidematic() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  page.on('response', async res => {
    const url = res.url();
    if (url.includes('wix-forms') || url.includes('submit')) {
      console.log(`[API Response] ${res.status()} ${url}`);
      try {
        const text = await res.text();
        console.log(`[API Body] ${text.slice(0, 200)}`);
      } catch (e) {}
    }
  });

  try {
    console.log('Navigating to https://www.slidematicproducts.com/ ...');
    await page.goto('https://www.slidematicproducts.com/', { waitUntil: 'networkidle2', timeout: 30000 });
    console.log('Title:', await page.title());

    // Check Wix form elements
    const formInfo = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input, textarea')).map(el => ({
        id: el.id,
        name: el.name,
        placeholder: el.placeholder,
        type: el.type,
        visible: el.offsetParent !== null
      }));
      const buttons = Array.from(document.querySelectorAll('button, [data-testid="buttonElement"]')).map(el => ({
        id: el.id,
        text: el.innerText.trim()
      }));
      return { inputs, buttons };
    });
    console.log('Form elements:', JSON.stringify(formInfo, null, 2));

    // Fill form
    // Name
    const nameInput = await page.$('input[name*="name"], #input_comp-ke91r61v, input[placeholder*="Name" i]');
    if (nameInput) {
      await nameInput.type('Pamela Jameson', { delay: 50 });
      console.log('Typed Name');
    }

    // Email
    const emailInput = await page.$('input[name*="email"], #input_comp-ke91r61f, input[type="email"]');
    if (emailInput) {
      await emailInput.type('pamela.jameson@northeastprecision.com', { delay: 50 });
      console.log('Typed Email');
    }

    // Company / Subject
    const compInput = await page.$('#input_comp-ke91r626, input[name*="company" i], input[placeholder*="Subject" i], input[placeholder*="Company" i]');
    if (compInput) {
      await compInput.type('Northeast Precision Machinery, Inc.', { delay: 50 });
      console.log('Typed Company');
    }

    // Textarea / Message
    const msgInput = await page.$('textarea, #textarea_comp-ke91r62l');
    if (msgInput) {
      await msgInput.type('Hello, Northeast Precision Machinery specializes in precision machining, fabrication, and equipment solutions. We would welcome the opportunity to discuss machining requirements or provide support for upcoming manufacturing projects. Best regards, Pamela Jameson | 708-568-3708', { delay: 20 });
      console.log('Typed Message');
    }

    await new Promise(r => setTimeout(r, 1000));

    // Find submit button
    const submitBtn = await page.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll('button, [data-testid="buttonElement"]'));
      return btns.find(b => /send|submit|contact/i.test(b.innerText));
    });

    if (submitBtn && submitBtn.asElement()) {
      console.log('Clicking submit button...');
      await submitBtn.asElement().click();
      await new Promise(r => setTimeout(r, 5000));

      const pageText = await page.evaluate(() => document.body.innerText);
      const isSuccess = /thank|received|submitted|success/i.test(pageText);
      console.log('Confirmation check in DOM:', isSuccess);

      // Check specific wix confirmation message
      const wixMsg = await page.evaluate(() => {
        const msgEl = document.querySelector('[data-testid="messageline"], [id*="notifications"]');
        return msgEl ? msgEl.innerText : null;
      });
      console.log('Wix msg element:', wixMsg);
    } else {
      console.log('Could not find submit button');
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await browser.close();
  }
}

testSlidematic();
