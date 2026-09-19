import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';
import db from './db.mjs';

puppeteer.use(StealthPlugin());
const CHROME_BIN = '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

const PROFILE = {
  fullName: 'Pamela Jameson',
  email: 'pamela.jameson@nortiheastprecision.com',
  phone: '708-568-3708',
  company: 'Northeast Precision Machinery, Inc.',
  message: 'Hello, I am reaching out to express our interest in your metal fabrication and welding services. We would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, capabilities, and upcoming project quotes. Thank you! - Pamela Jameson'
};

function recordSuccess(leadId, note) {
  console.log(`\n>>> [SUCCESS RECORDED] #${leadId}: ${note}\n`);
  db.prepare("UPDATE leads SET status = 'contacted', notes = notes || ? WHERE id = ?")
    .run(' | ' + note, leadId);
  db.prepare("INSERT INTO contact_logs (lead_id, action, notes, created_at) VALUES (?, 'sent', ?, CURRENT_TIMESTAMP)")
    .run(leadId, note);
}

// 1. Test Tampa Welders #4884 with React event dispatching
async function testTampaWelders(browser) {
  console.log('\n========================================');
  console.log('Testing Lead #4884: Tampa Welders (React Native Setter)');
  const page = await browser.newPage();
  try {
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    page.on('response', async res => {
      const u = res.url();
      if (u.includes('messages') || u.includes('contact') || u.includes('email')) {
        try {
          const txt = await res.text();
          console.log(`[NET RESPONSE] ${res.status()} ${u}:`, txt);
        } catch (_) {}
      }
    });

    await page.goto('https://tampawelders.com/', { waitUntil: 'domcontentloaded', timeout: 35000 });
    await new Promise(r => setTimeout(r, 4000));

    // Scroll to form
    await page.evaluate(() => {
      const form = document.querySelector('form');
      if (form) form.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    await new Promise(r => setTimeout(r, 1000));

    // Fill inputs using React native value setter
    const fillResult = await page.evaluate((prof) => {
      function setReactValue(input, val) {
        const lastValue = input.value;
        input.value = val;
        const tracker = input._valueTracker;
        if (tracker) tracker.setValue(lastValue);
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        input.dispatchEvent(new Event('blur', { bubbles: true }));
      }

      const nameInput = document.querySelector('[data-aid="CONTACT_FORM_NAME"]');
      const emailInput = document.querySelector('[data-aid="CONTACT_FORM_EMAIL"]');
      const messageInput = document.querySelector('[data-aid="CONTACT_FORM_MESSAGE"]') || document.querySelector('form textarea');

      if (nameInput) setReactValue(nameInput, prof.fullName);
      if (emailInput) setReactValue(emailInput, prof.email);
      if (messageInput) setReactValue(messageInput, prof.message);

      return {
        nameSet: !!nameInput,
        emailSet: !!emailInput,
        msgSet: !!messageInput
      };
    }, PROFILE);

    console.log('Fill result on Tampa Welders:', fillResult);
    await new Promise(r => setTimeout(r, 1500));

    console.log('Clicking submit button on Tampa Welders...');
    const clickResult = await page.evaluate(() => {
      const btn = document.querySelector('[data-aid="CONTACT_FORM_SUBMIT_BUTTON"]') ||
                  document.querySelector('form button[type="submit"]') ||
                  Array.from(document.querySelectorAll('form button')).find(b => /send|submit/i.test(b.innerText));
      if (btn) {
        btn.click();
        return { clicked: true, text: btn.innerText };
      }
      return { clicked: false };
    });
    console.log('Click result:', clickResult);

    await new Promise(r => setTimeout(r, 7000));

    const result = await page.evaluate(() => {
      const successMsg = Array.from(document.querySelectorAll('div, p, span, h2, h3, h4'))
        .map(el => el.innerText.trim())
        .find(txt => /thank you|we'll be in touch|message sent|thanks for reaching out|inquiry received/i.test(txt) && txt.length < 150);
      return { successMsg };
    });

    console.log('Tampa Welders confirmation result:', result);

    if (result.successMsg) {
      recordSuccess(4884, `Contact form: https://tampawelders.com/ (Autofilled & verified: "${result.successMsg}")`);
    }
  } catch (e) {
    console.error('Error on #4884:', e.message);
  } finally {
    await page.close();
  }
}

// 2. Test Tampa Brass #4881
async function testTampaBrass(browser) {
  console.log('\n========================================');
  console.log('Testing Lead #4881: Tampa Brass (Ninja Forms)');
  const page = await browser.newPage();
  try {
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    page.on('response', async res => {
      if (res.url().includes('admin-ajax.php')) {
        try {
          const txt = await res.text();
          console.log(`[Ninja Form AJAX Response] ${res.status()}:`, txt.slice(0, 300));
        } catch (_) {}
      }
    });

    await page.goto('https://tampabrass.com/contact/', { waitUntil: 'domcontentloaded', timeout: 35000 });
    // Wait for Ninja Forms to render
    await page.waitForSelector('.nf-form-content, .ninja-forms-form', { timeout: 15000 }).catch(() => null);
    await new Promise(r => setTimeout(r, 3000));

    const formState = await page.evaluate((prof) => {
      const nameInput = document.querySelector('input[id*="nf-field-5"], input[name*="name"]');
      const emailInput = document.querySelector('input[id*="nf-field-6"], input[type="email"]');
      const msgInput = document.querySelector('textarea[id*="nf-field-7"], textarea[name*="message"]');
      const submitBtn = document.querySelector('input[id*="nf-field-8"], input[type="submit"], button.ninja-forms-field');

      if (nameInput) {
        nameInput.value = prof.fullName;
        nameInput.dispatchEvent(new Event('input', { bubbles: true }));
        nameInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
      if (emailInput) {
        emailInput.value = prof.email;
        emailInput.dispatchEvent(new Event('input', { bubbles: true }));
        emailInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
      if (msgInput) {
        msgInput.value = prof.message;
        msgInput.dispatchEvent(new Event('input', { bubbles: true }));
        msgInput.dispatchEvent(new Event('change', { bubbles: true }));
      }

      return {
        hasName: !!nameInput,
        hasEmail: !!emailInput,
        hasMsg: !!msgInput,
        hasBtn: !!submitBtn,
        btnId: submitBtn?.id,
        btnType: submitBtn?.type
      };
    }, PROFILE);

    console.log('Tampa Brass form elements:', formState);

    await new Promise(r => setTimeout(r, 1000));

    // Click submit button in evaluate or through dispatch
    console.log('Clicking Ninja Forms submit...');
    await page.evaluate(() => {
      const submitBtn = document.querySelector('input[id*="nf-field-8"], input[type="submit"].ninja-forms-field, .ninja-forms-field[type="submit"], input[value="Submit"]');
      if (submitBtn) {
        submitBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
        submitBtn.click();
      }
    });

    await new Promise(r => setTimeout(r, 6000));

    const result = await page.evaluate(() => {
      const responseMsg = document.querySelector('.nf-response-msg')?.innerText?.trim();
      const body = document.body.innerText;
      return {
        responseMsg,
        hasSuccess: /thank you|received|sent|success|we will be in touch/i.test(responseMsg || body)
      };
    });

    console.log('Tampa Brass result:', result);
    if (result.hasSuccess && result.responseMsg) {
      recordSuccess(4881, `Contact form: https://tampabrass.com/contact/ (Autofilled & verified: "${result.responseMsg}")`);
    }
  } catch (e) {
    console.error('Error on #4881:', e.message);
  } finally {
    await page.close();
  }
}

// 3. Test T L Sheet Metal #4882
async function testTLSheetMetal(browser) {
  console.log('\n========================================');
  console.log('Testing Lead #4882: T L Sheet Metal (Divi form)');
  const page = await browser.newPage();
  try {
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    page.on('response', async res => {
      if (res.request().method() === 'POST') {
        try {
          const txt = await res.text();
          console.log(`[POST Response] ${res.status()} ${res.url()}:`, txt.slice(0, 200));
        } catch (_) {}
      }
    });

    await page.goto('https://www.tlsheetmetal.com/contact-us/', { waitUntil: 'domcontentloaded', timeout: 35000 });
    await new Promise(r => setTimeout(r, 3000));

    // Check Divi captcha and form fields
    const formInfo = await page.evaluate((prof) => {
      const nameInput = document.querySelector('#et_pb_contact_name_0');
      const emailInput = document.querySelector('#et_pb_contact_email_0');
      const msgInput = document.querySelector('#et_pb_contact_mess_0');
      const captchaInput = document.querySelector('input.input.et_pb_contact_captcha');
      const captchaSpan = document.querySelector('.et_pb_contact_captcha');

      let mathAns = null;
      if (captchaSpan) {
        const d1 = parseInt(captchaSpan.getAttribute('data-first_digit') || '0', 10);
        const d2 = parseInt(captchaSpan.getAttribute('data-second_digit') || '0', 10);
        mathAns = d1 + d2;
      }

      if (nameInput) nameInput.value = prof.fullName;
      if (emailInput) emailInput.value = prof.email;
      if (msgInput) msgInput.value = prof.message;
      if (captchaInput && mathAns !== null) captchaInput.value = String(mathAns);

      const form = document.querySelector('form.et_pb_contact_form');
      return {
        hasName: !!nameInput,
        hasEmail: !!emailInput,
        hasMsg: !!msgInput,
        mathAns,
        action: form?.action
      };
    }, PROFILE);

    console.log('Divi form info:', formInfo);
    await new Promise(r => setTimeout(r, 1000));

    console.log('Submitting Divi form via submit button click...');
    await page.evaluate(() => {
      const btn = document.querySelector('form.et_pb_contact_form button[type="submit"], .et_pb_contact_submit');
      if (btn) btn.click();
    });

    await new Promise(r => setTimeout(r, 6000));

    const result = await page.evaluate(() => {
      const msg = document.querySelector('.et-pb-contact-message');
      const formText = document.querySelector('.et_pb_contact_form')?.innerText;
      return {
        msgText: msg?.innerText?.trim(),
        formText: formText?.slice(0, 200)
      };
    });

    console.log('T L Sheet Metal result:', result);
    if (result.msgText && /thanks|thank you|message sent/i.test(result.msgText)) {
      recordSuccess(4882, `Contact form: https://www.tlsheetmetal.com/contact-us/ (Autofilled & verified: "${result.msgText}")`);
    }
  } catch (e) {
    console.error('Error on #4882:', e.message);
  } finally {
    await page.close();
  }
}

async function run() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,900']
  });

  await testTampaWelders(browser);
  await testTampaBrass(browser);
  await testTLSheetMetal(browser);

  await browser.close();
}

run();
