import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import db from './db.mjs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

const OUTREACH = {
  fullName: 'Pamela Jameson',
  email: 'pamela.jameson@nortiheastprecision.com',
  phone: '708-568-3708',
  message: 'Hello, I am reaching out to express our interest in your precision land surveying services and explore potential collaboration on upcoming commercial projects. Kindly arrange for a representative to contact us. Thank you.'
};

const updateStmt = db.prepare('UPDATE leads SET notes = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
const logStmt = db.prepare('INSERT INTO contact_logs (lead_id, action, notes, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)');
const getStmt = db.prepare('SELECT id, notes FROM leads WHERE id = ?');

function commitStatus(id, status, note) {
  const current = getStmt.get(id);
  const newNotes = current?.notes ? current.notes + ' | ' + note : note;
  db.transaction(() => {
    updateStmt.run(newNotes, status, id);
    const action = status === 'contacted' ? 'sent' : 'bounced';
    logStmt.run(id, action, note);
  })();
  console.log(`[DB COMMIT] Lead #${id} -> status: ${status}, note: ${note}`);
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  page.on('response', async res => {
    const url = res.url();
    if (url.includes('dmform') || url.includes('submit') || url.includes('jsp')) {
      console.log(`[Duda Response] ${res.status()} ${url}`);
      try {
        const text = await res.text();
        console.log(`[Duda Body] ${text.slice(0, 300)}`);
      } catch (e) {}
    }
  });

  try {
    console.log('Navigating to https://geoprecisionlandsurveying.com/ ...');
    await page.goto('https://geoprecisionlandsurveying.com/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));

    await page.type('[id="1399934500"]', OUTREACH.fullName, { delay: 20 });
    await page.type('[id="1026358529"]', OUTREACH.email, { delay: 20 });
    await page.type('[id="1611972745"]', OUTREACH.phone, { delay: 20 });
    await page.type('[id="1241869540"]', OUTREACH.message, { delay: 10 });

    console.log('Clicking submit button [id="1688203973"] ...');
    await page.click('[id="1688203973"]');

    let confirmed = false;
    for (let i = 0; i < 10; i++) {
      await new Promise(r => setTimeout(r, 1000));
      const res = await page.evaluate(() => {
        const respEl = document.querySelector('.dm-form-response, .dmResponse, [id*="response"], .dmformsubmit');
        const text = document.body.innerText;
        return {
          respHtml: respEl ? respEl.outerHTML : null,
          hasSuccess: /thank you|received|submitted|message has been sent|thanks for reaching out/i.test(text)
        };
      });
      console.log(`Sec ${i + 1}:`, res);
      if (res.hasSuccess || (res.respHtml && /thank|success/i.test(res.respHtml))) {
        commitStatus(912, 'contacted', 'Contact form: https://geoprecisionlandsurveying.com/ (Autofilled & verified: Thank you message received via Duda form)');
        confirmed = true;
        break;
      }
    }

    if (!confirmed) {
      console.log('912 not confirmed.');
    }
  } catch (e) {
    console.error('Error on 912:', e.message);
  } finally {
    await browser.close();
  }
})();
