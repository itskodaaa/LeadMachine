import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';
import db from './db.mjs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

async function testCamExact() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,800']
  });

  const page = await browser.newPage();
  let submitInfo = null;

  page.on('response', async res => {
    if (res.url().includes('submit-form')) {
      try {
        const text = await res.text();
        submitInfo = { status: res.status(), body: text };
        console.log('Intercepted submit-form:', submitInfo);
      } catch (e) {
        submitInfo = { status: res.status(), error: e.message };
      }
    }
  });

  await page.goto('https://www.camintegrated.com/contact', { waitUntil: 'networkidle2' });

  await page.evaluate(() => {
    const el = document.getElementById('comp-k66juqee1');
    if (el) el.scrollIntoView();
  });
  await new Promise(r => setTimeout(r, 1000));

  await page.click('#input_comp-k66juqeu');
  await page.type('#input_comp-k66juqeu', 'Pamela Jameson', { delay: 20 });

  await page.click('#input_comp-k66juqfq');
  await page.type('#input_comp-k66juqfq', 'pamela.jameson@nortiheastprecision.com', { delay: 20 });

  await page.click('#input_comp-k66juqgk');
  await page.type('#input_comp-k66juqgk', 'Exploring Collaboration Opportunities', { delay: 20 });

  await page.click('#textarea_comp-k66juqhm');
  await page.type('#textarea_comp-k66juqhm', 'Hello, I am reaching out to express our interest in your services and request a representative to contact us for potential collaboration. Sincerely, Pamela Jameson', { delay: 10 });

  const btn = await page.$('form#comp-k66juqee1 button, [data-testid="buttonElement"]');
  if (btn) {
    await btn.click();
    console.log('Clicked button, waiting 8 seconds...');
    await new Promise(r => setTimeout(r, 8000));
  }

  console.log('Final submit info:', submitInfo);
  if (submitInfo && submitInfo.status === 200) {
    console.log('✅ Updating DB for #4216 CAM Integrated Solutions...');
    db.prepare('UPDATE leads SET status = ?, notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run('contacted', `Confirmed: Wix form API submission returned HTTP 200 OK (${submitInfo.body.slice(0, 150)})`, 4216);
    db.prepare('INSERT INTO contact_logs (lead_id, action, notes, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)')
      .run(4216, 'sent', `Confirmed: Wix form API submission returned HTTP 200 OK (${submitInfo.body.slice(0, 150)})`);
  }

  await browser.close();
}

testCamExact();
