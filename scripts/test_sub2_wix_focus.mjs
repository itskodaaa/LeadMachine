import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const OUTREACH = {
  firstName: 'Pamela',
  lastName: 'Jameson',
  fullName: 'Pamela Jameson',
  email: 'pamela.jameson@nortiheastprecision.com',
  phone: '708-568-3708',
  company: 'Northeast Precision Machinery, Inc.',
  address: '100 Main St, Chicago, IL 60601',
  subject: 'Exploring Collaboration Opportunities',
  message: 'Hello, I am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects. Thank you, Pamela Jameson'
};

async function testWix3560() {
  console.log('\n========================================');
  console.log('Testing Lead #3560 Wix Form');
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  page.setDefaultNavigationTimeout(35000);
  await page.setViewport({ width: 1280, height: 800 });

  page.on('response', async resp => {
    if (resp.url().includes('wix') || resp.url().includes('forms')) {
      if (resp.request().method() === 'POST') {
        console.log(`[3560 POST] ${resp.url()} -> Status ${resp.status()}`);
        try {
          const text = await resp.text();
          if (text.length < 500) console.log('Response body:', text);
        } catch (e) {}
      }
    }
  });

  try {
    await page.goto('https://www.foresightpes.com/contact', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await new Promise(r => setTimeout(r, 4000));

    // Check if form is visible
    const formInfo = await page.evaluate(() => {
      const el = document.querySelector('#comp-ked07w86');
      return el ? { id: el.id, html: el.outerHTML.substring(0, 500) } : null;
    });
    console.log('3560 formInfo:', formInfo ? 'found' : 'null');

    // Scroll to form
    await page.evaluate(() => {
      const el = document.querySelector('#comp-ked07w86');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    await new Promise(r => setTimeout(r, 1000));

    // Type with focus & dispatchEvent
    await page.focus('#input_comp-ked07w9s');
    await page.keyboard.type(OUTREACH.fullName, { delay: 20 });

    await page.focus('#input_comp-ked07waa');
    await page.keyboard.type(OUTREACH.email, { delay: 20 });

    await page.focus('#input_comp-ked07wai');
    await page.keyboard.type(OUTREACH.subject, { delay: 20 });

    await page.focus('#textarea_comp-ked07wam1');
    await page.keyboard.type(OUTREACH.message, { delay: 10 });

    await new Promise(r => setTimeout(r, 1000));

    // Click submit button directly via mouse click coordinates
    const btnBox = await page.evaluate(() => {
      const btn = document.querySelector('#comp-ked07w86 button') || Array.from(document.querySelectorAll('button')).find(b => b.innerText.trim() === 'Send');
      if (!btn) return null;
      const rect = btn.getBoundingClientRect();
      return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
    });

    console.log('Button coordinates:', btnBox);
    if (btnBox) {
      await page.mouse.click(btnBox.x, btnBox.y);
    }

    await new Promise(r => setTimeout(r, 6000));

    const result = await page.evaluate(() => {
      const formEl = document.querySelector('#comp-ked07w86');
      const body = document.body.innerText;
      return {
        formText: formEl ? formEl.innerText : 'not found',
        hasThanks: /thanks for submitting|thank you|message sent|we'll be in touch/i.test(body)
      };
    });

    console.log('Result 3560:', JSON.stringify(result, null, 2));
  } catch (e) {
    console.error('Error 3560:', e.message);
  } finally {
    await browser.close();
  }
}

async function testWix3566() {
  console.log('\n========================================');
  console.log('Testing Lead #3566 Wix Form (Cammaster)');
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  page.setDefaultNavigationTimeout(35000);
  await page.setViewport({ width: 1280, height: 800 });

  page.on('response', async resp => {
    if (resp.request().method() === 'POST' && (resp.url().includes('wix') || resp.url().includes('form'))) {
      console.log(`[3566 POST] ${resp.url()} -> Status ${resp.status()}`);
    }
  });

  try {
    await page.goto('https://www.cammastermachining.com/blank-2', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await new Promise(r => setTimeout(r, 4000));

    await page.evaluate(() => {
      const el = document.querySelector('#comp-lpuhdaxg');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    await new Promise(r => setTimeout(r, 1000));

    await page.focus('#input_comp-lpuhdaxo');
    await page.keyboard.type(OUTREACH.fullName, { delay: 20 });

    await page.focus('#input_comp-lpuhday7');
    await page.keyboard.type(OUTREACH.email, { delay: 20 });

    await page.focus('#input_comp-lpuhdaya1');
    await page.keyboard.type(OUTREACH.phone, { delay: 20 });

    await page.focus('#input_comp-lpuhdayd2');
    await page.keyboard.type(OUTREACH.address, { delay: 20 });

    await page.focus('#input_comp-lpuhdayk1');
    await page.keyboard.type(OUTREACH.subject, { delay: 20 });

    await page.focus('#textarea_comp-lpuhdayo1');
    await page.keyboard.type(OUTREACH.message, { delay: 10 });

    await new Promise(r => setTimeout(r, 1000));

    const btnBox = await page.evaluate(() => {
      const btn = document.querySelector('#comp-lpuhdaxg button') || Array.from(document.querySelectorAll('button')).find(b => b.innerText.trim() === 'Submit');
      if (!btn) return null;
      const rect = btn.getBoundingClientRect();
      return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
    });

    console.log('Button coordinates:', btnBox);
    if (btnBox) {
      await page.mouse.click(btnBox.x, btnBox.y);
    }

    await new Promise(r => setTimeout(r, 6000));

    const result = await page.evaluate(() => {
      const formEl = document.querySelector('#comp-lpuhdaxg');
      const body = document.body.innerText;
      return {
        formText: formEl ? formEl.innerText : 'not found',
        hasThanks: /thanks for submitting|thank you|message sent|we'll be in touch/i.test(body)
      };
    });

    console.log('Result 3566:', JSON.stringify(result, null, 2));
  } catch (e) {
    console.error('Error 3566:', e.message);
  } finally {
    await browser.close();
  }
}

async function run() {
  await testWix3560();
  await testWix3566();
}

run().catch(console.error);
