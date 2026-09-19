import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import db from './db.mjs';
import fs from 'fs';

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
  address: '100 Main St',
  city: 'Chicago',
  state: 'IL',
  zip: '60601',
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

function saveResult(id, status, note) {
  const current = getStmt.get(id);
  const newNotes = current?.notes ? current.notes + ' | ' + note : note;
  db.transaction(() => {
    updateStmt.run(newNotes, status, id);
    const action = status === 'contacted' ? 'sent' : 'bounced';
    logStmt.run(id, action, note);
  })();
}

async function testLead(page, id, name, url, fillAndSubmitFn) {
  console.log(`\n========================================\n[${id}] ${name} -> ${url}`);
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await new Promise(r => setTimeout(r, 2000));
    const res = await fillAndSubmitFn(page);
    console.log(`[${id}] Result:`, res);
    saveResult(id, res.status, res.note);
    return res;
  } catch (e) {
    console.log(`[${id}] Exception:`, e.message);
    saveResult(id, 'unable_to_reach', `Error processing lead: ${e.message.split('\n')[0]}`);
    return { status: 'unable_to_reach', note: e.message };
  }
}

async function run() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--ignore-certificate-errors', '--window-size=1280,800']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');

  // 1. #4741 W C Machine & Tool Inc
  await testLead(page, 4741, 'W C Machine & Tool Inc', 'http://wcmachine.com/contact-us/', async (p) => {
    const forms = await p.evaluate(() => document.querySelectorAll('form').length);
    console.log('4741 contact-us form count:', forms);
    const text = await p.evaluate(() => document.body.innerText.slice(0, 400));
    console.log('4741 text:', text);
    if (forms === 0) {
      return { status: 'unable_to_reach', note: 'Contact page (http://wcmachine.com/contact-us/) has no online web form' };
    }
    // Check if captcha
    const captcha = await p.evaluate(() => !!document.querySelector('.g-recaptcha, iframe[src*="captcha"], .cf-turnstile'));
    if (captcha) return { status: 'unable_to_reach', note: 'Blocked by Captcha challenge on contact form' };

    // Fill inputs
    await p.evaluate((prof) => {
      const inputs = Array.from(document.querySelectorAll('input, textarea'));
      for (const el of inputs) {
        const name = (el.name || el.id || el.placeholder || '').toLowerCase();
        if (el.tagName === 'TEXTAREA' || name.includes('msg') || name.includes('comment') || name.includes('message')) el.value = prof.message;
        else if (name.includes('name')) el.value = prof.fullName;
        else if (name.includes('email')) el.value = prof.email;
        else if (name.includes('phone')) el.value = prof.phone;
        else if (name.includes('company')) el.value = prof.company;
        else if (name.includes('subject')) el.value = prof.subject;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
      const btn = document.querySelector('input[type="submit"], button[type="submit"], button');
      if (btn) btn.click();
    }, OUTREACH_PROFILE);

    await new Promise(r => setTimeout(r, 4000));
    const body = await p.evaluate(() => document.body.innerText.toLowerCase());
    if (body.includes('thank') || body.includes('sent') || body.includes('received')) {
      return { status: 'contacted', note: 'Autofilled & submitted: Contact confirmation received' };
    }
    return { status: 'unable_to_reach', note: 'Form submitted but no confirmation message returned' };
  });

  // 2. #4743 ElectricMan
  await testLead(page, 4743, 'ElectricMan', 'https://www.electricmaninc.com/contact-us/', async (p) => {
    // Fill ElectricMan form
    const filled = await p.evaluate((prof) => {
      const fName = document.querySelector('input[name*="FirstName"]');
      const lName = document.querySelector('input[name*="LastName"]');
      const phone = document.querySelector('input[name*="Phone"]');
      const email = document.querySelector('input[name*="EmailAddress"]');
      const addr = document.querySelector('input[name*="Address"]');
      const leadType = document.querySelector('select[name*="LeadTypeID"]');
      const msg = document.querySelector('textarea[name*="Message"]');
      const checkboxes = document.querySelectorAll('input[type="checkbox"]');

      if (!fName || !email) return false;

      fName.value = prof.firstName;
      lName.value = prof.lastName;
      phone.value = prof.phone;
      email.value = prof.email;
      if (addr) addr.value = prof.address;
      if (leadType && leadType.options.length > 1) leadType.selectedIndex = 1;
      if (msg) msg.value = prof.message;

      for (const cb of checkboxes) {
        cb.checked = true;
        cb.dispatchEvent(new Event('change', { bubbles: true }));
      }

      [fName, lName, phone, email, addr, leadType, msg].forEach(el => {
        if (el) {
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });

      return true;
    }, OUTREACH_PROFILE);

    console.log('4743 filled:', filled);
    if (!filled) return { status: 'unable_to_reach', note: 'Could not locate contact form fields' };

    // Check captcha
    const hasCaptcha = await p.evaluate(() => !!document.querySelector('.g-recaptcha, iframe[src*="recaptcha"], iframe[src*="turnstile"], .cf-turnstile'));
    if (hasCaptcha) return { status: 'unable_to_reach', note: 'Contact form blocked by reCAPTCHA / bot protection' };

    // Submit
    await p.evaluate(() => {
      const btn = document.querySelector('button[name*="ctl16"], input[type="submit"], button[type="submit"]');
      if (btn) btn.click();
    });

    await new Promise(r => setTimeout(r, 4500));
    const confirmation = await p.evaluate(() => {
      const text = document.body.innerText.toLowerCase();
      if (text.includes('thank you') || text.includes('message has been sent') || text.includes('we will be in touch')) {
        return 'Confirmation message displayed';
      }
      const alert = document.querySelector('.alert-success, .success, [role="alert"]');
      if (alert) return alert.innerText;
      return null;
    });

    if (confirmation) {
      return { status: 'contacted', note: `Autofilled & submitted: ${confirmation}` };
    } else {
      return { status: 'unable_to_reach', note: 'Submitted inquiry form, awaiting response or unconfirmed by site DOM' };
    }
  });

  // 3. #4745 ProVision Electric
  await testLead(page, 4745, 'ProVision Electric', 'https://provisionelectric.com/contact', async (p) => {
    // Let's inspect the inputs on provisionelectric.com/contact
    const inputsInfo = await p.evaluate(() => {
      return Array.from(document.querySelectorAll('input, textarea')).map(el => ({
        tag: el.tagName,
        type: el.type,
        placeholder: el.placeholder,
        label: el.closest('label')?.innerText || el.previousElementSibling?.innerText || '',
        name: el.name,
        id: el.id
      }));
    });
    console.log('4745 inputs:', JSON.stringify(inputsInfo));

    await p.evaluate((prof) => {
      const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"]), textarea'));
      for (const el of inputs) {
        const text = ((el.placeholder || '') + ' ' + (el.id || '') + ' ' + (el.name || '') + ' ' + (el.closest('label')?.innerText || '') + ' ' + (el.previousElementSibling?.innerText || '')).toLowerCase();
        if (el.tagName === 'TEXTAREA' || text.includes('message') || text.includes('help') || text.includes('comment')) {
          el.value = prof.message;
        } else if (text.includes('name') && !text.includes('last')) {
          el.value = prof.fullName;
        } else if (text.includes('email')) {
          el.value = prof.email;
        } else if (text.includes('phone') || text.includes('tel')) {
          el.value = prof.phone;
        }
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
      const submitBtn = document.querySelector('button[type="submit"], input[type="submit"], button');
      if (submitBtn) submitBtn.click();
    }, OUTREACH_PROFILE);

    await new Promise(r => setTimeout(r, 4500));
    const confirm = await p.evaluate(() => {
      const txt = document.body.innerText.toLowerCase();
      if (txt.includes('thank you') || txt.includes('received your message') || txt.includes('in touch shortly') || txt.includes('sent successfully')) {
        return true;
      }
      const msg = document.querySelector('.form-submission-message, [data-aid="CONTACT_FORM_SUBMIT_SUCCESS"]');
      return !!msg;
    });

    if (confirm) {
      return { status: 'contacted', note: 'Autofilled & submitted: Thank you confirmation received' };
    }
    return { status: 'unable_to_reach', note: 'Submitted contact form; no explicit success banner detected' };
  });

  // 4. #4746 Mbroh Engineering
  await testLead(page, 4746, 'Mbroh Engineering', 'https://mbroh.com/contact/', async (p) => {
    // WordPress Contact Form 7
    await p.evaluate((prof) => {
      const name = document.querySelector('input[name="your-name"]');
      const email = document.querySelector('input[name="your-email"]');
      const subject = document.querySelector('input[name="your-subject"]');
      const msg = document.querySelector('textarea[name="your-message"]');
      if (name) name.value = prof.fullName;
      if (email) email.value = prof.email;
      if (subject) subject.value = prof.subject;
      if (msg) msg.value = prof.message;

      [name, email, subject, msg].forEach(el => {
        if (el) {
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });

      const submit = document.querySelector('form.wpcf7-form input[type="submit"]');
      if (submit) submit.click();
    }, OUTREACH_PROFILE);

    await new Promise(r => setTimeout(r, 5000));
    const wpcf7 = await p.evaluate(() => {
      const out = document.querySelector('.wpcf7-response-output');
      return out ? out.innerText.trim() : document.body.innerText.slice(0, 300);
    });
    console.log('4746 wpcf7 response:', wpcf7);
    if (/thank you|message has been sent|sent successfully/i.test(wpcf7)) {
      return { status: 'contacted', note: `Autofilled & submitted via CF7: "${wpcf7}"` };
    }
    return { status: 'unable_to_reach', note: `CF7 response: "${wpcf7}"` };
  });

  // 5. #4747 Efficiency Electrical
  await testLead(page, 4747, 'Efficiency Electrical', 'https://efficiencyelectrical.co/contact-us/', async (p) => {
    // Elementor form: name, email, tel field_44d5ce7, select field_915a6cd, message
    await p.evaluate((prof) => {
      const name = document.querySelector('input[name="form_fields[name]"]');
      const email = document.querySelector('input[name="form_fields[email]"]');
      const tel = document.querySelector('input[name="form_fields[field_44d5ce7]"]');
      const sel = document.querySelector('select[name="form_fields[field_915a6cd]"]');
      const msg = document.querySelector('textarea[name="form_fields[message]"]');

      if (name) name.value = prof.fullName;
      if (email) email.value = prof.email;
      if (tel) tel.value = prof.phone;
      if (sel && sel.options.length > 1) sel.selectedIndex = 1;
      if (msg) msg.value = prof.message;

      [name, email, tel, sel, msg].forEach(el => {
        if (el) {
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });

      const btn = document.querySelector('button[type="submit"]');
      if (btn) btn.click();
    }, OUTREACH_PROFILE);

    await new Promise(r => setTimeout(r, 4500));
    const elemRes = await p.evaluate(() => {
      const elMsg = document.querySelector('.elementor-message');
      return elMsg ? elMsg.innerText.trim() : null;
    });
    console.log('4747 elementor message:', elemRes);
    if (elemRes && /sent|thank|received|success/i.test(elemRes)) {
      return { status: 'contacted', note: `Autofilled & submitted Elementor form: "${elemRes}"` };
    }
    return { status: 'unable_to_reach', note: elemRes ? `Elementor response: "${elemRes}"` : 'Submitted Elementor form, no response element' };
  });

  // 6. #4748 Powerhouse Electric Contracting
  await testLead(page, 4748, 'Powerhouse Electric Contracting', 'https://www.powerhouse-electric.com/contact/', async (p) => {
    await p.evaluate((prof) => {
      const fName = document.querySelector('input[name="first-name"]');
      const lName = document.querySelector('input[name="last-name"]');
      const email = document.querySelector('input[name="email"]');
      const phone = document.querySelector('input[name="phone"]');
      const zip = document.querySelector('input[name="zipcode"]');
      const sel = document.querySelector('select[name="services"]');
      const msg = document.querySelector('textarea[name="message"]');

      if (fName) fName.value = prof.firstName;
      if (lName) lName.value = prof.lastName;
      if (email) email.value = prof.email;
      if (phone) phone.value = prof.phone;
      if (zip) zip.value = prof.zip;
      if (sel && sel.options.length > 1) sel.selectedIndex = 1;
      if (msg) msg.value = prof.message;

      [fName, lName, email, phone, zip, sel, msg].forEach(el => {
        if (el) {
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });

      const submit = document.querySelector('input[type="submit"]');
      if (submit) submit.click();
    }, OUTREACH_PROFILE);

    await new Promise(r => setTimeout(r, 5000));
    const cf7Out = await p.evaluate(() => {
      const el = document.querySelector('.wpcf7-response-output');
      return el ? el.innerText.trim() : '';
    });
    console.log('4748 response:', cf7Out);
    if (/thank you|message has been sent|sent successfully/i.test(cf7Out)) {
      return { status: 'contacted', note: `Autofilled & submitted via CF7: "${cf7Out}"` };
    }
    return { status: 'unable_to_reach', note: cf7Out ? `CF7 response: "${cf7Out}"` : 'Submitted form, awaiting response' };
  });

  // 7. #4750 Bledsoe Electrical Services, LLC
  await testLead(page, 4750, 'Bledsoe Electrical Services, LLC', 'https://bledsoeelectrical.com/contact', async (p) => {
    await p.evaluate((prof) => {
      const name = document.querySelector('input[name="name"]');
      const email = document.querySelector('input[name="email"]');
      const phone = document.querySelector('input[name="phone"]');
      const city = document.querySelector('input[name*="city"]');
      const sel = document.querySelector('select[name="service-type"]');
      const radio = document.querySelector('input[type="radio"][name="project-timeline"]');
      const msg = document.querySelector('textarea[name="message"]');

      if (name) name.value = prof.fullName;
      if (email) email.value = prof.email;
      if (phone) phone.value = prof.phone;
      if (city) city.value = prof.city;
      if (sel && sel.options.length > 1) sel.selectedIndex = 1;
      if (radio) radio.checked = true;
      if (msg) msg.value = prof.message;

      [name, email, phone, city, sel, msg].forEach(el => {
        if (el) {
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });

      const btn = document.querySelector('button[type="submit"]');
      if (btn) btn.click();
    }, OUTREACH_PROFILE);

    await new Promise(r => setTimeout(r, 4500));
    const confirm = await p.evaluate(() => {
      const txt = document.body.innerText.toLowerCase();
      if (txt.includes('thank you') || txt.includes('we received your message') || txt.includes('sent successfully')) {
        return true;
      }
      return false;
    });
    console.log('4750 confirm:', confirm);
    if (confirm) {
      return { status: 'contacted', note: 'Autofilled & submitted: Thank you confirmation received' };
    }
    return { status: 'unable_to_reach', note: 'Inquiry submitted, no immediate confirmation banner displayed' };
  });

  // 8. #4751 Texoma Electrical Service LLC
  await testLead(page, 4751, 'Texoma Electrical Service LLC', 'https://www.texomaelectricservice.com/free-estimate', async (p) => {
    const wixRes = await p.evaluate((prof) => {
      const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"]), textarea'));
      for (const el of inputs) {
        const ph = (el.placeholder || el.getAttribute('aria-label') || '').toLowerCase();
        if (el.tagName === 'TEXTAREA' || ph.includes('message') || ph.includes('details') || ph.includes('project')) {
          el.value = prof.message;
        } else if (ph.includes('first')) {
          el.value = prof.firstName;
        } else if (ph.includes('last')) {
          el.value = prof.lastName;
        } else if (ph.includes('name')) {
          el.value = prof.fullName;
        } else if (ph.includes('email')) {
          el.value = prof.email;
        } else if (ph.includes('phone')) {
          el.value = prof.phone;
        } else if (ph.includes('address') || ph.includes('street')) {
          el.value = prof.address;
        } else if (ph.includes('city')) {
          el.value = prof.city;
        }
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }

      const submitBtn = Array.from(document.querySelectorAll('button')).find(b => /submit|send|request/i.test(b.innerText));
      if (submitBtn) {
        submitBtn.click();
        return true;
      }
      return false;
    }, OUTREACH_PROFILE);

    await new Promise(r => setTimeout(r, 4500));
    const confirm = await p.evaluate(() => {
      const text = document.body.innerText.toLowerCase();
      if (text.includes('thank you') || text.includes('received') || text.includes('thanks for submitting')) {
        return true;
      }
      const wixMsg = document.querySelector('[data-aid="CONTACT_FORM_SUBMIT_SUCCESS"], .wixui-form__message');
      return !!wixMsg;
    });
    console.log('4751 confirm:', confirm);
    if (confirm) {
      return { status: 'contacted', note: 'Autofilled & submitted Wix estimate form: Submission confirmed' };
    }
    return { status: 'unable_to_reach', note: 'Submitted estimate form, no explicit Wix success message returned' };
  });

  await browser.close();
}

run();
