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
  message: 'Hello,\n\nI am reaching out to express our interest in your metal fabrication and welding services. We would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, capabilities, pricing, and possible collaboration on upcoming projects.\n\nThank you for your time and attention.\n\nSincerely,\nPamela Jameson'
};

function recordSuccess(leadId, note) {
  console.log(`\n>>> [SUCCESS RECORDED] #${leadId}: ${note}\n`);
  db.prepare("UPDATE leads SET status = 'contacted', notes = notes || ? WHERE id = ?")
    .run(' | ' + note, leadId);
  db.prepare("INSERT INTO contact_logs (lead_id, action, notes, created_at) VALUES (?, 'sent', ?, CURRENT_TIMESTAMP)")
    .run(leadId, note);
}

function updateLeadNote(leadId, status, note) {
  console.log(`\n>>> [STATUS RECORDED] #${leadId} (${status}): ${note}\n`);
  db.prepare("UPDATE leads SET status = ?, notes = notes || ? WHERE id = ?")
    .run(status, ' | ' + note, leadId);
  db.prepare("INSERT INTO contact_logs (lead_id, action, notes, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)")
    .run(leadId, status === 'contacted' ? 'sent' : 'bounced', note);
}

async function runTests() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,900']
  });

  // 1. #4882: T L Sheet Metal
  console.log('\n========================================');
  console.log('Testing Lead #4882: T L Sheet Metal (Divi form)');
  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.goto('https://www.tlsheetmetal.com/contact-us/', { waitUntil: 'domcontentloaded', timeout: 35000 });
    await new Promise(r => setTimeout(r, 3000));

    await page.type('#et_pb_contact_name_0', PROFILE.fullName, { delay: 10 });
    await page.type('#et_pb_contact_email_0', PROFILE.email, { delay: 10 });
    await page.type('#et_pb_contact_mess_0', PROFILE.message, { delay: 5 });

    // Check captcha
    const mathInput = await page.$('input.input.et_pb_contact_captcha');
    if (mathInput) {
      const answer = await page.evaluate(() => {
        const c = document.querySelector('.et_pb_contact_captcha');
        const d1 = parseInt(c?.getAttribute('data-first_digit') || '0', 10);
        const d2 = parseInt(c?.getAttribute('data-second_digit') || '0', 10);
        return d1 + d2;
      });
      console.log('Divi Math captcha answer:', answer);
      await mathInput.type(String(answer));
    }

    console.log('Submitting Divi form...');
    const submitBtn = await page.$('form.et_pb_contact_form button[type="submit"], form.et_pb_contact_form .et_pb_contact_submit');
    if (submitBtn) {
      await submitBtn.click();
    }

    await new Promise(r => setTimeout(r, 6000));

    const diviResult = await page.evaluate(() => {
      const msg = document.querySelector('.et-pb-contact-message, .et_pb_contact_form');
      const text = msg ? msg.innerText : document.body.innerText;
      return { text: text.slice(0, 300) };
    });
    console.log('#4882 result text:', diviResult.text);

    if (/thanks for contacting us|message has been sent|thank you/i.test(diviResult.text)) {
      recordSuccess(4882, `Contact form: https://www.tlsheetmetal.com/contact-us/ (Autofilled & verified: "${diviResult.text.trim().replace(/\s+/g, ' ')}")`);
    } else {
      console.log('Divi form did not show confirmation.');
    }
    await page.close();
  } catch (e) {
    console.error('Error on #4882:', e.message);
  }

  // 2. #4880: Alloy Fabricators, Inc.
  console.log('\n========================================');
  console.log('Testing Lead #4880: Alloy Fabricators, Inc. (witsec mailform)');
  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    page.on('response', async res => {
      if (res.url().includes('mail.php')) {
        try {
          const txt = await res.text();
          console.log(`[Alloy mail.php Response] ${res.status()}:`, txt);
        } catch (_) {}
      }
    });

    await page.goto('https://alloyfabinc.com/', { waitUntil: 'domcontentloaded', timeout: 35000 });
    await new Promise(r => setTimeout(r, 3000));

    await page.type('input[name="name"]', PROFILE.fullName, { delay: 10 });
    await page.type('input[name="email"]', PROFILE.email, { delay: 10 });
    await page.type('input[name="phone"]', PROFILE.phone, { delay: 10 });
    await page.type('textarea[name="message"]', PROFILE.message, { delay: 5 });

    console.log('Submitting Alloy Fabricators form...');
    await page.evaluate(() => {
      const btn = document.querySelector('form.mbr-form button[type="submit"]');
      if (btn) btn.click();
    });

    await new Promise(r => setTimeout(r, 5000));

    const alloyResult = await page.evaluate(() => {
      const successEl = document.querySelector('.alert-success');
      const dangerEl = document.querySelector('.alert-danger');
      return {
        successHidden: successEl ? successEl.hidden || successEl.getAttribute('hidden') !== null : null,
        successText: successEl ? successEl.innerText : null,
        dangerHidden: dangerEl ? dangerEl.hidden || dangerEl.getAttribute('hidden') !== null : null,
        dangerText: dangerEl ? dangerEl.innerText : null
      };
    });
    console.log('#4880 result:', alloyResult);

    if (alloyResult.successText && alloyResult.successHidden === false) {
      recordSuccess(4880, `Contact form: https://alloyfabinc.com/ (Autofilled & verified: "${alloyResult.successText.trim()}")`);
    } else if (alloyResult.dangerHidden === false) {
      console.log('Alloy form error:', alloyResult.dangerText);
      updateLeadNote(4880, 'unable_to_reach', `Contact form: https://alloyfabinc.com/ (Submission rejected by server: ${alloyResult.dangerText})`);
    }
    await page.close();
  } catch (e) {
    console.error('Error on #4880:', e.message);
  }

  // 3. #4881: Tampa Brass & Aluminum Corporation
  console.log('\n========================================');
  console.log('Testing Lead #4881: Tampa Brass & Aluminum Corporation (Ninja Forms)');
  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    page.on('response', async res => {
      if (res.url().includes('admin-ajax.php')) {
        try {
          const txt = await res.text();
          console.log(`[Tampa Brass AJAX Response] ${res.status()}:`, txt.slice(0, 300));
        } catch (_) {}
      }
    });

    await page.goto('https://tampabrass.com/contact/', { waitUntil: 'domcontentloaded', timeout: 35000 });
    await new Promise(r => setTimeout(r, 4000));

    // Fill fields
    await page.type('#nf-field-5', PROFILE.fullName, { delay: 10 });
    await page.type('#nf-field-6', PROFILE.email, { delay: 10 });
    await page.type('#nf-field-7', PROFILE.message, { delay: 5 });

    console.log('Submitting Ninja Form on Tampa Brass...');
    await page.click('#nf-field-8');

    await new Promise(r => setTimeout(r, 6000));

    const tbResult = await page.evaluate(() => {
      const msg = document.querySelector('.nf-response-msg, .nf-msg');
      return {
        msgText: msg ? msg.innerText : null,
        bodyText: document.body.innerText.slice(0, 400)
      };
    });
    console.log('#4881 result:', tbResult);

    if (tbResult.msgText && /thank|received|sent|success/i.test(tbResult.msgText)) {
      recordSuccess(4881, `Contact form: https://tampabrass.com/contact/ (Autofilled & verified: "${tbResult.msgText.trim()}")`);
    } else {
      console.log('Tampa brass response:', tbResult);
    }
    await page.close();
  } catch (e) {
    console.error('Error on #4881:', e.message);
  }

  // 4. #4887: Florida Metals
  console.log('\n========================================');
  console.log('Testing Lead #4887: Florida Metals (Elementor form)');
  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    page.on('response', async res => {
      if (res.url().includes('admin-ajax.php')) {
        try {
          const txt = await res.text();
          console.log(`[Florida Metals AJAX Response] ${res.status()}:`, txt.slice(0, 300));
        } catch (_) {}
      }
    });

    await page.goto('https://fltin.com/contact-us/', { waitUntil: 'domcontentloaded', timeout: 35000 });
    await new Promise(r => setTimeout(r, 3000));

    await page.type('#form-field-name', PROFILE.fullName, { delay: 10 });
    await page.type('#form-field-field_afaa124', PROFILE.phone, { delay: 10 });
    await page.type('#form-field-email', PROFILE.email, { delay: 10 });
    await page.type('#form-field-message', PROFILE.message, { delay: 5 });
    await page.type('#form-field-field_6fc0051', 'Direct Website', { delay: 10 });

    console.log('Submitting Elementor form on Florida Metals...');
    await page.click('.elementor-form button[type="submit"]');

    await new Promise(r => setTimeout(r, 6000));

    const flResult = await page.evaluate(() => {
      const msgBox = document.querySelector('.elementor-message');
      return {
        boxText: msgBox ? msgBox.innerText : null,
        boxClass: msgBox ? msgBox.className : null
      };
    });
    console.log('#4887 result:', flResult);

    if (flResult.boxText && /sent|success|thank/i.test(flResult.boxText)) {
      recordSuccess(4887, `Contact form: https://fltin.com/contact-us/ (Autofilled & verified: "${flResult.boxText.trim()}")`);
    } else if (flResult.boxText) {
      console.log('CleanTalk or other message:', flResult.boxText);
      updateLeadNote(4887, 'unable_to_reach', `Contact form: https://fltin.com/contact-us/ (Server response: ${flResult.boxText.trim()})`);
    }
    await page.close();
  } catch (e) {
    console.error('Error on #4887:', e.message);
  }

  // 5. #4878: Contractor Metal Works
  console.log('\n========================================');
  console.log('Testing Lead #4878: Contractor Metal Works (GoDaddy form)');
  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    page.on('response', async res => {
      const u = res.url();
      if (u.includes('contact') || u.includes('messages') || u.includes('email') || u.includes('form')) {
        try {
          const txt = await res.text();
          console.log(`[GoDaddy #4878 NET] ${res.status()} ${u.slice(0, 80)}:`, txt.slice(0, 200));
        } catch (_) {}
      }
    });

    await page.goto('https://contractormetalworks.com/', { waitUntil: 'domcontentloaded', timeout: 35000 });
    await new Promise(r => setTimeout(r, 3000));

    await page.evaluate(() => {
      const form = document.querySelector('form');
      if (form) form.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    await new Promise(r => setTimeout(r, 1000));

    const gdFields = await page.evaluate(() => {
      const form = document.querySelector('form');
      if (!form) return null;
      const inputs = Array.from(form.querySelectorAll('input[type="text"], input:not([type])')).filter(i => i.name !== '_app_id');
      return {
        input1Id: inputs[0]?.id,
        input2Id: inputs[1]?.id
      };
    });

    if (gdFields && gdFields.input1Id && gdFields.input2Id) {
      await page.type('#' + gdFields.input1Id, PROFILE.fullName, { delay: 10 });
      await page.type('#' + gdFields.input2Id, PROFILE.email, { delay: 10 });
      await page.type('form textarea', PROFILE.message, { delay: 5 });

      console.log('Submitting GoDaddy form on Contractor Metal Works...');
      await page.evaluate(() => {
        const btn = document.querySelector('form button[type="submit"], form button');
        if (btn) btn.click();
      });

      await new Promise(r => setTimeout(r, 6000));

      const gdResult = await page.evaluate(() => {
        const successMsg = Array.from(document.querySelectorAll('div, p, span, h2, h3, h4'))
          .map(el => el.innerText.trim())
          .find(txt => /thank you|we'll be in touch|message sent|thanks for reaching out|inquiry received/i.test(txt) && txt.length < 150);
        return { successMsg };
      });
      console.log('#4878 result:', gdResult);

      if (gdResult.successMsg) {
        recordSuccess(4878, `Contact form: https://contractormetalworks.com/ (Autofilled & verified: "${gdResult.successMsg}")`);
      }
    }
    await page.close();
  } catch (e) {
    console.error('Error on #4878:', e.message);
  }

  // 6. #4884: Tampa Welders
  console.log('\n========================================');
  console.log('Testing Lead #4884: Tampa Welders (GoDaddy form)');
  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    page.on('response', async res => {
      const u = res.url();
      if (u.includes('contact') || u.includes('messages') || u.includes('email') || u.includes('form')) {
        try {
          const txt = await res.text();
          console.log(`[GoDaddy #4884 NET] ${res.status()} ${u.slice(0, 80)}:`, txt.slice(0, 200));
        } catch (_) {}
      }
    });

    await page.goto('https://tampawelders.com/', { waitUntil: 'domcontentloaded', timeout: 35000 });
    await new Promise(r => setTimeout(r, 3000));

    await page.evaluate(() => {
      const form = document.querySelector('form');
      if (form) form.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    await new Promise(r => setTimeout(r, 1000));

    const twFields = await page.evaluate(() => {
      const form = document.querySelector('form');
      if (!form) return null;
      const inputs = Array.from(form.querySelectorAll('input[type="text"], input:not([type])')).filter(i => i.name !== '_app_id');
      return {
        input1Id: inputs[0]?.id,
        input2Id: inputs[1]?.id
      };
    });

    if (twFields && twFields.input1Id && twFields.input2Id) {
      await page.type('#' + twFields.input1Id, PROFILE.fullName, { delay: 10 });
      await page.type('#' + twFields.input2Id, PROFILE.email, { delay: 10 });
      await page.type('form textarea', PROFILE.message, { delay: 5 });

      console.log('Submitting GoDaddy form on Tampa Welders...');
      await page.evaluate(() => {
        const btn = document.querySelector('form button[type="submit"], form button');
        if (btn) btn.click();
      });

      await new Promise(r => setTimeout(r, 6000));

      const twResult = await page.evaluate(() => {
        const successMsg = Array.from(document.querySelectorAll('div, p, span, h2, h3, h4'))
          .map(el => el.innerText.trim())
          .find(txt => /thank you|we'll be in touch|message sent|thanks for reaching out|inquiry received/i.test(txt) && txt.length < 150);
        return { successMsg };
      });
      console.log('#4884 result:', twResult);

      if (twResult.successMsg) {
        recordSuccess(4884, `Contact form: https://tampawelders.com/ (Autofilled & verified: "${twResult.successMsg}")`);
      }
    }
    await page.close();
  } catch (e) {
    console.error('Error on #4884:', e.message);
  }

  await browser.close();
}

runTests();
