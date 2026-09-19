import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import db from './db.mjs';
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
  message: 'Hello, I am reaching out to express our interest in your contracting services and explore potential collaboration on upcoming commercial projects. Kindly arrange for a representative to contact us. Thank you.'
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

const targets = [
  { id: 2603, name: 'Budget Construction', url: 'https://budgetconstructioncompany.com' },
  { id: 2604, name: 'Formed Space', url: 'https://formedspace.com' },
  { id: 2605, name: 'ETI Construction', url: 'https://eticonstruction.net' },
  { id: 2606, name: 'Gladstone Builders', url: 'https://gladstonebuildersinc.com' },
  { id: 2608, name: 'S Construction Co', url: 'https://sconstructionco.com' },
  { id: 2609, name: 'All Quality, Inc.', url: 'https://allqualityinc.com' },
  { id: 2610, name: 'Asset Builders', url: 'https://abcchicagoconstruction.com' }
];

async function run() {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: CHROME_BIN,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  for (const t of targets) {
    console.log(`\n=== Checking #${t.id} ${t.name} (${t.url}) ===`);
    const page = await browser.newPage();
    try {
      await page.goto(t.url, { waitUntil: 'domcontentloaded', timeout: 20000 });
      console.log('Final URL:', page.url(), '| Title:', await page.title());

      const contactLinks = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('a'))
          .filter(a => /contact|reach|quote|touch|estimate/i.test(a.innerText || a.href))
          .map(a => ({ text: a.innerText.trim(), href: a.href }));
      });
      console.log('Contact links:', JSON.stringify(contactLinks.slice(0, 3)));

      const forms = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('form')).map(f => ({
          action: f.action,
          inputs: Array.from(f.querySelectorAll('input:not([type="hidden"]), textarea, button')).map(i => ({
            name: i.name, id: i.id, type: i.type, placeholder: i.placeholder, text: i.innerText
          })),
          hasRecaptcha: !!f.querySelector('.g-recaptcha, iframe[src*="recaptcha"], iframe[src*="turnstile"]')
        }));
      });
      console.log('Forms on page:', JSON.stringify(forms, null, 2));

      // If contact links exist and forms = 0, check contact link
      if (forms.length === 0 && contactLinks.length > 0 && contactLinks[0].href !== page.url()) {
        console.log('Navigating to contact link:', contactLinks[0].href);
        await page.goto(contactLinks[0].href, { waitUntil: 'domcontentloaded', timeout: 20000 });
        const subForms = await page.evaluate(() => {
          return Array.from(document.querySelectorAll('form')).map(f => ({
            action: f.action,
            inputs: Array.from(f.querySelectorAll('input:not([type="hidden"]), textarea, button')).map(i => ({
              name: i.name, id: i.id, type: i.type, placeholder: i.placeholder, text: i.innerText
            })),
            hasRecaptcha: !!f.querySelector('.g-recaptcha, iframe[src*="recaptcha"], iframe[src*="turnstile"]')
          }));
        });
        console.log('Sub-page forms:', JSON.stringify(subForms, null, 2));
      }

    } catch (e) {
      console.log(`Error on #${t.id}:`, e.message);
    } finally {
      await page.close().catch(() => {});
    }
  }

  await browser.close();
}

run();
