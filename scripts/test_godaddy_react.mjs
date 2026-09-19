import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const OUTREACH_PROFILE = {
  fullName: 'Pamela Jameson',
  email: 'pamela.jameson@nortiheastprecision.com',
  phone: '708-568-3708',
  message: 'Hello, I am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects. Thank you. Sincerely, Pamela Jameson'
};

async function testGoDaddyReact() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  // Sykes Consulting (4392)
  console.log('\n--- Typing into Sykes Consulting (4392) ---');
  try {
    const page = await browser.newPage();
    await page.goto('https://sykes-consulting.com/contact-us', { waitUntil: 'networkidle2', timeout: 25000 });

    // Accept cookies if present
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => /accept|agree|ok/i.test(b.innerText));
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 1000));

    // Focus and type into inputs by their labels or matching selectors
    const nameInput = await page.$('form input#input3, form input[aria-label*="Name"], form input[placeholder*="Name"]');
    if (nameInput) {
      await nameInput.click({ clickCount: 3 });
      await nameInput.type(OUTREACH_PROFILE.fullName, { delay: 20 });
    }

    const emailInput = await page.$('form input#input4, form input[type="email"], form input[aria-label*="Email"]');
    if (emailInput) {
      await emailInput.click({ clickCount: 3 });
      await emailInput.type(OUTREACH_PROFILE.email, { delay: 20 });
    }

    const phoneInput = await page.$('form input#input5, form input[type="tel"], form input[aria-label*="Phone"]');
    if (phoneInput) {
      await phoneInput.click({ clickCount: 3 });
      await phoneInput.type(OUTREACH_PROFILE.phone, { delay: 20 });
    }

    const msgInput = await page.$('form textarea');
    if (msgInput) {
      await msgInput.click({ clickCount: 3 });
      await msgInput.type(OUTREACH_PROFILE.message, { delay: 10 });
    }

    console.log('Sykes fields typed with keyboard. Clicking Send...');
    const sendBtn = await page.$('form button[type="submit"], form button:has-text("Send")') || await page.evaluateHandle(() => {
      return Array.from(document.querySelectorAll('button')).find(b => b.innerText.trim().toLowerCase() === 'send');
    });

    if (sendBtn) {
      await sendBtn.click();
    }

    // Monitor for 8 seconds
    for (let i = 0; i < 8; i++) {
      await new Promise(r => setTimeout(r, 1000));
      const postText = await page.evaluate(() => {
        const text = document.body.innerText;
        const thankYou = /thank you|thanks for|we have received|message sent/i.test(text);
        const error = /please fill|please enter/i.test(text);
        return { thankYou, error, excerpt: text.substring(0, 300) };
      });
      if (postText.thankYou) {
        console.log(`Sykes confirmed at ${i+1}s!`);
        break;
      }
      if (i === 7) {
        console.log('Sykes postText after 8s:', postText);
      }
    }

    await page.close();
  } catch (e) {
    console.log('Sykes error:', e.message);
  }

  // Sanrachna Steel (4391)
  console.log('\n--- Typing into Sanrachna Steel (4391) ---');
  try {
    const page = await browser.newPage();
    await page.goto('https://sanrachnasteel.com/contact-us', { waitUntil: 'networkidle2', timeout: 25000 });

    // Accept cookies if present
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => /accept|agree|ok/i.test(b.innerText));
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 1000));

    // Focus and type
    const nameInput = await page.$('form input#input4, form input[aria-label*="Name"], form input[placeholder*="Name"]');
    if (nameInput) {
      await nameInput.click({ clickCount: 3 });
      await nameInput.type(OUTREACH_PROFILE.fullName, { delay: 20 });
    }

    const emailInput = await page.$('form input#input5, form input[type="email"], form input[aria-label*="Email"]');
    if (emailInput) {
      await emailInput.click({ clickCount: 3 });
      await emailInput.type(OUTREACH_PROFILE.email, { delay: 20 });
    }

    const phoneInput = await page.$('form input#input6, form input[type="tel"], form input[aria-label*="Phone"]');
    if (phoneInput) {
      await phoneInput.click({ clickCount: 3 });
      await phoneInput.type(OUTREACH_PROFILE.phone, { delay: 20 });
    }

    const msgInput = await page.$('form textarea');
    if (msgInput) {
      await msgInput.click({ clickCount: 3 });
      await msgInput.type(OUTREACH_PROFILE.message, { delay: 10 });
    }

    console.log('Sanrachna fields typed with keyboard. Clicking Send...');
    const sendBtn = await page.$('form button[type="submit"]') || await page.evaluateHandle(() => {
      return Array.from(document.querySelectorAll('button')).find(b => b.innerText.trim().toLowerCase() === 'send');
    });

    if (sendBtn) {
      await sendBtn.click();
    }

    // Monitor for 8 seconds
    for (let i = 0; i < 8; i++) {
      await new Promise(r => setTimeout(r, 1000));
      const postText = await page.evaluate(() => {
        const text = document.body.innerText;
        const thankYou = /thank you|thanks for|we have received|message sent/i.test(text);
        const error = /please fill|please enter/i.test(text);
        return { thankYou, error, excerpt: text.substring(0, 300) };
      });
      if (postText.thankYou) {
        console.log(`Sanrachna confirmed at ${i+1}s!`);
        break;
      }
      if (i === 7) {
        console.log('Sanrachna postText after 8s:', postText);
      }
    }

    await page.close();
  } catch (e) {
    console.log('Sanrachna error:', e.message);
  }

  await browser.close();
}

testGoDaddyReact();
