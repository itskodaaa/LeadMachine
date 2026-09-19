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
  console.log(`[SUCCESS RECORDED] #${leadId}: ${note}`);
  db.prepare("UPDATE leads SET status = 'contacted', notes = notes || ? WHERE id = ?")
    .run(' | ' + note, leadId);
  db.prepare("INSERT INTO contact_logs (lead_id, action, notes, created_at) VALUES (?, 'sent', ?, CURRENT_TIMESTAMP)")
    .run(leadId, note);
}

function recordFailure(leadId, note) {
  console.log(`[FAILURE/STATUS RECORDED] #${leadId}: ${note}`);
  db.prepare("UPDATE leads SET status = 'unable_to_reach', notes = notes || ? WHERE id = ?")
    .run(' | ' + note, leadId);
  db.prepare("INSERT INTO contact_logs (lead_id, action, notes, created_at) VALUES (?, 'bounced', ?, CURRENT_TIMESTAMP)")
    .run(leadId, note);
}

// 1. Lead 4882: T L Sheet Metal (Divi form on /contact-us/)
async function testTLSheetMetal(browser) {
  console.log('\n========================================');
  console.log('Testing Lead #4882: T L Sheet Metal');
  const page = await browser.newPage();
  try {
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1280, height: 900 });

    await page.goto('https://www.tlsheetmetal.com/contact-us/', { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));

    // Fill form fields
    await page.type('#et_pb_contact_name_0', PROFILE.fullName, { delay: 20 });
    await page.type('#et_pb_contact_email_0', PROFILE.email, { delay: 20 });
    await page.type('#et_pb_contact_mess_0', PROFILE.message, { delay: 10 });

    // Check if there's a captcha question (Divi sometimes has basic math captcha like "5 + 2 = ?")
    const captchaField = await page.$('.et_pb_contact_captcha');
    if (captchaField) {
      console.log('Divi math captcha detected, solving...');
      const mathText = await page.evaluate(el => el.getAttribute('data-first_digit') + ' + ' + el.getAttribute('data-second_digit'), captchaField);
      console.log('Math question:', mathText);
      const answer = await page.evaluate(() => {
        const c = document.querySelector('.et_pb_contact_captcha');
        const d1 = parseInt(c.getAttribute('data-first_digit') || '0', 10);
        const d2 = parseInt(c.getAttribute('data-second_digit') || '0', 10);
        return d1 + d2;
      });
      console.log('Answer:', answer);
      const input = await page.$('input.input.et_pb_contact_captcha');
      if (input) {
        await input.type(String(answer));
      }
    }

    console.log('Submitting Divi contact form...');
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => null),
      page.evaluate(() => {
        const btn = document.querySelector('form.et_pb_contact_form button[type="submit"], form.et_pb_contact_form .et_pb_contact_submit');
        if (btn) btn.click();
      })
    ]);

    await new Promise(r => setTimeout(r, 4000));

    const result = await page.evaluate(() => {
      const formContainer = document.querySelector('.et_pb_contact_form, .et-pb-contact-message');
      const text = formContainer ? formContainer.innerText : document.body.innerText;
      return {
        text: text.slice(0, 300),
        hasSuccess: /thanks for contacting us|thanks for reaching out|message has been sent|thank you/i.test(text),
        hasError: /please, fill in the following fields|make sure you fill in all required fields|error/i.test(text)
      };
    });

    console.log('Result #4882:', result);
    if (result.hasSuccess) {
      recordSuccess(4882, `Contact form: https://www.tlsheetmetal.com/contact-us/ (Autofilled & verified: "${result.text.trim().replace(/\s+/g, ' ')}")`);
    } else {
      console.log('Checking page text for confirmation...');
      const fullText = await page.evaluate(() => document.body.innerText);
      if (/thanks for contacting us|message sent|thank you/i.test(fullText)) {
        recordSuccess(4882, `Contact form: https://www.tlsheetmetal.com/contact-us/ (Autofilled & verified: message received)`);
      } else {
        console.log('No confirmation found. Text snippet:', fullText.slice(0, 300));
      }
    }
  } catch (e) {
    console.error('Error on 4882:', e.message);
  } finally {
    await page.close();
  }
}

// 2. Lead 4881: Tampa Brass & Aluminum Corporation (Ninja Forms on /contact/)
async function testTampaBrass(browser) {
  console.log('\n========================================');
  console.log('Testing Lead #4881: Tampa Brass & Aluminum Corporation');
  const page = await browser.newPage();
  try {
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1280, height: 900 });

    page.on('response', async res => {
      if (res.url().includes('admin-ajax.php') || res.url().includes('ninja-forms')) {
        try {
          const txt = await res.text();
          console.log(`[Ninja Form Response] ${res.status()}: ${txt.slice(0, 200)}`);
        } catch (_) {}
      }
    });

    await page.goto('https://tampabrass.com/contact/', { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));

    // Check Ninja Forms fields
    const nfFields = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('.nf-field-element input, .nf-field-element textarea, .nf-field-element select'));
      return inputs.map(i => ({
        id: i.id,
        name: i.name,
        type: i.type,
        placeholder: i.placeholder,
        label: i.closest('.nf-field')?.querySelector('.nf-field-label')?.innerText?.trim()
      }));
    });
    console.log('Ninja Forms fields on Tampa Brass:', nfFields);

    // Fill fields
    const nameField = nfFields.find(f => /name/i.test(f.label || '')) || nfFields.find(f => f.id === 'nf-field-5');
    if (nameField) {
      await page.click('#' + nameField.id);
      await page.type('#' + nameField.id, PROFILE.fullName, { delay: 20 });
    }

    const emailField = nfFields.find(f => /email/i.test(f.label || '') || f.type === 'email') || nfFields.find(f => f.id === 'nf-field-6');
    if (emailField) {
      await page.click('#' + emailField.id);
      await page.type('#' + emailField.id, PROFILE.email, { delay: 20 });
    }

    const msgField = nfFields.find(f => /message|comments/i.test(f.label || '') || f.type === 'textarea') || nfFields.find(f => f.id === 'nf-field-7');
    if (msgField) {
      await page.click('#' + msgField.id);
      await page.type('#' + msgField.id, PROFILE.message, { delay: 10 });
    }

    console.log('Submitting Tampa Brass Ninja Form...');
    await page.evaluate(() => {
      const btn = document.querySelector('#nf-field-8, input[type="submit"].ninja-forms-field, button.ninja-forms-field');
      if (btn) btn.click();
    });

    await new Promise(r => setTimeout(r, 5000));

    const result = await page.evaluate(() => {
      const responseMsg = document.querySelector('.nf-response-msg')?.innerText?.trim();
      const body = document.body.innerText;
      return {
        responseMsg,
        hasSuccess: /thank you|your form has been submitted|message sent|we will be in touch/i.test(responseMsg || body)
      };
    });

    console.log('Result #4881:', result);
    if (result.hasSuccess) {
      recordSuccess(4881, `Contact form: https://tampabrass.com/contact/ (Autofilled & verified: "${result.responseMsg || 'Form submitted successfully'}")`);
    } else {
      console.log('Tampa brass response was not explicitly confirmed');
    }
  } catch (e) {
    console.error('Error on 4881:', e.message);
  } finally {
    await page.close();
  }
}

// 3. Lead 4887: Florida Metals (Elementor form on /contact-us/)
async function testFloridaMetals(browser) {
  console.log('\n========================================');
  console.log('Testing Lead #4887: Florida Metals');
  const page = await browser.newPage();
  try {
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1280, height: 900 });

    page.on('response', async res => {
      if (res.url().includes('admin-ajax.php')) {
        try {
          const txt = await res.text();
          console.log(`[Elementor AJAX Response] ${res.status()}: ${txt.slice(0, 300)}`);
        } catch (_) {}
      }
    });

    await page.goto('https://fltin.com/contact-us/', { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));

    // Fill fields
    await page.type('#form-field-name', PROFILE.fullName, { delay: 20 });
    await page.type('#form-field-field_afaa124', PROFILE.phone, { delay: 20 });
    await page.type('#form-field-email', PROFILE.email, { delay: 20 });
    await page.type('#form-field-message', PROFILE.message, { delay: 10 });
    await page.type('#form-field-field_6fc0051', 'Online Search', { delay: 20 });

    console.log('Submitting Florida Metals form...');
    await page.evaluate(() => {
      const btn = document.querySelector('.elementor-form button[type="submit"]');
      if (btn) btn.click();
    });

    await new Promise(r => setTimeout(r, 6000));

    const result = await page.evaluate(() => {
      const successBox = document.querySelector('.elementor-message-success, .elementor-message');
      return {
        boxText: successBox ? successBox.innerText : null,
        html: successBox ? successBox.outerHTML : null
      };
    });

    console.log('Result #4887:', result);
    if (result.boxText && /sent|success|thank/i.test(result.boxText)) {
      recordSuccess(4887, `Contact form: https://fltin.com/contact-us/ (Autofilled & verified: "${result.boxText.trim()}")`);
    } else {
      console.log('CleanTalk or other filter may have flagged or responded:', result);
    }
  } catch (e) {
    console.error('Error on 4887:', e.message);
  } finally {
    await page.close();
  }
}

async function main() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,900']
  });

  await testTLSheetMetal(browser);
  await testTampaBrass(browser);
  await testFloridaMetals(browser);

  await browser.close();
}

main();
