import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';
import db from './db.mjs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

async function checkCamResponse() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  let submitResBody = null;
  let submitStatus = null;

  page.on('response', async res => {
    if (res.url().includes('wix-forms/v1/submit-form')) {
      submitStatus = res.status();
      try {
        submitResBody = await res.text();
      } catch (e) {
        submitResBody = e.message;
      }
    }
  });

  await page.goto('https://www.camintegrated.com/contact', { waitUntil: 'networkidle2' });

  await page.type('#input_comp-k66juqeu', 'Pamela Jameson', { delay: 10 });
  await page.type('#input_comp-k66juqfq', 'pamela.jameson@nortiheastprecision.com', { delay: 10 });
  await page.type('#input_comp-k66juqgk', 'Exploring Collaboration Opportunities', { delay: 10 });
  await page.type('#textarea_comp-k66juqhm', 'Hello, I am reaching out to express our interest in your services and request a representative contact us for potential collaboration. Sincerely, Pamela Jameson', { delay: 5 });

  const btn = await page.$('form#comp-k66juqee1 button, [data-testid="buttonElement"]');
  if (btn) {
    await btn.click();
    await new Promise(r => setTimeout(r, 6000));
  }

  console.log('CAM submitStatus:', submitStatus);
  console.log('CAM submitResBody:', submitResBody);

  if (submitStatus === 200) {
    console.log('✅ CAM INTEGRATED SOLUTIONS VERIFIED CONTACTED!');
    db.prepare('UPDATE leads SET status = ?, notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run('contacted', `Confirmed: Wix form API submission returned HTTP 200 OK (${submitResBody ? submitResBody.slice(0, 100) : ''})`, 4216);
    db.prepare('INSERT INTO contact_logs (lead_id, action, notes, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)')
      .run(4216, 'sent', `Confirmed: Wix form API submission returned HTTP 200 OK (${submitResBody ? submitResBody.slice(0, 100) : ''})`);
  }

  await browser.close();
}

checkCamResponse();
