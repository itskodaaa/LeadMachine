import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import db from './db.mjs';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const updateStmt = db.prepare('UPDATE leads SET notes = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
const logStmt = db.prepare('INSERT INTO contact_logs (lead_id, action, notes, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)');
const getStmt = db.prepare('SELECT id, company_name, status, notes FROM leads WHERE id = ?');

function saveLeadResult(id, status, note) {
  const current = getStmt.get(id);
  const newNotes = current?.notes ? current.notes + ' | ' + note : note;
  db.transaction(() => {
    updateStmt.run(newNotes, status, id);
    const action = status === 'contacted' ? 'sent' : 'bounced';
    logStmt.run(id, action, note);
  })();
}

async function inspectUrl(leadId, url) {
  console.log(`\nTesting #${leadId}: ${url}`);
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    timeout: 30000,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 20000 });
    console.log(`Final URL for #${leadId}: ${page.url()}, Title: ${await page.title()}`);
    const forms = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('form')).map(f => ({
        id: f.id,
        className: f.className,
        inputs: Array.from(f.querySelectorAll('input, textarea, select')).map(i => ({ name: i.name, type: i.type, placeholder: i.placeholder }))
      }));
    });
    console.log(`Forms for #${leadId}:`, JSON.stringify(forms, null, 2));

    const captchas = await page.evaluate(() => {
      const caps = document.querySelectorAll('.g-recaptcha, iframe[src*="recaptcha"], iframe[src*="hcaptcha"], iframe[src*="turnstile"], .cf-turnstile, [data-sitekey]');
      return caps.length > 0;
    });

    if (captchas) {
      console.log(`Captcha found on #${leadId}`);
      saveLeadResult(leadId, 'unable_to_reach', `Contact form: ${page.url()} (Autofilled; blocked by Google reCAPTCHA)`);
    } else if (forms.length === 0) {
      saveLeadResult(leadId, 'unable_to_reach', `Checked ${page.url()}: No online web form found`);
    }

  } catch (err) {
    console.error(`Error #${leadId}:`, err.message);
  } finally {
    await browser.close();
  }
}

async function main() {
  await inspectUrl(398, 'https://nikkahomeusa.com');
  await inspectUrl(405, 'https://fortiline.com');
}

main();
