import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const PROFILE = {
  fullName: 'Pamela Jameson',
  firstName: 'Pamela',
  lastName: 'Jameson',
  email: 'pamela.jameson@nortiheastprecision.com',
  phone: '708-568-3708',
  company: 'Northeast Precision Machinery, Inc.',
  subject: 'Inquiry: Tool & Die / Precision Stamping Collaboration',
  message: 'Hello, I am reaching out from Northeast Precision Machinery to express our interest in your services and request a representative to contact us for potential collaboration and project quotes. Thank you!'
};

async function testSubmits() {
  const browser = await puppeteer.launch({
    headless: "new",
    executablePath: CHROME_BIN,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  // 1. Toolcraft (#4725)
  console.log("\n--- Testing Toolcraft (#4725) ---");
  try {
    const page = await browser.newPage();
    await page.goto('https://aztoolcraft.com/#contact', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));

    // Fill inputs
    await page.type('#input_1_5', PROFILE.fullName, { delay: 30 });
    await page.type('#input_1_7', PROFILE.company, { delay: 30 });
    await page.type('#input_1_2', PROFILE.phone, { delay: 30 });
    await page.type('#input_1_3', PROFILE.email, { delay: 30 });
    await page.type('#input_1_6', PROFILE.message, { delay: 10 });
    // input_1_8 is honeypot, DO NOT fill!

    console.log("Submitting Toolcraft...");
    await Promise.all([
      page.click('#gform_submit_button_1'),
      page.waitForResponse(r => r.url().includes('aztoolcraft') && r.status() === 200, { timeout: 15000 }).catch(() => null)
    ]);
    await new Promise(r => setTimeout(r, 4000));

    const result = await page.evaluate(() => {
      const confirmation = document.querySelector('.gform_confirmation_message, #gforms_confirmation_message_1, .gform_validation_error');
      return {
        text: confirmation ? confirmation.innerText : '',
        bodyText: document.body.innerText.slice(0, 500)
      };
    });
    console.log("Toolcraft result:", result);
    await page.close();
  } catch (e) {
    console.error("Toolcraft error:", e.message);
  }

  // 2. MR Steel (#4717)
  console.log("\n--- Testing MR Steel (#4717) ---");
  try {
    const page = await browser.newPage();
    await page.goto('https://www.mrsteel.us/contact', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 3000));

    // Form 1 inputs:
    await page.type('#input_comp-kf4ididr', PROFILE.fullName, { delay: 30 });
    await page.type('#input_comp-kf4idie4', PROFILE.email, { delay: 30 });
    await page.type('#input_comp-kf4idie9', PROFILE.phone, { delay: 30 });
    await page.type('#input_comp-kf4idieg', PROFILE.subject, { delay: 30 });
    await page.type('#textarea_comp-kf4idiek', PROFILE.message, { delay: 10 });

    console.log("Submitting MR Steel...");
    const sendBtn = await page.$('#comp-kf4idicg button[type="submit"]');
    if (sendBtn) {
      await sendBtn.click();
    } else {
      await page.click('button[type="submit"]');
    }
    await new Promise(r => setTimeout(r, 5000));

    const result = await page.evaluate(() => {
      const messages = Array.from(document.querySelectorAll('[id*="comp-kf4"], [class*="notification"], [class*="message"]'))
        .map(el => el.innerText)
        .filter(t => /thank|received|sent|error|success/i.test(t));
      return {
        messages,
        bodyExcerpt: document.body.innerText.slice(0, 500)
      };
    });
    console.log("MR Steel result:", result);
    await page.close();
  } catch (e) {
    console.error("MR Steel error:", e.message);
  }

  // 3. Cupp's (#4719)
  console.log("\n--- Testing Cupp's Industrial Supply (#4719) ---");
  try {
    const page = await browser.newPage();
    await page.goto('https://www.cuppsind.com/contact/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));

    await page.type('#input_1_1_3', PROFILE.firstName, { delay: 30 });
    await page.type('#input_1_1_6', PROFILE.lastName, { delay: 30 });
    await page.type('#input_1_4', PROFILE.company, { delay: 30 });
    await page.type('#input_1_2', PROFILE.email, { delay: 30 });
    await page.type('#input_1_3', PROFILE.phone, { delay: 30 });
    await page.type('#input_1_5', PROFILE.message, { delay: 10 });

    console.log("Submitting Cupp's...");
    await Promise.all([
      page.click('#gform_submit_button_1'),
      page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => null)
    ]);
    await new Promise(r => setTimeout(r, 3000));

    const result = await page.evaluate(() => {
      const confirmation = document.querySelector('.gform_confirmation_message, #gforms_confirmation_message_1, .validation_error');
      return {
        url: window.location.href,
        confirmation: confirmation ? confirmation.innerText : '',
        body: document.body.innerText.slice(0, 500)
      };
    });
    console.log("Cupp's result:", result);
    await page.close();
  } catch (e) {
    console.error("Cupp's error:", e.message);
  }

  // 4. Kaplan (#4720)
  console.log("\n--- Testing Kaplan (#4720) ---");
  try {
    const page = await browser.newPage();
    await page.goto('https://kaplanmfg.com/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));

    // Scroll down to form
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    await new Promise(r => setTimeout(r, 1000));

    await page.focus('#input1');
    await page.type('#input1', PROFILE.fullName, { delay: 30 });
    await page.focus('#input2');
    await page.type('#input2', PROFILE.email, { delay: 30 });
    await page.focus('textarea');
    await page.type('textarea', PROFILE.message, { delay: 10 });

    console.log("Submitting Kaplan...");
    const submitBtn = await page.$('form button[type="submit"]');
    if (submitBtn) {
      await submitBtn.click();
    }
    await new Promise(r => setTimeout(r, 5000));

    const result = await page.evaluate(() => {
      return {
        bodyText: document.body.innerText.slice(0, 1000)
      };
    });
    console.log("Kaplan result text excerpt:", result.bodyText);
    await page.close();
  } catch (e) {
    console.error("Kaplan error:", e.message);
  }

  await browser.close();
}

testSubmits();
