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

async function testGoDaddyReactProper() {
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

    // Get input selectors
    const inputIds = await page.evaluate(() => {
      const form = document.querySelector('form');
      if (!form) return [];
      return Array.from(form.querySelectorAll('input:not([type="hidden"]), textarea')).map(i => ({
        id: i.id,
        tag: i.tagName,
        type: i.type,
        placeholder: i.placeholder
      }));
    });
    console.log('Sykes detected inputs:', inputIds);

    for (let i = 0; i < inputIds.length; i++) {
      const item = inputIds[i];
      const selector = item.id ? `#${item.id}` : (item.tag === 'TEXTAREA' ? 'form textarea' : `form input:nth-of-type(${i+1})`);
      await page.focus(selector);
      let val = OUTREACH_PROFILE.fullName;
      if (i === 1) val = OUTREACH_PROFILE.email;
      else if (i === 2) val = OUTREACH_PROFILE.phone;
      else if (i === 3) val = OUTREACH_PROFILE.message;
      await page.keyboard.type(val, { delay: 15 });
    }

    console.log('Sykes inputs typed. Clicking Send...');
    await page.evaluate(() => {
      const form = document.querySelector('form');
      const btn = Array.from(form ? form.querySelectorAll('button') : document.querySelectorAll('button'))
        .find(b => b.innerText.trim().toLowerCase() === 'send');
      if (btn) btn.click();
    });

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

    const inputIds = await page.evaluate(() => {
      const form = document.querySelector('form');
      if (!form) return [];
      return Array.from(form.querySelectorAll('input:not([type="hidden"]), textarea')).map(i => ({
        id: i.id,
        tag: i.tagName,
        type: i.type,
        placeholder: i.placeholder
      }));
    });
    console.log('Sanrachna detected inputs:', inputIds);

    for (let i = 0; i < inputIds.length; i++) {
      const item = inputIds[i];
      const selector = item.id ? `#${item.id}` : (item.tag === 'TEXTAREA' ? 'form textarea' : `form input:nth-of-type(${i+1})`);
      await page.focus(selector);
      let val = OUTREACH_PROFILE.fullName;
      if (i === 1) val = OUTREACH_PROFILE.email;
      else if (i === 2) val = OUTREACH_PROFILE.phone;
      else if (i === 3) val = OUTREACH_PROFILE.message;
      await page.keyboard.type(val, { delay: 15 });
    }

    console.log('Sanrachna inputs typed. Clicking Send...');
    await page.evaluate(() => {
      const form = document.querySelector('form');
      const btn = Array.from(form ? form.querySelectorAll('button') : document.querySelectorAll('button'))
        .find(b => b.innerText.trim().toLowerCase() === 'send');
      if (btn) btn.click();
    });

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

testGoDaddyReactProper();
