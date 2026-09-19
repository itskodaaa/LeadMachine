import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const OUTREACH = {
  fullName: 'Pamela Jameson',
  firstName: 'Pamela',
  lastName: 'Jameson',
  email: 'pamela.jameson@nortiheastprecision.com',
  phone: '708-568-3708',
  company: 'Northeast Precision Machinery, Inc.',
  message: `Hello,

I am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects.

We look forward to your response and the possibility of working together.

Thank you for your time and attention.

Sincerely,
Pamela Jameson`
};

async function testHRA() {
  console.log('\n--- Testing #4146 HRA Engineering ---');
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1280, height: 900 });

    page.on('response', async res => {
      if (res.request().method() === 'POST') {
        console.log(`[HRA POST]: ${res.status()} ${res.url()}`);
        try {
          const body = await res.text();
          console.log(`[HRA Response]: ${body.slice(0, 300)}`);
        } catch (e) {}
      }
    });

    await page.goto('https://hra-eng.com/', { waitUntil: 'networkidle2', timeout: 25000 });

    // Look at form 1
    await page.type('#input91353', OUTREACH.fullName);
    await page.type('#input91354', OUTREACH.email);
    await page.type('#input91355', OUTREACH.phone);
    await page.evaluate((msg) => {
      const ta = document.querySelector('textarea[placeholder*="project"]');
      if (ta) ta.value = msg;
    }, OUTREACH.message);

    console.log('Filled HRA form. Submitting...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button, input[type="submit"]'));
      const sendBtn = btns.find(b => (b.innerText || b.value || '').toUpperCase().includes('SEND'));
      if (sendBtn) sendBtn.click();
    });

    await new Promise(r => setTimeout(r, 6000));
    const result = await page.evaluate(() => {
      const alerts = Array.from(document.querySelectorAll('[data-aid*="MESSAGE"], [data-aid*="SUCCESS"], .form-message, [role="alert"]'));
      return alerts.map(a => a.innerText).join(' | ') || document.body.innerText.slice(0, 600);
    });
    console.log('HRA result:', result);
  } catch (e) {
    console.error('HRA error:', e);
  } finally {
    await browser.close();
  }
}

async function testMPCE() {
  console.log('\n--- Testing #4148 MPCE ---');
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1280, height: 900 });

    page.on('response', async res => {
      if (res.request().method() === 'POST') {
        console.log(`[MPCE POST]: ${res.status()} ${res.url()}`);
        try {
          const body = await res.text();
          console.log(`[MPCE Response]: ${body.slice(0, 300)}`);
        } catch (e) {}
      }
    });

    await page.goto('https://mpce-tx.com/contact', { waitUntil: 'networkidle2', timeout: 25000 });

    await page.type('#input7', OUTREACH.fullName);
    await page.type('#input8', OUTREACH.email);
    await page.evaluate((msg) => {
      const ta = document.querySelector('textarea[placeholder*="Message"]');
      if (ta) ta.value = msg;
    }, OUTREACH.message);

    console.log('Filled MPCE form. Submitting...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button, input[type="submit"]'));
      const sendBtn = btns.find(b => (b.innerText || b.value || '').toUpperCase().includes('SEND'));
      if (sendBtn) sendBtn.click();
    });

    await new Promise(r => setTimeout(r, 6000));
    const result = await page.evaluate(() => {
      const alerts = Array.from(document.querySelectorAll('[data-aid*="MESSAGE"], [data-aid*="SUCCESS"], .form-message, [role="alert"]'));
      return alerts.map(a => a.innerText).join(' | ') || document.body.innerText.slice(0, 600);
    });
    console.log('MPCE result:', result);
  } catch (e) {
    console.error('MPCE error:', e);
  } finally {
    await browser.close();
  }
}

async function run() {
  await testHRA();
  await testMPCE();
}

run();
