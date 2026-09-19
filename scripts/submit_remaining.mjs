import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import db from './db.mjs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

const OUTREACH = {
  fullName: 'Pamela Jameson',
  firstName: 'Pamela',
  lastName: 'Jameson',
  email: 'pamela.jameson@nortiheastprecision.com',
  phone: '708-568-3708',
  company: 'Northeast Precision Machinery, Inc.',
  subject: 'Exploring Collaboration Opportunities',
  message: `Hello,

I am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects.

We look forward to your response and the possibility of working together.

Thank you for your time and attention.

Sincerely,
Pamela Jameson`
};

const SUCCESS_SIGNALS = [
  'thank you',
  'thanks for contacting',
  'thanks for reaching out',
  'message has been sent',
  'we have received your',
  'we will contact you',
  'will get back to you',
  'submission was successful',
  'submitted successfully',
  'in touch shortly',
  'inquiry received',
  'form received',
  'successfully submitted',
  'your message was sent',
  'we will be in touch',
  'sent successfully',
  'request received',
  'quote requested',
  'your submission was received',
  'thank you for submitting',
  'thank you for your inquiry'
];

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

async function runPena(browser) {
  console.log('\n--- Submitting #4820 Peña Architecture ---');
  const page = await browser.newPage();
  try {
    await page.goto('https://paecorporation.com/contact-us', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForSelector('input[data-aid="CONTACT_FORM_NAME"]', { timeout: 15000 });
    
    await page.type('input[data-aid="CONTACT_FORM_NAME"]', OUTREACH.fullName, { delay: 20 });
    await page.type('input[data-aid="CONTACT_FORM_EMAIL"]', OUTREACH.email, { delay: 20 });
    await page.type('input[data-aid="CONTACT_FORM_PHONE"]', OUTREACH.phone, { delay: 20 });
    
    const textarea = await page.$('textarea[data-ux="InputTextArea"]');
    if (textarea) {
      await textarea.type(OUTREACH.message, { delay: 10 });
    }
    
    console.log('Filled Peña form');
    const submitBtn = await page.$('button[data-aid="CONTACT_SUBMIT_BUTTON_REND"], form[data-ux="Form"] button[type="submit"]');
    if (submitBtn) {
      await submitBtn.click();
      console.log('Clicked submit on Peña');
      await new Promise(r => setTimeout(r, 6000));
      
      const res = await page.evaluate((signals) => {
        const text = document.body.innerText.toLowerCase();
        const found = signals.find(s => text.includes(s));
        const el = document.querySelector('[data-aid="CONTACT_FORM_SUCCESS"], [data-ux="Alert"]');
        return { found, alertText: el ? el.innerText : null };
      }, SUCCESS_SIGNALS);
      
      console.log('Peña result:', res);
      if (res.found || res.alertText) {
        const note = `Submitted via GoDaddy contact form: https://paecorporation.com/contact-us (${res.found || res.alertText})`;
        saveLeadResult(4820, 'contacted', note);
      }
    }
  } catch (e) {
    console.error('Peña error:', e.message);
  } finally {
    await page.close();
  }
}

async function runFandJ(browser) {
  console.log('\n--- Submitting #4822 F&J Engineering ---');
  const page = await browser.newPage();
  try {
    await page.goto('https://fj-group.com/contact', { waitUntil: 'networkidle2', timeout: 45000 });
    await page.waitForSelector('#name-yui_3_17_2_1_1522452027128_8431-fname-field', { timeout: 15000 });
    
    await page.type('#name-yui_3_17_2_1_1522452027128_8431-fname-field', OUTREACH.firstName, { delay: 20 });
    await page.type('#name-yui_3_17_2_1_1522452027128_8431-lname-field', OUTREACH.lastName, { delay: 20 });
    await page.type('#email-yui_3_17_2_1_1522452027128_8432-field', OUTREACH.email, { delay: 20 });
    await page.type('#text-yui_3_17_2_1_1522452027128_8433-field', OUTREACH.subject, { delay: 20 });
    await page.type('#textarea-yui_3_17_2_1_1522452027128_8434-field', OUTREACH.message, { delay: 10 });
    
    console.log('Filled F&J fields');
    const submitBtn = await page.$('form button[type="submit"]');
    if (submitBtn) {
      await submitBtn.click();
      console.log('Clicked submit on F&J');
      await new Promise(r => setTimeout(r, 6000));
      
      const res = await page.evaluate((signals) => {
        const text = document.body.innerText.toLowerCase();
        const found = signals.find(s => text.includes(s));
        const successEl = document.querySelector('.form-submission-text, .form-submission-html');
        return { found, successText: successEl ? successEl.innerText : null };
      }, SUCCESS_SIGNALS);
      
      console.log('F&J result:', res);
      if (res.found || res.successText) {
        const note = `Submitted via Squarespace contact form: https://fj-group.com/contact (${res.found || res.successText})`;
        saveLeadResult(4822, 'contacted', note);
      }
    }
  } catch (e) {
    console.error('F&J error:', e.message);
  } finally {
    await page.close();
  }
}

async function runKline(browser) {
  console.log('\n--- Submitting #4823 Kline Engineering ---');
  const page = await browser.newPage();
  try {
    await page.goto('https://www.klineengineered.com/contact', { waitUntil: 'networkidle2', timeout: 45000 });
    
    // Look for lightbox contact button
    const contactBtn = await page.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll('button.lightbox-handle'));
      return btns.find(b => b.innerText.trim().toLowerCase() === 'contact');
    });
    
    if (contactBtn && contactBtn.asElement()) {
      console.log('Clicking lightbox button on Kline');
      await contactBtn.asElement().click();
      await new Promise(r => setTimeout(r, 3000));
      
      // Inspect modal fields
      const modalFields = await page.evaluate(() => {
        const inputs = Array.from(document.querySelectorAll('.form-wrapper input, .form-wrapper textarea, .sqs-modal-lightbox input, .sqs-modal-lightbox textarea'));
        return inputs.map(i => ({ id: i.id, name: i.name, type: i.type, placeholder: i.placeholder, aria: i.getAttribute('aria-label') }));
      });
      console.log('Kline modal fields:', modalFields);
      
      // Fill modal fields
      await page.evaluate((profile) => {
        const inputs = Array.from(document.querySelectorAll('.form-wrapper input, .form-wrapper textarea, .sqs-modal-lightbox input, .sqs-modal-lightbox textarea'));
        let fName = false, lName = false, email = false, phone = false, msg = false, subject = false;
        for (const inp of inputs) {
          const id = (inp.id || '').toLowerCase();
          const name = (inp.name || '').toLowerCase();
          const ph = (inp.placeholder || '').toLowerCase();
          const aria = (inp.getAttribute('aria-label') || '').toLowerCase();
          const type = (inp.type || '').toLowerCase();
          if (type === 'hidden' || type === 'submit') continue;
          
          if ((name.includes('fname') || ph.includes('first') || aria.includes('first') || id.includes('fname')) && !fName) {
            inp.value = profile.firstName;
            inp.dispatchEvent(new Event('input', { bubbles: true }));
            inp.dispatchEvent(new Event('change', { bubbles: true }));
            fName = true;
          } else if ((name.includes('lname') || ph.includes('last') || aria.includes('last') || id.includes('lname')) && !lName) {
            inp.value = profile.lastName;
            inp.dispatchEvent(new Event('input', { bubbles: true }));
            inp.dispatchEvent(new Event('change', { bubbles: true }));
            lName = true;
          } else if ((type === 'email' || name.includes('email') || ph.includes('email') || aria.includes('email') || id.includes('email')) && !email) {
            inp.value = profile.email;
            inp.dispatchEvent(new Event('input', { bubbles: true }));
            inp.dispatchEvent(new Event('change', { bubbles: true }));
            email = true;
          } else if ((type === 'tel' || name.includes('phone') || ph.includes('phone') || aria.includes('phone') || id.includes('phone')) && !phone) {
            inp.value = profile.phone;
            inp.dispatchEvent(new Event('input', { bubbles: true }));
            inp.dispatchEvent(new Event('change', { bubbles: true }));
            phone = true;
          } else if ((name.includes('subject') || ph.includes('subject') || aria.includes('subject') || id.includes('subject')) && !subject) {
            inp.value = profile.subject;
            inp.dispatchEvent(new Event('input', { bubbles: true }));
            inp.dispatchEvent(new Event('change', { bubbles: true }));
            subject = true;
          } else if ((inp.tagName.toLowerCase() === 'textarea' || name.includes('message') || ph.includes('message') || aria.includes('message') || id.includes('textarea') || id.includes('message')) && !msg) {
            inp.value = profile.message;
            inp.dispatchEvent(new Event('input', { bubbles: true }));
            inp.dispatchEvent(new Event('change', { bubbles: true }));
            msg = true;
          }
        }
      }, OUTREACH);
      
      console.log('Filled Kline modal');
      const submitBtn = await page.$('.form-wrapper button[type="submit"], .sqs-modal-lightbox button[type="submit"]');
      if (submitBtn) {
        await submitBtn.click();
        console.log('Clicked submit on Kline modal');
        await new Promise(r => setTimeout(r, 6000));
        
        const res = await page.evaluate((signals) => {
          const text = document.body.innerText.toLowerCase();
          const found = signals.find(s => text.includes(s));
          const el = document.querySelector('.form-submission-text, .form-submission-html');
          return { found, sqsText: el ? el.innerText : null };
        }, SUCCESS_SIGNALS);
        
        console.log('Kline result:', res);
        if (res.found || res.sqsText) {
          const note = `Submitted via Squarespace lightbox form: https://www.klineengineered.com/contact (${res.found || res.sqsText})`;
          saveLeadResult(4823, 'contacted', note);
        }
      }
    }
  } catch (e) {
    console.error('Kline error:', e.message);
  } finally {
    await page.close();
  }
}

async function main() {
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: CHROME_BIN,
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    await runPena(browser);
    await runFandJ(browser);
    await runKline(browser);
  } finally {
    await browser.close();
  }
}

main();
