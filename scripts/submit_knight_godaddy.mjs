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
  phone: '7085683708',
  company: 'Northeast Precision Machinery, Inc.',
  subject: 'Exploring Collaboration Opportunities',
  message: `Hello,\n\nI am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects.\n\nWe look forward to your response and the possibility of working together.\n\nThank you for your time and attention.\n\nSincerely,\nPamela Jameson`
};

async function submitKnight(browser) {
  console.log('\n--- Submitting 4159 Knight 123FormBuilder ---');
  const page = await browser.newPage();
  try {
    await page.goto('https://www.123formbuilder.com/form-1484936/', { waitUntil: 'networkidle2', timeout: 20000 });
    const inputs = await page.$$('input[type="text"], input[type="email"], textarea');
    console.log('Inputs found:', inputs.length);
    if (inputs.length >= 4) {
      await inputs[0].type(OUTREACH_PROFILE.fullName);
      await inputs[1].type(OUTREACH_PROFILE.email);
      await inputs[2].type(OUTREACH_PROFILE.phone);
      await inputs[3].type(OUTREACH_PROFILE.message);

      page.on('response', async res => {
        if (res.request().method() === 'POST') {
          console.log(`[Knight Net] ${res.status()} ${res.url()}`);
        }
      });

      console.log('Clicking Submit button...');
      await page.click('button[type="submit"], input[type="submit"]');
      await new Promise(r => setTimeout(r, 6000));
      console.log('Knight final URL:', page.url());
      const body = await page.evaluate(() => document.body.innerText);
      const match = body.match(/(?:thank|received|success|sent)[^\n\.]*/i);
      console.log('Knight confirmation snippet:', match ? match[0] : 'None');
    }
  } catch (e) {
    console.log('Knight submit error:', e.message);
  } finally {
    await page.close();
  }
}

async function submitLECGI(browser) {
  console.log('\n--- Submitting 4163 LECGI ---');
  const page = await browser.newPage();
  try {
    await page.goto('https://lecgitx.com/', { waitUntil: 'networkidle2', timeout: 20000 });
    const filled = await page.evaluate((p) => {
      const form = document.querySelector('form');
      if (!form) return false;
      const textInputs = Array.from(form.querySelectorAll('input[type="text"]:not([name="_app_id"])'));
      if (textInputs.length >= 3) {
        textInputs[0].value = p.fullName;
        textInputs[0].dispatchEvent(new Event('input', { bubbles: true }));
        textInputs[0].dispatchEvent(new Event('change', { bubbles: true }));

        textInputs[1].value = p.email;
        textInputs[1].dispatchEvent(new Event('input', { bubbles: true }));
        textInputs[1].dispatchEvent(new Event('change', { bubbles: true }));

        textInputs[2].value = p.phone;
        textInputs[2].dispatchEvent(new Event('input', { bubbles: true }));
        textInputs[2].dispatchEvent(new Event('change', { bubbles: true }));
      }
      const ta = form.querySelector('textarea');
      if (ta) {
        ta.value = p.message;
        ta.dispatchEvent(new Event('input', { bubbles: true }));
        ta.dispatchEvent(new Event('change', { bubbles: true }));
      }
      return true;
    }, OUTREACH_PROFILE);

    console.log('LECGI fields populated:', filled);

    page.on('response', async res => {
      if (res.request().method() === 'POST') {
        console.log(`[LECGI Net] ${res.status()} ${res.url()}`);
        try { console.log('Response body:', (await res.text()).substring(0, 200)); } catch(_) {}
      }
    });

    console.log('Clicking LECGI SEND button...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button, input[type="submit"]'));
      const btn = btns.find(b => b.innerText.toLowerCase().includes('send'));
      if (btn) btn.click();
    });

    await new Promise(r => setTimeout(r, 6000));
    const body = await page.evaluate(() => document.body.innerText);
    const match = body.match(/(?:thank|received|success|sent)[^\n\.]*/i);
    console.log('LECGI confirmation snippet:', match ? match[0] : 'None');
  } catch (e) {
    console.log('LECGI submit error:', e.message);
  } finally {
    await page.close();
  }
}

async function submitMBM(browser) {
  console.log('\n--- Submitting 4168 MBM ---');
  const page = await browser.newPage();
  try {
    await page.goto('https://mbmengr.com/contact-us', { waitUntil: 'networkidle2', timeout: 20000 });
    const filled = await page.evaluate((p) => {
      const form = document.querySelector('form');
      if (!form) return false;
      const textInputs = Array.from(form.querySelectorAll('input[type="text"]:not([name="_app_id"])'));
      if (textInputs.length >= 2) {
        textInputs[0].value = p.fullName;
        textInputs[0].dispatchEvent(new Event('input', { bubbles: true }));
        textInputs[0].dispatchEvent(new Event('change', { bubbles: true }));

        textInputs[1].value = p.email;
        textInputs[1].dispatchEvent(new Event('input', { bubbles: true }));
        textInputs[1].dispatchEvent(new Event('change', { bubbles: true }));
      }
      const ta = form.querySelector('textarea');
      if (ta) {
        ta.value = p.message;
        ta.dispatchEvent(new Event('input', { bubbles: true }));
        ta.dispatchEvent(new Event('change', { bubbles: true }));
      }
      return true;
    }, OUTREACH_PROFILE);

    console.log('MBM fields populated:', filled);

    page.on('response', async res => {
      if (res.request().method() === 'POST') {
        console.log(`[MBM Net] ${res.status()} ${res.url()}`);
        try { console.log('Response body:', (await res.text()).substring(0, 200)); } catch(_) {}
      }
    });

    console.log('Clicking MBM SEND button...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button, input[type="submit"]'));
      const btn = btns.find(b => b.innerText.toLowerCase().includes('send'));
      if (btn) btn.click();
    });

    await new Promise(r => setTimeout(r, 6000));
    const body = await page.evaluate(() => document.body.innerText);
    const match = body.match(/(?:thank|received|success|sent)[^\n\.]*/i);
    console.log('MBM confirmation snippet:', match ? match[0] : 'None');
  } catch (e) {
    console.log('MBM submit error:', e.message);
  } finally {
    await page.close();
  }
}

async function run() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,800']
  });

  await submitKnight(browser);
  await submitLECGI(browser);
  await submitMBM(browser);

  await browser.close();
}

run();
