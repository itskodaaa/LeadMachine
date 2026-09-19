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
  console.log(`[DB SAVED] Lead #${id} -> status: ${status} | note: ${note}`);
}

async function main() {
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: CHROME_BIN,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
  });

  // 1. Lead #4114 GoldstarCNC
  try {
    console.log('\n--- Processing Lead #4114 GoldstarCNC ---');
    const page = await browser.newPage();
    await page.goto('https://goldstarcnc.us/contact-us/', { waitUntil: 'networkidle2', timeout: 30000 });
    
    await page.waitForSelector('input[name="et_pb_contact_name_0"]', { timeout: 5000 });
    await page.type('input[name="et_pb_contact_name_0"]', OUTREACH_PROFILE.fullName);
    await page.type('input[name="et_pb_contact_email_0"]', OUTREACH_PROFILE.email);
    await page.type('input[name="et_pb_contact_telefono_0"]', OUTREACH_PROFILE.phone);
    await page.type('textarea[name="et_pb_contact_message_0"]', OUTREACH_PROFILE.message);

    const submitBtn = await page.$('button.et_builder_submit_button');
    if (submitBtn) {
      console.log('4114 clicking submit...');
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {}),
        submitBtn.click()
      ]);
      await new Promise(r => setTimeout(r, 4000));
      const pageText = await page.evaluate(() => document.body.innerText);
      console.log('4114 snippet after submit:', pageText.slice(0, 300));
      
      const successMatch = pageText.match(/(thanks for contacting us|message has been sent|thanks|thank you|your message was sent|in touch shortly)/i);
      if (successMatch) {
        console.log('4114 SUCCESS:', successMatch[0]);
        saveLeadResult(4114, 'contacted', `Confirmed: Form submitted successfully via contact page ("${successMatch[0]}")`);
      } else {
        console.log('4114 checking form container:');
        const formState = await page.evaluate(() => {
          const form = document.querySelector('.et_pb_contact_form');
          return form ? form.innerText : 'form removed';
        });
        console.log('4114 form state:', formState);
        if (formState.toLowerCase().includes('thanks') || formState.toLowerCase().includes('thank you') || formState.toLowerCase().includes('message')) {
          saveLeadResult(4114, 'contacted', `Confirmed: Contact form submitted successfully ("${formState.trim()}")`);
        }
      }
    }
    await page.close();
  } catch (e) {
    console.log('Lead 4114 Error:', e.message);
  }

  // 2. Lead #4106 Anco Precision Inc.
  try {
    console.log('\n--- Processing Lead #4106 Anco Precision Inc. ---');
    const page = await browser.newPage();
    await page.goto('https://ancoprecision.com/contact-us/', { waitUntil: 'domcontentloaded', timeout: 25000 });
    await new Promise(r => setTimeout(r, 2000));
    console.log('4106 URL:', page.url(), 'Title:', await page.title());
    
    const formInfo = await page.evaluate(() => {
      const forms = Array.from(document.querySelectorAll('form'));
      return forms.map(f => ({
        id: f.id,
        action: f.action,
        inputs: Array.from(f.querySelectorAll('input, textarea, select')).map(i => ({ name: i.name, type: i.type, id: i.id }))
      }));
    });
    console.log('4106 Forms on /contact-us/:', JSON.stringify(formInfo, null, 2));

    const page2 = await browser.newPage();
    await page2.goto('https://ancoprecision.com/instant-quotes/', { waitUntil: 'domcontentloaded', timeout: 25000 });
    await new Promise(r => setTimeout(r, 2000));
    const quoteForms = await page2.evaluate(() => {
      return Array.from(document.querySelectorAll('form')).map(f => ({
        id: f.id,
        action: f.action,
        inputs: Array.from(f.querySelectorAll('input, textarea, select')).map(i => ({ name: i.name, type: i.type, id: i.id }))
      }));
    });
    console.log('4106 Forms on /instant-quotes/:', JSON.stringify(quoteForms, null, 2));
    await page2.close();
    await page.close();
  } catch (e) {
    console.log('Lead 4106 Error:', e.message);
  }

  // 3. Lead #4117 Stiver Engineering
  try {
    console.log('\n--- Processing Lead #4117 Stiver Engineering ---');
    const page = await browser.newPage();
    await page.goto('https://stiverengineering.com/contact-engineering-design-firm/', { waitUntil: 'networkidle2', timeout: 30000 });
    
    await page.waitForSelector('#gform_1', { timeout: 5000 });
    await page.type('#input_1_1_3', OUTREACH_PROFILE.firstName);
    await page.type('#input_1_1_6', OUTREACH_PROFILE.lastName);
    await page.type('#input_1_2', OUTREACH_PROFILE.email);
    await page.type('#input_1_3', OUTREACH_PROFILE.phone);
    await page.type('#input_1_4', OUTREACH_PROFILE.subject);
    await page.type('#input_1_5', OUTREACH_PROFILE.message);

    console.log('4117 Form populated. Clicking submit...');
    const submitBtn = await page.$('#gform_submit_button_1');
    if (submitBtn) {
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 20000 }).catch(() => {}),
        submitBtn.click()
      ]);
      await new Promise(r => setTimeout(r, 4000));
      const postSubmit = await page.evaluate(() => {
        const conf = document.querySelector('.gform_confirmation_message, .gforms_confirmation_message, .confirmation-message');
        const validation = document.querySelector('.gform_validation_errors, .validation_error');
        return {
          url: window.location.href,
          confText: conf ? conf.innerText : null,
          validationText: validation ? validation.innerText : null,
          bodySnippet: document.body.innerText.slice(0, 400)
        };
      });
      console.log('4117 Post submit result:', JSON.stringify(postSubmit, null, 2));
      if (postSubmit.confText) {
        saveLeadResult(4117, 'contacted', `Confirmed: Gravity Form submission confirmed: "${postSubmit.confText.trim()}"`);
      } else if (/thank you|thanks|received/i.test(postSubmit.bodySnippet)) {
        saveLeadResult(4117, 'contacted', `Confirmed: Received confirmation message on submission`);
      } else if (postSubmit.validationText) {
        console.log('4117 Validation error:', postSubmit.validationText);
      }
    }
    await page.close();
  } catch (e) {
    console.log('Lead 4117 Error:', e.message);
  }

  // 4. Lead #4115 Southern Gear
  try {
    console.log('\n--- Processing Lead #4115 Southern Gear ---');
    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(45000);
    console.log('Navigating to southerngear.com/contact-us/...');
    await page.goto('https://southerngear.com/contact-us/', { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 2000));
    console.log('4115 loaded! Title:', await page.title());
    const forms = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('form')).map(f => ({
        id: f.id,
        action: f.action,
        inputs: Array.from(f.querySelectorAll('input, textarea, select')).map(i => ({ name: i.name, type: i.type, id: i.id }))
      }));
    });
    console.log('4115 Forms on contact-us:', JSON.stringify(forms, null, 2));
    await page.close();
  } catch (e) {
    console.log('Lead 4115 Error:', e.message);
  }

  // 5. Lead #4109 3 Layers CNC
  try {
    console.log('\n--- Processing Lead #4109 3 Layers CNC ---');
    const page = await browser.newPage();
    await page.goto('https://www.3layerscnc.com/', { waitUntil: 'networkidle2', timeout: 35000 });
    
    const wixForm = await page.$('#comp-k0f09obf');
    if (wixForm) {
      console.log('4109 Wix form found. Populating...');
      await page.type('#input_comp-k56jqs35', OUTREACH_PROFILE.firstName);
      await page.type('#input_comp-kkdvxjpi', OUTREACH_PROFILE.lastName);
      await page.type('#input_comp-k56jqzpx', OUTREACH_PROFILE.phone);
      await page.type('#input_comp-km10ryae', OUTREACH_PROFILE.email);
      await page.type('#textarea_comp-kqclsdc9', OUTREACH_PROFILE.message);

      const submitBtn = await page.evaluateHandle(() => {
        const form = document.querySelector('#comp-k0f09obf');
        const buttons = Array.from(form.querySelectorAll('button, [data-testid="buttonElement"], div[role="button"]'));
        return buttons.find(b => /submit|send|enviar/i.test(b.innerText)) || buttons[0];
      });

      console.log('4109 Submit button handle exists:', !!submitBtn);
      if (submitBtn) {
        await submitBtn.click();
        await new Promise(r => setTimeout(r, 5000));
        
        const formResult = await page.evaluate(() => {
          const form = document.querySelector('#comp-k0f09obf');
          return {
            text: form ? form.innerText : '',
            successMsg: document.querySelector('[data-testid="form-success-message"], [data-testid="notifications-message"]')?.innerText
          };
        });
        console.log('4109 formResult:', JSON.stringify(formResult, null, 2));
        if (/thanks for submitting|thank you|received|submitted/i.test(formResult.text) || /thanks for submitting|thank you|received|submitted/i.test(formResult.successMsg || '')) {
          saveLeadResult(4109, 'contacted', `Confirmed: Wix contact form submitted successfully: "${(formResult.successMsg || formResult.text).replace(/\n+/g, ' ').slice(0, 100)}"`);
        }
      }
    }
    await page.close();
  } catch (e) {
    console.log('Lead 4109 Error:', e.message);
  }

  await browser.close();
}

main();
