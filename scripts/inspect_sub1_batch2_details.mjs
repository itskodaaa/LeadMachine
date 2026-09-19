import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import db from './db.mjs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

const OUTREACH = {
  first: 'Pamela',
  last: 'Jameson',
  fullName: 'Pamela Jameson',
  email: 'pamela.jameson@nortiheastprecision.com',
  phone: '708-568-3708',
  company: 'Northeast Precision Machinery, Inc.',
  message: 'Hello, I am reaching out to express our interest in your metal fabrication services and explore potential collaboration on upcoming commercial projects. Kindly arrange for a representative to contact us. Thank you.'
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

  const targets = [
    { id: 2206, name: 'M & R Metal Fabrication', url: 'https://customelevatorparts.com' },
    { id: 2204, name: "Antonio's Metal Works, Inc", url: 'https://antoniosmetalworks.com' },
    { id: 2210, name: 'Elite Custom Metal Fab', url: 'https://elitecustommetal.com' },
    { id: 2214, name: 'Custom Tube Works', url: 'https://customtubeworks.com' }
  ];

  for (const t of targets) {
    console.log(`\n========================================`);
    console.log(`Checking Lead #${t.id} ${t.name} (${t.url})...`);
    const page = await browser.newPage();
    try {
      await page.goto(t.url, { waitUntil: 'domcontentloaded', timeout: 25000 });
      await new Promise(r => setTimeout(r, 2500));
      console.log(`Current URL: ${page.url()}`);

      const info = await page.evaluate(() => {
        const forms = Array.from(document.querySelectorAll('form'));
        const contactLinks = Array.from(document.querySelectorAll('a')).map(a => ({ text: a.innerText.trim(), href: a.href }))
          .filter(l => /contact|quote|inquire|estimate/i.test(l.text) || /contact|quote|inquire|estimate/i.test(l.href));
        const captchas = document.querySelectorAll('.g-recaptcha, iframe[src*="recaptcha"], iframe[src*="hcaptcha"], iframe[src*="turnstile"], .cf-turnstile');
        
        return {
          formsCount: forms.length,
          contactLinks: contactLinks.slice(0, 5),
          captchaCount: captchas.length,
          forms: forms.map(f => ({
            action: f.action,
            inputs: Array.from(f.querySelectorAll('input, textarea, select, button')).map(i => ({
              tag: i.tagName,
              type: i.type,
              name: i.name,
              id: i.id,
              placeholder: i.placeholder,
              text: i.innerText
            }))
          }))
        };
      });

      console.log(`Lead #${t.id} Info:`, JSON.stringify(info, null, 2));

      // If no forms on homepage, navigate to first contact link if available
      let contactUrl = page.url();
      if (info.formsCount === 0 && info.contactLinks.length > 0) {
        contactUrl = info.contactLinks[0].href;
        console.log(`Navigating to contact link: ${contactUrl}`);
        await page.goto(contactUrl, { waitUntil: 'domcontentloaded', timeout: 25000 });
        await new Promise(r => setTimeout(r, 2500));
      }

      // Check forms on current page
      const currentForms = await page.evaluate(() => {
        const captchas = document.querySelectorAll('.g-recaptcha, iframe[src*="recaptcha"], iframe[src*="hcaptcha"], iframe[src*="turnstile"], .cf-turnstile');
        return {
          captcha: captchas.length > 0,
          inputs: Array.from(document.querySelectorAll('input:not([type="hidden"]), textarea, select')).map(i => ({
            tag: i.tagName,
            type: i.type,
            name: i.name,
            id: i.id,
            placeholder: i.placeholder
          }))
        };
      });

      console.log(`Lead #${t.id} Current forms info:`, currentForms);

    } catch (e) {
      console.error(`Error on Lead #${t.id}:`, e.message);
    } finally {
      await page.close();
    }
  }

  await browser.close();
})();
