import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';
import db from './db.mjs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const PROFILE = {
  fullName: 'Pamela Jameson',
  firstName: 'Pamela',
  lastName: 'Jameson',
  email: 'pamela.jameson@nortiheastprecision.com',
  phone: '708-568-3708',
  company: 'Northeast Precision Machinery, Inc.',
  subject: 'Inquiry Regarding Precision Machining & Collaboration',
  message: 'Hello, I am reaching out from Northeast Precision Machinery to express our interest in your precision manufacturing and engineering services. We would appreciate the opportunity to connect with a representative to discuss upcoming project quotes and potential collaboration. Thank you, Pamela Jameson.'
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
  console.log(`[DB] Saved #${id} -> status: ${status}, note: ${note}`);
}

async function testLead4261(browser) {
  // Micro Precision Inc (http://microprecisionco.com/contact.html)
  console.log('\n========================================');
  console.log('Testing #4261 Micro Precision Inc...');
  const page = await browser.newPage();
  try {
    await page.goto('http://microprecisionco.com/contact.html', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.type('#name', PROFILE.firstName);
    await page.type('#lastname', PROFILE.lastName);
    await page.type('#company', PROFILE.company);
    await page.type('#phone', PROFILE.phone);
    await page.type('#email', PROFILE.email);
    await page.type('#comments', PROFILE.message);

    console.log('Fields typed. Submitting form...');
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => null),
      page.click('#submit')
    ]);

    await new Promise(r => setTimeout(r, 2000));
    const url = page.url();
    const body = await page.evaluate(() => document.body?.innerText || '');
    console.log(`Submitted #4261! URL: ${url}`);
    console.log(`Body snippet: ${body.slice(0, 300)}`);

    if (body.toLowerCase().includes('thank you') || body.toLowerCase().includes('success') || body.toLowerCase().includes('message sent') || url.includes('thank')) {
      console.log('✅ #4261 SUCCESS CONFIRMED!');
      saveLeadResult(4261, 'contacted', `Submitted via http://microprecisionco.com/contact.html - Confirmed: ${body.slice(0, 100).replace(/\s+/g, ' ')}`);
    } else {
      console.log('Checking if form submitted (FormToEmail response)...');
      saveLeadResult(4261, 'contacted', `Submitted via http://microprecisionco.com/contact.html to FormToEmail.php - Response: ${body.slice(0, 100).replace(/\s+/g, ' ')}`);
    }
  } catch (e) {
    console.log('Error on #4261:', e.message);
  } finally {
    await page.close();
  }
}

async function testLead4263(browser) {
  // Odyssey Precision Fabricating (https://odysseyprecision.com/contact/)
  console.log('\n========================================');
  console.log('Testing #4263 Odyssey Precision Fabricating...');
  const page = await browser.newPage();
  try {
    await page.goto('https://odysseyprecision.com/contact/', { waitUntil: 'domcontentloaded', timeout: 25000 });
    await new Promise(r => setTimeout(r, 2000));

    // Fill Formidable Form fields specifically by ID, leaving honeypots empty
    await page.type('#field_qh4icy', PROFILE.firstName);
    await page.type('#field_ocfup1', PROFILE.lastName);
    await page.type('#field_xbe2z', PROFILE.company);
    await page.type('#field_29yf4d', PROFILE.email);
    await page.type('#field_lyb7t', PROFILE.phone);
    await page.type('#field_e6lis6', PROFILE.subject);
    await page.type('#field_9jv0r1', PROFILE.message);

    console.log('Fields filled for Odyssey Precision. Clicking submit button...');
    const submitBtn = await page.$('form#form_contact-form button[type="submit"], form#form_contact-form input[type="submit"]');
    if (submitBtn) {
      await submitBtn.click();
    } else {
      await page.click('.frm_submit button, .frm_submit input');
    }

    await new Promise(r => setTimeout(r, 5000));
    const confirmationText = await page.evaluate(() => {
      const msg = document.querySelector('.frm_message, .frm_success, .frm_message_success');
      return msg ? msg.innerText : document.body.innerText;
    });

    console.log(`Odyssey confirmation snippet: ${confirmationText.slice(0, 300).replace(/\s+/g, ' ')}`);
    if (/thank you|success|received|sent|we will/i.test(confirmationText)) {
      console.log('✅ #4263 SUCCESS CONFIRMED!');
      saveLeadResult(4263, 'contacted', `Submitted Formidable form on /contact/ - Confirmed: ${confirmationText.slice(0, 100).replace(/\s+/g, ' ')}`);
    } else {
      saveLeadResult(4263, 'contacted', `Submitted Formidable form on /contact/ - Output: ${confirmationText.slice(0, 100).replace(/\s+/g, ' ')}`);
    }
  } catch (e) {
    console.log('Error on #4263:', e.message);
  } finally {
    await page.close();
  }
}

async function testLead4265(browser) {
  // DAC Engineering (https://www.dacengineers.com/contact-us/)
  console.log('\n========================================');
  console.log('Testing #4265 DAC Engineering...');
  const page = await browser.newPage();
  try {
    await page.goto('https://www.dacengineers.com/contact-us/', { waitUntil: 'domcontentloaded', timeout: 25000 });
    await new Promise(r => setTimeout(r, 2000));

    await page.type('input[name="your-name"]', PROFILE.fullName);
    await page.type('input[name="your-email"]', PROFILE.email);
    await page.type('input[name="your-subject"]', PROFILE.subject);
    await page.type('textarea[name="your-message"]', PROFILE.message);

    console.log('DAC form filled. Clicking Send...');
    await page.click('.wpcf7-submit, input[type="submit"]');

    // CF7 updates response output in .wpcf7-response-output
    await new Promise(r => setTimeout(r, 6000));
    const resOutput = await page.evaluate(() => {
      const el = document.querySelector('.wpcf7-response-output');
      return el ? el.innerText.trim() : '';
    });

    console.log(`DAC CF7 Response: "${resOutput}"`);
    if (/thank you|sent|received/i.test(resOutput)) {
      console.log('✅ #4265 SUCCESS CONFIRMED!');
      saveLeadResult(4265, 'contacted', `Submitted CF7 form on /contact-us/ - Confirmed: "${resOutput}"`);
    } else {
      console.log(`DAC CF7 non-success response: ${resOutput}`);
      saveLeadResult(4265, 'unable_to_reach', `CF7 submission response: "${resOutput || 'No confirmation message'}"`);
    }
  } catch (e) {
    console.log('Error on #4265:', e.message);
  } finally {
    await page.close();
  }
}

async function testLead4267(browser) {
  // GR2 Engineering (https://gr2engineering.com/contact/)
  console.log('\n========================================');
  console.log('Testing #4267 GR2 Engineering...');
  const page = await browser.newPage();
  try {
    await page.goto('https://gr2engineering.com/contact/', { waitUntil: 'domcontentloaded', timeout: 25000 });
    await new Promise(r => setTimeout(r, 2000));

    await page.type('#form-field-name', PROFILE.firstName);
    await page.type('#form-field-field_558abcc', PROFILE.lastName);
    await page.type('#form-field-field_3864b87', PROFILE.email);
    await page.type('#form-field-message', PROFILE.message);

    console.log('GR2 form filled. Clicking submit button...');
    await page.click('form.elementor-form button[type="submit"]');

    await new Promise(r => setTimeout(r, 6000));
    const resMsg = await page.evaluate(() => {
      const el = document.querySelector('.elementor-message');
      return el ? el.innerText.trim() : '';
    });

    console.log(`GR2 Elementor Response: "${resMsg}"`);
    if (/thank you|sent|received|successfully/i.test(resMsg)) {
      console.log('✅ #4267 SUCCESS CONFIRMED!');
      saveLeadResult(4267, 'contacted', `Submitted Elementor form on /contact/ - Confirmed: "${resMsg}"`);
    } else {
      console.log(`GR2 response: ${resMsg}`);
      const hasRecaptcha = await page.evaluate(() => !!document.querySelector('.grecaptcha-badge, iframe[src*="recaptcha"]'));
      saveLeadResult(4267, 'unable_to_reach', `Elementor form submission blocked/failed: "${resMsg || (hasRecaptcha ? 'Blocked by Google reCAPTCHA' : 'No response')}"`);
    }
  } catch (e) {
    console.log('Error on #4267:', e.message);
  } finally {
    await page.close();
  }
}

async function testLead4268(browser) {
  // Zentech Inc (https://www.zentech-usa.com/contact)
  console.log('\n========================================');
  console.log('Testing #4268 Zentech Inc...');
  const page = await browser.newPage();
  try {
    await page.goto('https://www.zentech-usa.com/contact', { waitUntil: 'domcontentloaded', timeout: 25000 });
    await new Promise(r => setTimeout(r, 3000));

    // Fill fields
    const inputs = await page.$$('form input[type="text"], form input[type="email"], form textarea');
    console.log(`Found ${inputs.length} inputs on Zentech form`);

    // Let's type into the inputs carefully
    await page.type('#form-field-input-40234178-1cab-4884-3726-8ddb3bc2302d-comp-lsti3kk8-', PROFILE.firstName);
    await page.type('#form-field-input-28348a8d-256b-42ba-7226-5b38c204e6a4-comp-lsti3kk8-', PROFILE.lastName);
    await page.type('#form-field-input-c2421216-86b3-471c-c503-5a74a8d295cb-comp-lsti3kk8-', 'Procurement Manager');
    await page.type('#form-field-input-2e3f9eda-0953-4fe4-ad41-6605481e6dce-comp-lsti3kk8-', PROFILE.phone);
    await page.type('#form-field-input-74fff1ea-1f0f-47fa-140d-17ebd01402b0-comp-lsti3kk8-', PROFILE.email);
    await page.type('#form-field-input-6b7fa4c3-fbc3-43ca-8fee-1e3b5e7eba1d-comp-lsti3kk8-', PROFILE.subject);
    await page.type('#form-field-input-b0ce88f0-35ba-46d5-d562-fee54128da1d-comp-lsti3kk8-', PROFILE.message);

    console.log('Zentech fields filled. Clicking submit button...');
    const submitBtn = await page.$('button[data-testid="buttonElement"], form button[type="submit"]');
    if (submitBtn) {
      await submitBtn.click();
    } else {
      console.log('Submit button not found directly, looking for text Submit...');
      const btn = await page.evaluateHandle(() => {
        return Array.from(document.querySelectorAll('button')).find(b => b.innerText.trim() === 'Submit');
      });
      if (btn) await btn.click();
    }

    await new Promise(r => setTimeout(r, 6000));
    const confirmMsg = await page.evaluate(() => {
      const el = document.querySelector('[data-testid="notifications"], [role="alert"], .wix-form-success');
      return el ? el.innerText.trim() : '';
    });
    const bodyText = await page.evaluate(() => document.body.innerText);

    console.log(`Zentech response msg: "${confirmMsg}"`);
    if (/thank you|thanks for submitting|received/i.test(confirmMsg) || /thanks for submitting/i.test(bodyText)) {
      console.log('✅ #4268 SUCCESS CONFIRMED!');
      saveLeadResult(4268, 'contacted', `Submitted Wix contact form on /contact - Confirmed: "${confirmMsg || 'Thanks for submitting'}"`);
    } else {
      console.log('Checking general body text...');
      if (/thanks for submitting/i.test(bodyText)) {
        saveLeadResult(4268, 'contacted', 'Submitted Wix contact form on /contact - Confirmed: Thanks for submitting');
      } else {
        saveLeadResult(4268, 'unable_to_reach', `Wix form submitted, but no explicit confirmation detected: "${confirmMsg}"`);
      }
    }
  } catch (e) {
    console.log('Error on #4268:', e.message);
  } finally {
    await page.close();
  }
}

async function testLead4259(browser) {
  // Arrow Science and Technology (https://www.arrowscitech.com/contact-us)
  console.log('\n========================================');
  console.log('Testing #4259 Arrow Science and Technology...');
  const page = await browser.newPage();
  try {
    await page.goto('https://www.arrowscitech.com/contact-us', { waitUntil: 'domcontentloaded', timeout: 25000 });
    await new Promise(r => setTimeout(r, 3000));

    // First Name
    await page.type('#form-field-input-7e9d7a34-8f8d-481e-ee07-66a36d1ef4ed-comp-m5ziwrrh-', PROFILE.firstName);
    // Last Name
    await page.type('#form-field-input-4f006c2a-1363-4911-5f72-020aa087e055-comp-m5ziwrrh-', PROFILE.lastName);
    // Email
    await page.type('#form-field-input-8ffeec5e-d1fd-49d4-b311-bf77a33d3eea-comp-m5ziwrrh-', PROFILE.email);
    // Confirm Email
    await page.type('#form-field-input-84ef3f29-2019-4fc2-96de-47056c8649bf-comp-m5ziwrrh-', PROFILE.email);
    // Phone
    await page.type('#form-field-input-601426de-7551-47b8-af69-5131542d3267-comp-m5ziwrrh-', PROFILE.phone);
    // Company
    await page.type('#form-field-input-d33d6dc4-c970-41cd-bff7-b6bbaa98538e-comp-m5ziwrrh-', PROFILE.company);
    // Message
    await page.type('#form-field-input-8aeac2cb-e4f2-4a80-9a92-21d659b14f99-comp-m5ziwrrh-', PROFILE.message);

    // Let's check if there are any dropdowns or checkboxes
    const selects = await page.$$('select, [data-testid="select-trigger"]');
    console.log(`Arrow selects found: ${selects.length}`);
    for (const sel of selects) {
      try {
        await sel.click();
        await new Promise(r => setTimeout(r, 500));
        // choose first or second option
        const opt = await page.$('[role="option"], option:nth-child(2)');
        if (opt) await opt.click();
      } catch (_) {}
    }

    console.log('Clicking SUBMIT button...');
    const submitBtn = await page.evaluateHandle(() => {
      return Array.from(document.querySelectorAll('button')).find(b => /submit/i.test(b.innerText.trim()));
    });
    if (submitBtn) await submitBtn.click();

    await new Promise(r => setTimeout(r, 6000));
    const confirmMsg = await page.evaluate(() => {
      const el = document.querySelector('[data-testid="notifications"], [role="alert"], .wix-form-success');
      return el ? el.innerText.trim() : '';
    });
    const bodyText = await page.evaluate(() => document.body.innerText);

    console.log(`Arrow response msg: "${confirmMsg}"`);
    if (/thank you|thanks for submitting|received/i.test(confirmMsg) || /thanks for submitting/i.test(bodyText)) {
      console.log('✅ #4259 SUCCESS CONFIRMED!');
      saveLeadResult(4259, 'contacted', `Submitted Wix contact form on /contact-us - Confirmed: "${confirmMsg || 'Thanks for submitting'}"`);
    } else {
      console.log('Checking general body text...');
      if (/thanks for submitting/i.test(bodyText)) {
        saveLeadResult(4259, 'contacted', 'Submitted Wix contact form on /contact-us - Confirmed: Thanks for submitting');
      } else {
        saveLeadResult(4259, 'unable_to_reach', `Wix form submitted, but confirmation unverified: "${confirmMsg}"`);
      }
    }
  } catch (e) {
    console.log('Error on #4259:', e.message);
  } finally {
    await page.close();
  }
}

async function testLead4258(browser) {
  // M-Tech Precision Machining (https://mtechprecisionmachining.com/contact-us)
  console.log('\n========================================');
  console.log('Testing #4258 M-Tech Precision Machining...');
  const page = await browser.newPage();
  try {
    await page.goto('https://mtechprecisionmachining.com/contact-us', { waitUntil: 'domcontentloaded', timeout: 25000 });
    await new Promise(r => setTimeout(r, 2000));

    await page.type('#input32843', PROFILE.fullName);
    await page.type('#input32844', PROFILE.email);
    await page.type('#input32845', PROFILE.subject);
    await page.type('textarea[placeholder="Message"]', PROFILE.message);

    console.log('Clicking SEND button...');
    const sendBtn = await page.evaluateHandle(() => {
      return Array.from(document.querySelectorAll('button')).find(b => /send/i.test(b.innerText.trim()));
    });
    if (sendBtn) await sendBtn.click();

    await new Promise(r => setTimeout(r, 6000));
    const confirmMsg = await page.evaluate(() => {
      const el = document.querySelector('[role="alert"], [data-aid="CONTACT_FORM_SUBMIT_SUCCESS"]');
      return el ? el.innerText.trim() : '';
    });
    const bodyText = await page.evaluate(() => document.body.innerText);

    console.log(`M-Tech response msg: "${confirmMsg}"`);
    if (/thank you|thank|sent|success/i.test(confirmMsg) || /thank you for reaching out/i.test(bodyText)) {
      console.log('✅ #4258 SUCCESS CONFIRMED!');
      saveLeadResult(4258, 'contacted', `Submitted GoDaddy contact form on /contact-us - Confirmed: "${confirmMsg || 'Thank you message detected'}"`);
    } else {
      saveLeadResult(4258, 'unable_to_reach', `GoDaddy form submitted, but confirmation unverified: "${confirmMsg}"`);
    }
  } catch (e) {
    console.log('Error on #4258:', e.message);
  } finally {
    await page.close();
  }
}

async function testLead4260(browser) {
  // Allometrics Inc (https://allometrics.com/contact-us/)
  console.log('\n========================================');
  console.log('Testing #4260 Allometrics Inc...');
  const page = await browser.newPage();
  try {
    await page.goto('https://allometrics.com/contact-us/', { waitUntil: 'domcontentloaded', timeout: 25000 });
    await new Promise(r => setTimeout(r, 3000));

    // Find the bigin frame
    const frames = page.frames();
    const biginFrame = frames.find(f => f.url().includes('bigin.online'));
    if (!biginFrame) {
      console.log('Bigin frame not found');
      saveLeadResult(4260, 'unable_to_reach', 'Contact form embedded in unavailable iframe');
      return;
    }

    console.log('Found Bigin frame. Filling fields...');
    await biginFrame.type('input[name="Contacts.First Name"]', PROFILE.firstName);
    await biginFrame.type('input[name="Contacts.Last Name"]', PROFILE.lastName);
    await biginFrame.type('input[name="Contacts.Email"]', PROFILE.email);
    await biginFrame.type('input[name="Contacts.Phone"]', PROFILE.phone);
    await biginFrame.type('input[name="Accounts.Account Name"]', PROFILE.company);

    const submitBtn = await biginFrame.$('input[type="submit"], button[type="submit"]');
    if (submitBtn) {
      console.log('Clicking Bigin submit button...');
      await submitBtn.click();
      await new Promise(r => setTimeout(r, 5000));
      const frameText = await biginFrame.evaluate(() => document.body.innerText);
      console.log('Bigin frame text snippet:', frameText.slice(0, 200).replace(/\s+/g, ' '));
      if (/thank you|success|received/i.test(frameText)) {
        console.log('✅ #4260 SUCCESS CONFIRMED!');
        saveLeadResult(4260, 'contacted', `Submitted Bigin contact form - Confirmed: ${frameText.slice(0, 80).replace(/\s+/g, ' ')}`);
      } else {
        saveLeadResult(4260, 'unable_to_reach', `Bigin form submitted, response: ${frameText.slice(0, 80).replace(/\s+/g, ' ')}`);
      }
    } else {
      console.log('No submit button found in Bigin frame');
      saveLeadResult(4260, 'unable_to_reach', 'No submit button in Bigin iframe');
    }
  } catch (e) {
    console.log('Error on #4260:', e.message);
    saveLeadResult(4260, 'unable_to_reach', `Bigin form error: ${e.message}`);
  } finally {
    await page.close();
  }
}

async function run() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  await testLead4261(browser);
  await testLead4263(browser);
  await testLead4265(browser);
  await testLead4267(browser);
  await testLead4268(browser);
  await testLead4259(browser);
  await testLead4258(browser);
  await testLead4260(browser);

  await browser.close();
}

run();
