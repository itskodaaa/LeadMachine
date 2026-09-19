import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';
import db from './db.mjs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const OUTREACH_PROFILE = {
  fullName: 'Pamela Jameson',
  email: 'pamela.jameson@nortiheastprecision.com',
  phone: '708-568-3708',
  message: `Hello, I am reaching out to express interest in your machining services and would appreciate the opportunity to explore a potential business relationship. Please contact us at your earliest convenience.`
};

const updateStmt = db.prepare('UPDATE leads SET notes = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
const logStmt = db.prepare('INSERT INTO contact_logs (lead_id, action, notes, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)');

function saveLeadResult(id, status, note) {
  db.transaction(() => {
    updateStmt.run(note, status, id);
    const action = status === 'contacted' ? 'sent' : 'bounced';
    logStmt.run(id, action, note);
  })();
}

async function retry411() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,800']
  });

  console.log('\n--- Retrying #411: J P Machine Manufacturing ---');
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto('https://jpmachinemfg.com/contact-us/', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await new Promise(r => setTimeout(r, 3000));

    const in4 = await page.$('#input4');
    if (in4) { await in4.click(); await in4.type(OUTREACH_PROFILE.fullName, { delay: 30 }); }

    const in5 = await page.$('#input5');
    if (in5) { await in5.click(); await in5.type(OUTREACH_PROFILE.email, { delay: 30 }); }

    const in6 = await page.$('#input6');
    if (in6) { await in6.click(); await in6.type(OUTREACH_PROFILE.phone, { delay: 30 }); }

    const txt = await page.$('textarea');
    if (txt) { await txt.click(); await txt.type(OUTREACH_PROFILE.message, { delay: 10 }); }

    await new Promise(r => setTimeout(r, 1000));

    const submitBtn = await page.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll('button, input[type="submit"]'));
      return btns.find(b => (b.innerText || b.value || '').toLowerCase().includes('send'));
    });

    if (submitBtn) {
      await page.evaluate(b => b.click(), submitBtn);
    }

    await new Promise(r => setTimeout(r, 6000));

    const verify = await page.evaluate(() => {
      const body = document.body ? document.body.innerText.toLowerCase() : '';
      return { bodySnippet: body.substring(0, 400) };
    });

    console.log('#411 Result:', verify.bodySnippet);
    if (verify.bodySnippet.includes('thank you') || verify.bodySnippet.includes('message has been sent') || verify.bodySnippet.includes('we will be in touch')) {
      console.log('SUCCESS for #411!');
      saveLeadResult(411, 'contacted', `Contact form: https://jpmachinemfg.com/contact-us/ (Verified: Thank you)`);
    } else {
      saveLeadResult(411, 'unable_to_reach', `Contact form: https://jpmachinemfg.com/contact-us/ (Protected by invisible reCAPTCHA / Unconfirmed)`);
    }

    await page.close();
  } catch (e) {
    console.log('#411 Error:', e.message);
  }

  await browser.close();
}

retry411();
