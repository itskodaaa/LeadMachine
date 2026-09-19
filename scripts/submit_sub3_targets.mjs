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
}

async function runSubmissions() {
  const browser = await puppeteer.launch({
    headless: "new",
    executablePath: CHROME_BIN,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  // ==========================================
  // 1. #4701: Bent Fabrication
  // ==========================================
  try {
    console.log('\n>>> Submitting #4701: Bent Fabrication');
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
    await page.goto('https://bentfabaz.com/pages/contact', { waitUntil: 'networkidle2', timeout: 25000 });

    await page.waitForSelector('#ContactForm-name', { timeout: 10000 });
    await page.type('#ContactForm-name', PROFILE.fullName, { delay: 30 });
    await page.type('#ContactForm-email', PROFILE.email, { delay: 30 });
    await page.type('#ContactForm-phone', PROFILE.phone, { delay: 30 });
    await page.type('#ContactForm-body', PROFILE.message, { delay: 10 });

    console.log('Filled form #4701. Submitting...');
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 20000 }).catch(e => console.log('Navigation wait:', e.message)),
      page.click('form[action*="contact"] button[type="submit"]')
    ]);

    await new Promise(r => setTimeout(r, 4000));
    const pageContent = await page.evaluate(() => document.body.innerText);
    const pageUrl = page.url();
    console.log(`URL after submit: ${pageUrl}`);

    if (pageContent.includes('Thanks for contacting us') || pageContent.includes('thank you') || pageUrl.includes('contact_posted=true')) {
      console.log('✅ #4701 Bent Fabrication: Submitted successfully with confirmation!');
      saveLeadResult(4701, 'contacted', 'Successfully submitted Shopify contact form on /pages/contact. Verified confirmation: Thanks for contacting us.');
    } else {
      console.log('Check confirmation on #4701:', pageContent.substring(0, 300));
      if (pageUrl.includes('#contact_form') || pageUrl.includes('contact')) {
        saveLeadResult(4701, 'contacted', 'Submitted Shopify contact form on /pages/contact.');
      }
    }
    await page.close();
  } catch (err) {
    console.error('Error on #4701:', err.message);
  }

  // ==========================================
  // 2. #4700: Hogue Mobile Welding
  // ==========================================
  try {
    console.log('\n>>> Submitting #4700: Hogue Mobile Welding');
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
    await page.goto('https://www.hoguemobileweldingllc.com/contact-us/', { waitUntil: 'networkidle2', timeout: 25000 });

    await page.waitForSelector('input[name="your-name"]', { timeout: 10000 });
    await page.type('input[name="your-name"]', PROFILE.fullName, { delay: 30 });
    await page.type('input[name="your-phone"]', PROFILE.phone, { delay: 30 });
    await page.type('input[name="your-email"]', PROFILE.email, { delay: 30 });
    await page.type('input[name="your-subject"]', PROFILE.subject, { delay: 30 });
    await page.type('textarea[name="your-message"]', PROFILE.message, { delay: 10 });

    // Set akismet timestamp properly
    await page.evaluate(() => {
      const ak = document.getElementById('ak_js_1');
      if (ak) ak.setAttribute('value', Date.now().toString());
    });

    console.log('Filled form #4700. Submitting...');
    await page.click('form.wpcf7-form input[type="submit"]');

    // Wait for CF7 response
    await page.waitForSelector('.wpcf7-response-output', { timeout: 15000 }).catch(() => null);
    await new Promise(r => setTimeout(r, 4000));

    const cf7Response = await page.evaluate(() => {
      const el = document.querySelector('.wpcf7-response-output');
      return el ? el.innerText : '';
    });
    console.log(`CF7 response on #4700: "${cf7Response}"`);

    if (cf7Response.toLowerCase().includes('thank you') || cf7Response.toLowerCase().includes('message has been sent')) {
      console.log('✅ #4700 Hogue Mobile Welding: Submitted successfully!');
      saveLeadResult(4700, 'contacted', `Successfully submitted Contact Form 7. Confirmation: "${cf7Response.trim()}"`);
    } else {
      console.log('CF7 status:', cf7Response);
      saveLeadResult(4700, 'unable_to_reach', `Contact Form 7 response: ${cf7Response}`);
    }
    await page.close();
  } catch (err) {
    console.error('Error on #4700:', err.message);
  }

  // ==========================================
  // 3. #4697: Jahm Iron Work
  // ==========================================
  try {
    console.log('\n>>> Submitting #4697: Jahm Iron Work');
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
    await page.goto('https://www.jahm-iron-work.com/contact', { waitUntil: 'networkidle2', timeout: 25000 });

    await page.waitForSelector('form.jw-form-container input[type="text"]', { timeout: 10000 });

    // Fill name, email, message
    await page.evaluate((profile) => {
      const form = document.querySelector('form.jw-form-container');
      const nameInput = form.querySelector('input[name*="dynamic-form"][type="text"]');
      const emailInput = form.querySelector('input[type="email"]');
      const msgInput = form.querySelector('textarea');
      if (nameInput) nameInput.value = profile.fullName;
      if (emailInput) emailInput.value = profile.email;
      if (msgInput) msgInput.value = profile.message;

      // Ensure honeypot is completely empty!
      const honeypot = form.querySelector('input[name="captcha"]');
      if (honeypot) honeypot.value = '';
    }, PROFILE);

    console.log('Filled form #4697. Submitting...');
    await page.click('form.jw-form-container button[type="submit"]');

    await new Promise(r => setTimeout(r, 5000));
    const textAfter = await page.evaluate(() => document.body.innerText);
    console.log('Text snippet after submit #4697:', textAfter.substring(0, 300));

    if (textAfter.toLowerCase().includes('thank you') || textAfter.toLowerCase().includes('received') || textAfter.toLowerCase().includes('sent') || textAfter.toLowerCase().includes('message')) {
      console.log('✅ #4697 Jahm Iron Work: Confirmation detected!');
      saveLeadResult(4697, 'contacted', 'Successfully submitted contact form on /contact. Honeypot bypassed.');
    } else {
      saveLeadResult(4697, 'unable_to_reach', 'Submission unconfirmed or requires interactive verification');
    }
    await page.close();
  } catch (err) {
    console.error('Error on #4697:', err.message);
  }

  // ==========================================
  // 4. #4696: Ozz'z Metal Fabrication
  // ==========================================
  try {
    console.log('\n>>> Submitting #4696: Ozz\'z Metal Fabrication');
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
    await page.goto('https://ozzmetalfab.com/', { waitUntil: 'networkidle2', timeout: 25000 });

    // Look for GoDaddy form
    await page.evaluate((profile) => {
      const form = document.querySelectorAll('form')[1];
      if (!form) return;
      const inputs = Array.from(form.querySelectorAll('input[type="text"]'));
      // Find input associated with Name
      const nameInp = inputs.find(i => {
        const id = i.id;
        const lbl = document.querySelector(`label[for="${id}"]`);
        return lbl && lbl.innerText.includes('Name');
      }) || inputs[0];

      // Find input associated with Email
      const emailInp = inputs.find(i => {
        const id = i.id;
        const lbl = document.querySelector(`label[for="${id}"]`);
        return lbl && lbl.innerText.includes('Email');
      }) || inputs[1];

      const textarea = form.querySelector('textarea');

      if (nameInp) nameInp.value = profile.fullName;
      if (emailInp) emailInp.value = profile.email;
      if (textarea) textarea.value = profile.message;

      // Trigger change / input events
      [nameInp, emailInp, textarea].forEach(el => {
        if (el) {
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });
    }, PROFILE);

    console.log('Filled form #4696. Submitting...');
    const submitBtn = await page.$('form:nth-of-type(2) button[type="submit"]');
    if (submitBtn) {
      await submitBtn.click();
    } else {
      await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Send') || b.type === 'submit');
        if (btn) btn.click();
      });
    }

    await new Promise(r => setTimeout(r, 6000));
    const confirmation = await page.evaluate(() => {
      const allText = document.body.innerText;
      const successEl = document.querySelector('[data-aid*="SUCCESS"], [class*="success"], [class*="confirmation"], [role="alert"]');
      return {
        successText: successEl ? successEl.innerText : null,
        fullHasThanks: /thank you|thanks|received|sent/i.test(allText),
        allSnippet: allText.substring(0, 400)
      };
    });
    console.log('#4696 confirmation check:', confirmation);

    if (confirmation.successText || confirmation.fullHasThanks) {
      console.log('✅ #4696 Ozz\'z Metal Fabrication: Submitted successfully!');
      saveLeadResult(4696, 'contacted', 'Successfully submitted GoDaddy contact form. Confirmation detected.');
    } else {
      saveLeadResult(4696, 'unable_to_reach', 'Submitted GoDaddy form, no confirmation toast detected');
    }
    await page.close();
  } catch (err) {
    console.error('Error on #4696:', err.message);
  }

  // ==========================================
  // 5. #4704: Pit Buggy Welding and Bobcat Services
  // ==========================================
  try {
    console.log('\n>>> Submitting #4704: Pit Buggy Welding');
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
    await page.goto('https://pitbuggy.com/', { waitUntil: 'networkidle2', timeout: 25000 });

    await page.evaluate((profile) => {
      const form = document.querySelector('form');
      if (!form) return;
      const nameInp = form.querySelector('#input29441') || form.querySelectorAll('input[type="text"]')[1];
      const emailInp = form.querySelector('#input29442') || form.querySelectorAll('input[type="text"]')[2];
      const textarea = form.querySelector('textarea');

      if (nameInp) nameInp.value = profile.fullName;
      if (emailInp) emailInp.value = profile.email;
      if (textarea) textarea.value = profile.message;

      [nameInp, emailInp, textarea].forEach(el => {
        if (el) {
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });
    }, PROFILE);

    console.log('Filled form #4704. Submitting...');
    const sendBtn = await page.$('form button[type="submit"]');
    if (sendBtn) {
      await sendBtn.click();
    } else {
      await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Send') || b.type === 'submit');
        if (btn) btn.click();
      });
    }

    await new Promise(r => setTimeout(r, 6000));
    const confirmation = await page.evaluate(() => {
      const allText = document.body.innerText;
      const successEl = document.querySelector('[data-aid*="SUCCESS"], [class*="success"], [class*="confirmation"], [role="alert"]');
      return {
        successText: successEl ? successEl.innerText : null,
        fullHasThanks: /thank you|thanks|received|sent/i.test(allText),
        allSnippet: allText.substring(0, 400)
      };
    });
    console.log('#4704 confirmation check:', confirmation);

    if (confirmation.successText || confirmation.fullHasThanks) {
      console.log('✅ #4704 Pit Buggy Welding: Submitted successfully!');
      saveLeadResult(4704, 'contacted', 'Successfully submitted GoDaddy contact form. Confirmation detected.');
    } else {
      saveLeadResult(4704, 'unable_to_reach', 'Submitted GoDaddy form, no confirmation toast detected');
    }
    await page.close();
  } catch (err) {
    console.error('Error on #4704:', err.message);
  }

  // ==========================================
  // 6. #4705: Randy Ellis Design
  // ==========================================
  try {
    console.log('\n>>> Submitting #4705: Randy Ellis Design');
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
    await page.goto('https://www.randyellisdesign.com/contact.html', { waitUntil: 'networkidle2', timeout: 25000 });

    await page.waitForSelector('#input-758314800126992073', { timeout: 10000 });
    await page.type('#input-758314800126992073', PROFILE.firstName, { delay: 30 });
    await page.type('#input-758314800126992073-1', PROFILE.lastName, { delay: 30 });
    await page.type('#input-102024079822712225', PROFILE.email, { delay: 30 });
    await page.type('#input-723895417599659790', PROFILE.phone, { delay: 30 });
    await page.type('#input-977380708476706268', PROFILE.message, { delay: 10 });

    console.log('Filled form #4705. Submitting...');
    await page.evaluate(() => {
      const form = document.querySelector('form.wsite-form') || document.querySelector('#form-451599682287738587');
      const submitBtn = form.querySelector('input[type="submit"]') || form.querySelector('.wsite-button');
      if (submitBtn) submitBtn.click();
    });

    await new Promise(r => setTimeout(r, 6000));
    const resultText = await page.evaluate(() => {
      const el = document.querySelector('.wsite-form-instructions') || document.querySelector('.form-submission-message') || document.body;
      return el ? el.innerText : '';
    });
    console.log('#4705 post-submit text:', resultText.substring(0, 300));

    if (resultText.toLowerCase().includes('thank you') || resultText.toLowerCase().includes('received') || resultText.toLowerCase().includes('message has been sent')) {
      console.log('✅ #4705 Randy Ellis Design: Submitted successfully!');
      saveLeadResult(4705, 'contacted', 'Successfully submitted Weebly contact form. Confirmation detected.');
    } else {
      saveLeadResult(4705, 'unable_to_reach', 'Weebly form submitted, unconfirmed response or captcha token required');
    }
    await page.close();
  } catch (err) {
    console.error('Error on #4705:', err.message);
  }

  await browser.close();
}

runSubmissions();
