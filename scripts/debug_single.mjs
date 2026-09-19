import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';
puppeteer.use(StealthPlugin());

const CHROME_BIN = '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

const PROFILE = {
  fullName: 'Pamela Jameson',
  email: 'pamela.jameson@nortiheastprecision.com',
  phone: '708-568-3708',
  message: 'Hello, I am reaching out to express our interest in your services and request a representative to contact for potential collaboration and upcoming project quotes. Thank you. Pamela Jameson'
};

async function testWG() {
  const browser = await puppeteer.launch({ executablePath: CHROME_BIN, headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  page.on('response', async resp => {
    if (resp.url().includes('admin-ajax.php') || resp.request().method() === 'POST') {
      console.log('Response status:', resp.status(), resp.url());
      try {
        const text = await resp.text();
        console.log('Response body:', text.slice(0, 300));
      } catch (_) {}
    }
  });

  await page.goto('https://www.wilsongirgenti.com/contact/', { waitUntil: 'networkidle2' });
  await page.type('#form-field-name', PROFILE.fullName);
  await page.type('#form-field-email', PROFILE.email);
  await page.type('#form-field-field_d5c08de', PROFILE.phone);
  await page.type('#form-field-message', PROFILE.message);
  
  const submitBtn = await page.$('button[type="submit"]');
  await submitBtn.click();
  await new Promise(r => setTimeout(r, 6000));

  const messages = await page.evaluate(() => {
    const elMsg = Array.from(document.querySelectorAll('.elementor-message, .elementor-message-success, .elementor-message-danger')).map(e => e.innerText);
    return { elMsg, bodySnippets: document.body.innerText.split('\n').filter(s => s.toLowerCase().includes('message') || s.toLowerCase().includes('error') || s.toLowerCase().includes('success') || s.toLowerCase().includes('thank')).slice(0, 10) };
  });
  console.log('WG Result:', JSON.stringify(messages, null, 2));

  await browser.close();
}

testWG();
