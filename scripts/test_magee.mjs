import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import db from './db.mjs';

puppeteer.use(StealthPlugin());
const CHROME_BIN = '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

const profile = {
  fullName: 'Pamela Jameson',
  email: 'pamela.jameson@nortiheastprecision.com',
  phone: '708-568-3708',
  subject: 'Exploring Collaboration Opportunities',
  message: 'Hello, I am reaching out to express interest in your machining services and would appreciate discussing potential collaboration and upcoming project quotes. Please have a representative contact us at your earliest convenience.'
};

async function run() {
  const browser = await puppeteer.launch({ executablePath: CHROME_BIN, headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto('https://www.mageemachine.com/', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 2000));

  await page.type('#input_comp-kf4o71qz', profile.fullName);
  await page.type('#input_comp-kf4o71rc', profile.email);
  await page.type('#input_comp-kf4o71rh', profile.phone);
  await page.type('#input_comp-kf4o71ro', profile.subject);
  await page.type('#textarea_comp-kf4o71ru', profile.message);

  console.log('Filled fields.');
  await page.click('#comp-kf4o71sd button');
  console.log('Clicked Send button.');

  let success = false;
  for (let i = 0; i < 12; i++) {
    await new Promise(r => setTimeout(r, 1000));
    const status = await page.evaluate(() => {
      const el = document.querySelector('#comp-kf4o71sp');
      if (!el) return null;
      const style = window.getComputedStyle(el);
      return {
        text: el.innerText,
        visibility: style.visibility,
        display: style.display,
        opacity: style.opacity,
        className: el.className
      };
    });
    console.log(`Second ${i+1}:`, status);
    if (status && status.text.includes('Success') && status.visibility !== 'hidden' && status.opacity !== '0') {
      console.log('CONFIRMED SUCCESSFUL SUBMISSION ON MAGEE!');
      success = true;
      break;
    }
  }

  if (success) {
    const updateStmt = db.prepare('UPDATE leads SET notes = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
    const logStmt = db.prepare('INSERT INTO contact_logs (lead_id, action, notes, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)');
    const current = db.prepare('SELECT notes FROM leads WHERE id = 3422').get();
    const note = 'Contact form submitted successfully on https://www.mageemachine.com/. Confirmation: "Success! Message received."';
    const newNotes = current.notes + ' | ' + note;
    db.transaction(() => {
      updateStmt.run(newNotes, 'contacted', 3422);
      logStmt.run(3422, 'sent', note);
    })();
    console.log('Updated 3422 in DB to contacted!');
  }

  await browser.close();
}
run();
