import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';
import db from './db.mjs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const OUTREACH = {
  name: 'Pamela Jameson',
  firstName: 'Pamela',
  lastName: 'Jameson',
  email: 'pamela.jameson@nortiheastprecision.com',
  phone: '708-568-3708',
  company: 'Northeast Precision Machinery, Inc.',
  subject: 'Exploring Collaboration Opportunities',
  message: 'Hello,\n\nI am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship.\n\nThank you,\nPamela Jameson'
};

const leads = [
  { id: 215, company: 'GWA Construction Company', url: 'https://gwaconstruction.co' },
  { id: 216, company: 'SIZ Construction, Realty and Development Corp', url: 'https://sizcorp.net' },
  { id: 217, company: 'Gomez Construction Co', url: 'https://gomezconstruction.com' },
  { id: 218, company: 'BAM Construction, LLC', url: 'https://bamconstructionllc.com' },
  { id: 219, company: 'EZ Construction', url: 'https://ezconstructionfl.com' },
  { id: 220, company: 'CH Global Construction', url: 'https://chglobalconstruction.com' },
  { id: 221, company: 'Baba Contractor Inc', url: 'https://babacontractor.com' },
  { id: 222, company: 'DN Construction Company Inc.', url: 'https://dnconstructioninc.com' },
  { id: 223, company: 'FLORIDA DESIGN AND CONSTRUCTION', url: 'https://myfcs.net' },
  { id: 224, company: 'Miami Construction Forum', url: 'https://miamiconstructionforum.com' }
];

async function run() {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
  });

  const results = [];

  for (const l of leads) {
    const page = await browser.newPage();
    const startTime = Date.now();
    console.log(`\n========================================`);
    console.log(`[Batch 2] Checking Lead #${l.id}: ${l.company} (${l.url})`);

    try {
      let loaded = false;
      try {
        await page.goto(l.url, { waitUntil: 'domcontentloaded', timeout: 15000 });
        loaded = true;
      } catch (e) {
        if (l.url.startsWith('https://')) {
          try {
            await page.goto(l.url.replace('https://', 'http://'), { waitUntil: 'domcontentloaded', timeout: 12000 });
            loaded = true;
          } catch(err) {}
        }
      }

      if (!loaded) {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`Lead #${l.id}: Site Inaccessible (${elapsed}s)`);
        results.push({ id: l.id, company: l.company, status: 'unable_to_reach', note: 'Site inaccessible / connection timeout', time: elapsed });
        await page.close();
        continue;
      }

      // Check contact link
      const contactUrl = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a[href]'));
        const match = links.find(a => {
          const t = (a.innerText || '').toLowerCase();
          const h = (a.getAttribute('href') || '').toLowerCase();
          return (t.includes('contact') || h.includes('contact') || t.includes('quote') || h.includes('quote')) && !h.startsWith('mailto:') && !h.startsWith('tel:');
        });
        return match ? match.href : null;
      });

      if (contactUrl && contactUrl !== page.url()) {
        console.log(`Navigating to contact page: ${contactUrl}`);
        try {
          await page.goto(contactUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
        } catch(e) {}
      }

      const finalUrl = page.url();
      console.log(`Page URL: ${finalUrl}`);

      // Check captchas & inputs
      const formDetails = await page.evaluate(() => {
        const captchas = document.querySelectorAll('.g-recaptcha, iframe[src*="recaptcha"], iframe[src*="turnstile"], iframe[src*="hcaptcha"], [data-sitekey]');
        let captcha = null;
        if (captchas.length > 0) {
          const src = captchas[0].getAttribute('src') || '';
          if (src.includes('recaptcha')) captcha = 'Google reCAPTCHA';
          else if (src.includes('hcaptcha')) captcha = 'hCaptcha';
          else if (src.includes('turnstile')) captcha = 'Turnstile';
          else captcha = 'Captcha Challenge';
        }

        const inputs = Array.from(document.querySelectorAll('input:not([type=hidden]):not([type=submit]):not([type=button]):not([type=checkbox]):not([type=radio]), textarea, select'));
        return {
          captcha,
          inputsCount: inputs.length,
          inputs: inputs.map(i => ({ name: i.name, id: i.id, type: i.type, placeholder: i.placeholder }))
        };
      });

      console.log(`Form details:`, JSON.stringify(formDetails, null, 2));

      if (formDetails.captcha) {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`Lead #${l.id}: Blocked by ${formDetails.captcha}`);
        results.push({ id: l.id, company: l.company, status: 'unable_to_reach', note: `Contact form: ${finalUrl} (Blocked by ${formDetails.captcha})`, time: elapsed });
        await page.close();
        continue;
      }

      if (formDetails.inputsCount === 0) {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`Lead #${l.id}: No web form found`);
        results.push({ id: l.id, company: l.company, status: 'unable_to_reach', note: `Checked ${finalUrl}: No online web form found`, time: elapsed });
        await page.close();
        continue;
      }

      // Autofill
      await page.evaluate((p) => {
        const inputs = Array.from(document.querySelectorAll('input:not([type=hidden]), textarea, select'));
        for (const el of inputs) {
          const name = (el.name || '').toLowerCase();
          const id = (el.id || '').toLowerCase();
          const ph = (el.placeholder || '').toLowerCase();
          const type = (el.type || '').toLowerCase();
          const label = (el.closest('label')?.innerText || el.previousElementSibling?.innerText || '').toLowerCase();
          const combined = `${name} ${id} ${ph} ${label}`;

          if (el.tagName.toLowerCase() === 'textarea' || combined.includes('message') || combined.includes('comment') || combined.includes('detail') || combined.includes('inquiry')) {
            el.value = p.message;
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
          } else if (type === 'email' || combined.includes('email') || combined.includes('e-mail')) {
            el.value = p.email;
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
          } else if (type === 'tel' || combined.includes('phone') || combined.includes('cell') || combined.includes('tel') || combined.includes('mobile')) {
            el.value = p.phone;
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
          } else if (combined.includes('first') || combined.includes('fname')) {
            el.value = p.firstName;
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
          } else if (combined.includes('last') || combined.includes('lname')) {
            el.value = p.lastName;
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
          } else if (combined.includes('name') && !combined.includes('company')) {
            el.value = p.name;
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
          } else if (combined.includes('company') || combined.includes('business') || combined.includes('organization')) {
            el.value = p.company;
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
          } else if (combined.includes('subject') || combined.includes('topic')) {
            el.value = p.subject;
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }
      }, OUTREACH);

      // Submit
      console.log(`Submitting form for #${l.id}...`);
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 8000 }).catch(e => {}),
        page.evaluate(() => {
          const btn = document.querySelector('button[type="submit"], input[type="submit"], form button, .submit-btn');
          if (btn) btn.click();
          else {
            const form = document.querySelector('form');
            if (form) {
              if (typeof form.requestSubmit === 'function') form.requestSubmit();
              else form.submit();
            }
          }
        })
      ]);

      await new Promise(r => setTimeout(r, 4500));

      const verification = await page.evaluate(() => {
        const body = (document.body ? document.body.innerText : '').toLowerCase();
        const successSignals = [
          'thank you', 'thanks for contacting', 'thanks for reaching out',
          'message has been sent', 'we have received', 'will get back to you',
          'submitted successfully', 'sent successfully', 'in touch shortly',
          'inquiry received', 'successfully submitted'
        ];

        for (const s of successSignals) {
          if (body.includes(s)) return { confirmed: true, phrase: s };
        }

        const msgBoxes = document.querySelectorAll('.w-form-done, .wpcf7-response-output, .elementor-message-success, [role="alert"], .alert-success, .success-message, .form-submission-done');
        for (const b of msgBoxes) {
          const txt = (b.innerText || '').toLowerCase();
          if (txt.trim().length > 0) {
            return { confirmed: true, phrase: txt.trim() };
          }
        }

        return { confirmed: false, snippet: body.slice(0, 300) };
      });

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      if (verification.confirmed) {
        console.log(`Lead #${l.id}: CONFIRMED: "${verification.phrase}" (${elapsed}s)`);
        results.push({ id: l.id, company: l.company, status: 'contacted', note: `Contact form: ${finalUrl} (Autofilled & verified: "${verification.phrase}")`, time: elapsed });
      } else {
        console.log(`Lead #${l.id}: Unconfirmed submission (${elapsed}s)`);
        results.push({ id: l.id, company: l.company, status: 'unable_to_reach', note: `Contact form: ${finalUrl} (No explicit confirmation detected post-submission)`, time: elapsed });
      }

    } catch (err) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`Lead #${l.id} Error: ${err.message} (${elapsed}s)`);
      results.push({ id: l.id, company: l.company, status: 'unable_to_reach', note: `Error: ${err.message.split('\n')[0]}`, time: elapsed });
    } finally {
      try { await page.close(); } catch (e) {}
    }
  }

  try { await browser.close(); } catch (e) {}

  console.log('\n========================================');
  console.log('Results Summary:');
  console.table(results);

  // Commit to DB
  const updateLead = db.prepare('UPDATE leads SET status = ?, notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
  const insertLog = db.prepare('INSERT INTO contact_logs (lead_id, action, notes, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)');

  db.transaction(() => {
    for (const r of results) {
      updateLead.run(r.status, r.note, r.id);
      const action = r.status === 'contacted' ? 'sent' : 'bounced';
      insertLog.run(r.id, action, r.note);
    }
  })();

  console.log('Database updated successfully for Batch 2.');
}

run();
