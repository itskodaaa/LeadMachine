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
  title: 'Procurement Specialist',
  address: '100 Main St',
  city: 'Chicago',
  state: 'IL',
  zip: '60601',
  subject: 'Inquiry: Engineering Collaboration & Project Quotes',
  message: 'Hello,\n\nI am reaching out on behalf of Northeast Precision Machinery, Inc. to express our interest in your professional services. We would appreciate the opportunity to explore a potential collaboration. Kindly arrange for a representative to contact us to discuss details and upcoming project quotes.\n\nThank you,\nPamela Jameson'
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

async function testVerticalEngineering(browser) {
  // Lead 4818: Vertical Engineering Consulting & Construction
  // URL: https://www.verticalengineeringcc.com/request-a-quote
  console.log('\n--- Testing #4818 Vertical Engineering ---');
  const page = await browser.newPage();
  try {
    await page.goto('https://www.verticalengineeringcc.com/request-a-quote', { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Find inputs
    // dmform-0 (name), dmform-1 (email), dmform-2 (phone), dmform-3 (message)
    await page.waitForSelector('input[name="dmform-0"]', { timeout: 10000 });
    await page.type('input[name="dmform-0"]', OUTREACH.fullName, { delay: 30 });
    await page.type('input[name="dmform-1"]', OUTREACH.email, { delay: 30 });
    await page.type('input[name="dmform-2"]', OUTREACH.phone, { delay: 30 });
    await page.type('textarea[name="dmform-3"]', OUTREACH.message, { delay: 10 });
    
    console.log('Filled form fields on Vertical Engineering');
    
    // Check submit button
    const submitBtn = await page.$('input[type="submit"], button[type="submit"]');
    if (!submitBtn) {
      console.log('No submit button found');
      return;
    }
    
    await submitBtn.click();
    console.log('Clicked submit on Vertical Engineering');
    await new Promise(r => setTimeout(r, 6000));
    
    const pageText = await page.evaluate(() => document.body.innerText.toLowerCase());
    const confirmationMatch = SUCCESS_SIGNALS.find(s => pageText.includes(s));
    
    console.log('Post-submit check. Confirmation match:', confirmationMatch);
    // Also check for duda specific confirmation
    const dudaSuccess = await page.evaluate(() => {
      const el = document.querySelector('.dmform-success, .alert-success, .success, [data-aid*="success"]');
      return el ? el.innerText : null;
    });
    console.log('Duda success element:', dudaSuccess);
    
    if (confirmationMatch || dudaSuccess) {
      const msg = `Submitted via Duda quote form: https://www.verticalengineeringcc.com/request-a-quote (${confirmationMatch || dudaSuccess})`;
      console.log('SUCCESS #4818:', msg);
      saveLeadResult(4818, 'contacted', msg);
    } else {
      console.log('No confirmation found. Page snippet:', pageText.slice(0, 300));
    }
  } catch (e) {
    console.error('Error on #4818:', e.message);
  } finally {
    await page.close();
  }
}

async function testPenaArchitecture(browser) {
  // Lead 4820: Peña Architecture and Engineering Corp.
  // URL: https://paecorporation.com/contact-us
  console.log('\n--- Testing #4820 Peña Architecture ---');
  const page = await browser.newPage();
  try {
    await page.goto('https://paecorporation.com/contact-us', { waitUntil: 'networkidle2', timeout: 30000 });
    
    await page.waitForSelector('input[data-aid="CONTACT_FORM_NAME"]', { timeout: 10000 });
    await page.type('input[data-aid="CONTACT_FORM_NAME"]', OUTREACH.fullName, { delay: 30 });
    await page.type('input[data-aid="CONTACT_FORM_EMAIL"]', OUTREACH.email, { delay: 30 });
    await page.type('input[data-aid="CONTACT_FORM_PHONE"]', OUTREACH.phone, { delay: 30 });
    
    const textarea = await page.$('textarea[data-ux="InputTextArea"]');
    if (textarea) {
      await textarea.type(OUTREACH.message, { delay: 10 });
    }
    
    console.log('Filled form fields on Peña Architecture');
    
    const submitBtn = await page.$('button[data-aid="CONTACT_SUBMIT_BUTTON_REND"], form[data-ux="Form"] button[type="submit"]');
    if (submitBtn) {
      await submitBtn.click();
      console.log('Clicked submit on Peña Architecture');
      await new Promise(r => setTimeout(r, 6000));
      
      const pageText = await page.evaluate(() => document.body.innerText.toLowerCase());
      const confirmationMatch = SUCCESS_SIGNALS.find(s => pageText.includes(s));
      
      const godaddySuccess = await page.evaluate(() => {
        const el = document.querySelector('[data-aid="CONTACT_FORM_SUCCESS"], [data-ux="Alert"]');
        return el ? el.innerText : null;
      });
      console.log('GoDaddy success element:', godaddySuccess);
      console.log('Confirmation match:', confirmationMatch);
      
      if (confirmationMatch || godaddySuccess) {
        const msg = `Submitted via GoDaddy contact form: https://paecorporation.com/contact-us (${confirmationMatch || godaddySuccess})`;
        console.log('SUCCESS #4820:', msg);
        saveLeadResult(4820, 'contacted', msg);
      }
    }
  } catch (e) {
    console.error('Error on #4820:', e.message);
  } finally {
    await page.close();
  }
}

async function testLeiterPerez(browser) {
  // Lead 4824: Leiter, Perez & Associates Inc
  // URL: https://leiterperez.com/quote.html
  console.log('\n--- Testing #4824 Leiter Perez ---');
  const page = await browser.newPage();
  try {
    await page.goto('https://leiterperez.com/quote.html', { waitUntil: 'networkidle2', timeout: 30000 });
    
    await page.waitForSelector('input[name="realname"]', { timeout: 10000 });
    await page.type('input[name="realname"]', OUTREACH.fullName, { delay: 30 });
    await page.type('input[name="email"]', OUTREACH.email, { delay: 30 });
    await page.type('input[name="Title"]', OUTREACH.title, { delay: 30 });
    await page.type('input[name="Organization"]', OUTREACH.company, { delay: 30 });
    await page.type('input[name="Billing_Address"]', OUTREACH.address, { delay: 30 });
    await page.type('input[name="City"]', OUTREACH.city, { delay: 30 });
    await page.type('input[name="State"]', OUTREACH.state, { delay: 30 });
    await page.type('input[name="Zip_Code"]', OUTREACH.zip, { delay: 30 });
    await page.type('input[name="Phone"]', OUTREACH.phone, { delay: 30 });
    
    const commentsField = await page.$('textarea[name="comments"], textarea');
    if (commentsField) {
      await commentsField.type(OUTREACH.message, { delay: 10 });
    }
    
    console.log('Filled form fields on Leiter Perez');
    
    const submitBtn = await page.$('input[type="submit"], button[type="submit"]');
    if (submitBtn) {
      await Promise.all([
        page.waitForNavigation({ timeout: 15000 }).catch(e => console.log('Navigation wait timeout/no nav')),
        submitBtn.click()
      ]);
      console.log('Clicked submit on Leiter Perez, new URL:', page.url());
      await new Promise(r => setTimeout(r, 4000));
      
      const pageText = await page.evaluate(() => document.body.innerText.toLowerCase());
      const confirmationMatch = SUCCESS_SIGNALS.find(s => pageText.includes(s));
      console.log('Leiter Perez post-submit text:', pageText.slice(0, 300));
      console.log('Confirmation match:', confirmationMatch);
      
      if (confirmationMatch || page.url().includes('thank') || page.url().includes('formmail') || pageText.includes('thank you')) {
        const msg = `Submitted via FormMail quote request: https://leiterperez.com/quote.html (${confirmationMatch || 'Form submitted'})`;
        console.log('SUCCESS #4824:', msg);
        saveLeadResult(4824, 'contacted', msg);
      }
    }
  } catch (e) {
    console.error('Error on #4824:', e.message);
  } finally {
    await page.close();
  }
}

async function testSyncore360(browser) {
  // Lead 4826: 360 Electrical & Engineering Services (syncore-group.com)
  // URL: https://syncore-group.com/contact/ or https://syncore-group.com/
  console.log('\n--- Testing #4826 360 Electrical / Syncore Group ---');
  const page = await browser.newPage();
  try {
    await page.goto('https://syncore-group.com/contact/', { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Check for form fields
    const nameInput = await page.$('#form-field-name, input[name="form_fields[name]"]');
    if (nameInput) {
      await nameInput.type(OUTREACH.fullName, { delay: 30 });
      await page.type('#form-field-email, input[name="form_fields[email]"]', OUTREACH.email, { delay: 30 });
      
      const phoneInput = await page.$('input[name*="[field_5e81ace]"], input[type="tel"], input[type="number"], input[id*="field_5e81ace"]');
      if (phoneInput) {
        await phoneInput.type('7085683708', { delay: 30 });
      }
      
      const companyInput = await page.$('input[name*="[field_51dba60]"], input[id*="field_51dba60"]');
      if (companyInput) {
        await companyInput.type(OUTREACH.company, { delay: 30 });
      }
      
      // Select element if exists
      const selectElem = await page.$('select[name="form_fields[field_8858be0]"], select');
      if (selectElem) {
        // select second option
        await page.evaluate(sel => {
          if (sel.options.length > 1) {
            sel.selectedIndex = 1;
            sel.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }, selectElem);
      }
      
      const msgInput = await page.$('textarea[name="form_fields[message]"], textarea');
      if (msgInput) {
        await msgInput.type(OUTREACH.message, { delay: 10 });
      }
      
      console.log('Filled form fields on Syncore Group');
      
      const submitBtn = await page.$('button[type="submit"], .elementor-button[type="submit"]');
      if (submitBtn) {
        await submitBtn.click();
        console.log('Clicked submit on Syncore Group');
        await new Promise(r => setTimeout(r, 6000));
        
        const pageText = await page.evaluate(() => document.body.innerText.toLowerCase());
        const confirmationMatch = SUCCESS_SIGNALS.find(s => pageText.includes(s));
        
        const elementorSuccess = await page.evaluate(() => {
          const el = document.querySelector('.elementor-message-success, .elementor-message');
          return el ? el.innerText : null;
        });
        console.log('Elementor success message:', elementorSuccess);
        console.log('Confirmation match:', confirmationMatch);
        
        if (confirmationMatch || elementorSuccess) {
          const msg = `Submitted via Elementor contact form: https://syncore-group.com/contact/ (${confirmationMatch || elementorSuccess})`;
          console.log('SUCCESS #4826:', msg);
          saveLeadResult(4826, 'contacted', msg);
        }
      }
    }
  } catch (e) {
    console.error('Error on #4826:', e.message);
  } finally {
    await page.close();
  }
}

async function testSquarespaceLeads(browser) {
  // Lead 4822: F&J Engineering Group, Inc. (fj-group.com)
  // Lead 4823: Kline Engineering & Consulting (klineengineered.com)
  for (const lead of [
    { id: 4822, name: 'F&J Engineering Group', url: 'https://fj-group.com/contact' },
    { id: 4823, name: 'Kline Engineering', url: 'https://www.klineengineered.com/contact' }
  ]) {
    console.log(`\n--- Testing #${lead.id} ${lead.name} ---`);
    const page = await browser.newPage();
    try {
      await page.goto(lead.url, { waitUntil: 'networkidle2', timeout: 30000 });
      // wait for squarespace form to render
      await page.waitForSelector('form.form-submission, form[data-form-id], .sqs-block-form form, form', { timeout: 15000 }).catch(() => null);
      
      // Let's see what form inputs exist
      const formInfo = await page.evaluate(() => {
        const form = document.querySelector('form');
        if (!form) return null;
        return {
          id: form.id,
          action: form.action,
          inputs: Array.from(form.querySelectorAll('input, textarea, button')).map(i => ({
            tag: i.tagName.toLowerCase(),
            type: i.type,
            name: i.name,
            placeholder: i.placeholder,
            ariaLabel: i.getAttribute('aria-label')
          }))
        };
      });
      console.log(`Form on #${lead.id}:`, JSON.stringify(formInfo, null, 2));

      if (formInfo && formInfo.inputs.length > 0) {
        // fill inputs
        const filled = await page.evaluate((profile) => {
          const inputs = Array.from(document.querySelectorAll('form input, form textarea'));
          let fName = false, lName = false, email = false, phone = false, msg = false;
          for (const inp of inputs) {
            const name = (inp.name || '').toLowerCase();
            const placeholder = (inp.placeholder || '').toLowerCase();
            const aria = (inp.getAttribute('aria-label') || '').toLowerCase();
            const type = (inp.type || '').toLowerCase();

            if (type === 'hidden' || type === 'submit') continue;

            if ((name.includes('fname') || placeholder.includes('first') || aria.includes('first')) && !fName) {
              inp.value = profile.firstName;
              inp.dispatchEvent(new Event('input', { bubbles: true }));
              inp.dispatchEvent(new Event('change', { bubbles: true }));
              fName = true;
            } else if ((name.includes('lname') || placeholder.includes('last') || aria.includes('last')) && !lName) {
              inp.value = profile.lastName;
              inp.dispatchEvent(new Event('input', { bubbles: true }));
              inp.dispatchEvent(new Event('change', { bubbles: true }));
              lName = true;
            } else if ((type === 'email' || name.includes('email') || placeholder.includes('email') || aria.includes('email')) && !email) {
              inp.value = profile.email;
              inp.dispatchEvent(new Event('input', { bubbles: true }));
              inp.dispatchEvent(new Event('change', { bubbles: true }));
              email = true;
            } else if ((type === 'tel' || name.includes('phone') || placeholder.includes('phone') || aria.includes('phone')) && !phone) {
              inp.value = profile.phone;
              inp.dispatchEvent(new Event('input', { bubbles: true }));
              inp.dispatchEvent(new Event('change', { bubbles: true }));
              phone = true;
            } else if ((inp.tagName.toLowerCase() === 'textarea' || name.includes('message') || placeholder.includes('message') || aria.includes('message')) && !msg) {
              inp.value = profile.message;
              inp.dispatchEvent(new Event('input', { bubbles: true }));
              inp.dispatchEvent(new Event('change', { bubbles: true }));
              msg = true;
            } else if (!fName && (name.includes('name') || placeholder.includes('name') || aria.includes('name'))) {
              inp.value = profile.fullName;
              inp.dispatchEvent(new Event('input', { bubbles: true }));
              inp.dispatchEvent(new Event('change', { bubbles: true }));
              fName = true;
            }
          }
          return { fName, lName, email, phone, msg };
        }, OUTREACH);
        console.log(`Filled status on #${lead.id}:`, filled);

        // Click submit
        const submitBtn = await page.$('form button[type="submit"], form input[type="submit"], form .button[type="submit"], form .sqs-html-button');
        if (submitBtn) {
          await submitBtn.click();
          console.log(`Clicked submit on #${lead.id}`);
          await new Promise(r => setTimeout(r, 6000));

          const pageText = await page.evaluate(() => document.body.innerText.toLowerCase());
          const confirmationMatch = SUCCESS_SIGNALS.find(s => pageText.includes(s));
          const sqsSuccess = await page.evaluate(() => {
            const el = document.querySelector('.form-submission-text, .form-submission-html, .sqs-form-block-submission-html');
            return el ? el.innerText : null;
          });
          console.log(`Squarespace post-submit text on #${lead.id}:`, confirmationMatch, sqsSuccess);

          if (confirmationMatch || sqsSuccess) {
            const msg = `Submitted via Squarespace contact form: ${lead.url} (${confirmationMatch || sqsSuccess})`;
            console.log(`SUCCESS #${lead.id}:`, msg);
            saveLeadResult(lead.id, 'contacted', msg);
          }
        }
      }
    } catch (e) {
      console.error(`Error on #${lead.id}:`, e.message);
    } finally {
      await page.close();
    }
  }
}

async function run() {
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: CHROME_BIN,
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,800']
  });

  try {
    await testVerticalEngineering(browser);
    await testPenaArchitecture(browser);
    await testLeiterPerez(browser);
    await testSyncore360(browser);
    await testSquarespaceLeads(browser);
  } finally {
    await browser.close();
  }
}

run();
