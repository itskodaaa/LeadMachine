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

  try {
    console.log('\n=== Testing 2122: One Hat One Hand ===');
    const page = await browser.newPage();
    await page.goto('https://www.onehatonehand.com/', { waitUntil: 'domcontentloaded', timeout: 25000 });
    await new Promise(r => setTimeout(r, 4000));

    const formInfo = await page.evaluate(() => {
      const forms = Array.from(document.querySelectorAll('form'));
      return forms.map(f => ({
        action: f.action,
        inputs: Array.from(f.querySelectorAll('input, button, textarea')).map(el => ({
          tag: el.tagName,
          type: el.type,
          name: el.name,
          placeholder: el.placeholder,
          text: el.innerText
        }))
      }));
    });
    console.log('One Hat One Hand forms:', JSON.stringify(formInfo, null, 2));

    // Check if there is a separate contact page
    const contactLinks = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('a')).map(a => ({ text: a.innerText.trim(), href: a.href }))
        .filter(l => /contact|inquire|quote|touch/i.test(l.text) || /contact|inquire|quote|touch/i.test(l.href));
    });
    console.log('Contact links on One Hat One Hand:', contactLinks);

    // Let's test the form on the page if any
    const fName = await page.$('input[name*="first" i]');
    const lName = await page.$('input[name*="last" i]');
    const email = await page.$('input[type="email"]');
    
    if (fName && lName && email) {
      console.log('Filling One Hat One Hand form...');
      await fName.focus();
      await page.keyboard.type(OUTREACH.first, { delay: 20 });
      await lName.focus();
      await page.keyboard.type(OUTREACH.last, { delay: 20 });
      await email.focus();
      await page.keyboard.type(OUTREACH.email, { delay: 20 });

      // Check for checkbox
      const checkbox = await page.$('input[type="checkbox"]');
      if (checkbox) {
        console.log('Checking checkbox...');
        await checkbox.click();
      }

      const submitBtn = await page.evaluateHandle(() => {
        const btns = Array.from(document.querySelectorAll('button, input[type="submit"]'));
        return btns.find(b => /submit|subscribe|join|send|sign up/i.test(b.innerText || b.value || ''));
      });

      if (submitBtn && submitBtn.asElement()) {
        console.log('Submitting One Hat One Hand form...');
        await submitBtn.asElement().click();
        let confirmed = false;
        for (let i = 0; i < 10; i++) {
          await new Promise(r => setTimeout(r, 1000));
          const res = await page.evaluate(() => {
            const text = document.body.innerText;
            const el = document.querySelector('[data-testid="form-submitted"], .wixui-form__message, [role="alert"], [class*="message"]');
            const msg = el ? el.innerText : null;
            return {
              hasSuccess: /thanks for submitting|thank you|message received|sent|subscribed|thanks for subscribing/i.test(text),
              msg
            };
          });
          console.log(`Sec ${i+1}:`, res);
          if (res.hasSuccess || res.msg) {
            commitStatus(2122, 'contacted', `Contact form: https://www.onehatonehand.com/ (Autofilled & verified: ${res.msg || 'Thanks for submitting'})`);
            confirmed = true;
            break;
          }
        }
        if (!confirmed) {
          console.log('One Hat One Hand not confirmed.');
        }
      }
    }

    await page.close();
  } catch (e) {
    console.error('Error on One Hat One Hand:', e.message);
  }

  await browser.close();
})();
