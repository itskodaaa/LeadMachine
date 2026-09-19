import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import db from './db.mjs';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

async function run() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  page.on('response', async res => {
    const u = res.url();
    if (u.includes('contact') || u.includes('email') || u.includes('apps-api') || u.includes('instantpage')) {
      console.log(`HTTP ${res.status()} -> ${u.substring(0, 100)}`);
      try {
        const txt = await res.text();
        console.log(`Resp: ${txt.substring(0, 200)}`);
      } catch (e) {}
    }
  });

  try {
    await page.goto('https://twistedmetalswelding.com', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await new Promise(r => setTimeout(r, 2000));
    await page.waitForSelector('input[data-aid="CONTACT_FORM_NAME"]');

    // Focus and type
    await page.click('input[data-aid="CONTACT_FORM_NAME"]');
    await page.type('input[data-aid="CONTACT_FORM_NAME"]', 'Pamela Jameson', { delay: 20 });

    await page.click('input[data-aid="CONTACT_FORM_EMAIL"]');
    await page.type('input[data-aid="CONTACT_FORM_EMAIL"]', 'pamela.jameson@nortiheastprecision.com', { delay: 20 });

    await page.click('textarea[data-aid="CONTACT_FORM_MESSAGE"]');
    await page.type('textarea[data-aid="CONTACT_FORM_MESSAGE"]', 'Hello, Pamela Jameson reaching out from Northeast Precision Machinery. Expressing interest in your welding and custom metal fabrication services, and exploring potential collaboration on upcoming project quotes. Kindly contact us at your earliest convenience.', { delay: 10 });

    console.log('Inputs typed. Clicking submit button...');
    await page.click('button[data-aid="CONTACT_SUBMIT_BUTTON_REND"]');

    let confirmed = false;
    let confirmText = '';
    for (let i = 0; i < 8; i++) {
      await new Promise(r => setTimeout(r, 1500));
      const res = await page.evaluate(() => {
        const successEl = document.querySelector('[data-aid*="SUCCESS"], [data-aid*="CONFIRM"], [role="alert"], [class*="success"]');
        const txt = document.body ? document.body.innerText : '';
        const hasSuccess = /thank you|we have received|message has been sent|we will get back/i.test(txt);
        return {
          successElText: successEl ? successEl.innerText : null,
          hasSuccess,
          matchedSnippet: txt.match(/(thank you[^\n\.\!]*[\.\!]?|we will get back[^\n\.\!]*[\.\!]?)/i)?.[0] || null
        };
      });
      console.log(`Poll ${i}:`, JSON.stringify(res));
      if (res.hasSuccess || res.successElText) {
        confirmed = true;
        confirmText = res.successElText || res.matchedSnippet || 'Thank you';
        break;
      }
    }

    if (confirmed) {
      console.log(`✅ Lead #4592 SUBMISSION CONFIRMED: "${confirmText}"`);
      const note = `Contact form: https://twistedmetalswelding.com (Autofilled & verified: "${confirmText.replace(/\n+/g, ' ').trim()}")`;
      db.prepare('UPDATE leads SET status = ?, notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run('contacted', note, 4592);
      db.prepare('INSERT INTO contact_logs (lead_id, action, notes, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)').run(4592, 'sent', note);
    } else {
      console.log('❌ Submission not confirmed');
    }
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await browser.close();
  }
}

run();
