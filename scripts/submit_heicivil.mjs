import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';
import db from './db.mjs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const OUTREACH = {
  first: 'Pamela',
  last: 'Jameson',
  name: 'Pamela Jameson',
  email: 'pamela.jameson@nortiheastprecision.com',
  phone: '708-568-3708',
  company: 'Northeast Precision Machinery, Inc.',
  message: 'Hello, I am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects. Thank you for your time and attention.'
};

async function submitHeiCivil() {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: CHROME_BIN,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

  console.log('Navigating to HEI Civil...');
  await page.goto('https://heicivil.com/contact/', { waitUntil: 'networkidle2', timeout: 30000 });

  const fillResult = await page.evaluate((profile) => {
    // Location
    const locSelect = document.querySelector('select#input_1_1');
    if (locSelect) {
      locSelect.value = 'Texas - Austin';
      locSelect.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // Department
    const deptSelect = document.querySelector('select#input_1_3');
    if (deptSelect) {
      deptSelect.value = 'General Inquiry';
      deptSelect.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // Name
    const firstName = document.querySelector('input#input_1_4_3');
    if (firstName) {
      firstName.value = profile.first;
      firstName.dispatchEvent(new Event('input', { bubbles: true }));
    }

    const lastName = document.querySelector('input#input_1_4_6');
    if (lastName) {
      lastName.value = profile.last;
      lastName.dispatchEvent(new Event('input', { bubbles: true }));
    }

    const title = document.querySelector('input#input_1_4_8');
    if (title) {
      title.value = 'Representative';
      title.dispatchEvent(new Event('input', { bubbles: true }));
    }

    // Phone
    const phone = document.querySelector('input#input_1_5');
    if (phone) {
      phone.value = profile.phone;
      phone.dispatchEvent(new Event('input', { bubbles: true }));
    }

    // Email
    const email = document.querySelector('input#input_1_6');
    if (email) {
      email.value = profile.email;
      email.dispatchEvent(new Event('input', { bubbles: true }));
    }

    // Company
    const comp = document.querySelector('input#input_1_7');
    if (comp) {
      comp.value = profile.company;
      comp.dispatchEvent(new Event('input', { bubbles: true }));
    }

    // Message
    const msg = document.querySelector('textarea#input_1_8');
    if (msg) {
      msg.value = profile.message;
      msg.dispatchEvent(new Event('input', { bubbles: true }));
    }

    // Click submit
    const submitBtn = document.querySelector('#gform_submit_button_1');
    if (submitBtn) {
      submitBtn.click();
      return { success: true };
    }
    return { success: false };
  }, OUTREACH);

  console.log('Fill & submit result:', fillResult);

  // Wait 10 seconds for submission completion
  await new Promise(r => setTimeout(r, 10000));

  const postResult = await page.evaluate(() => {
    const conf = document.querySelector('.gform_confirmation_message, .gforms_confirmation_message, #gform_confirmation_message_1')?.innerText;
    const errors = document.querySelector('.gform_validation_errors, .validation_error, .gfield_description.validation_message')?.innerText;
    const body = document.body.innerText;
    return {
      conf,
      errors,
      url: window.location.href,
      snippet: body.substring(0, 800)
    };
  });

  console.log('Post submission result:', postResult);

  if (postResult.conf || (postResult.snippet && /thank you|received your message|thanks for contacting/i.test(postResult.snippet))) {
    console.log('SUCCESS: HEI Civil form successfully submitted and confirmed!');
    const note = `Gravity Forms submitted and confirmed. Confirmation: "${postResult.conf || 'Thank you message displayed'}"`;
    const leadId = 3529;
    const current = db.prepare('SELECT notes FROM leads WHERE id = ?').get(leadId);
    const newNotes = current?.notes ? current.notes + ' | ' + note : note;
    db.prepare('UPDATE leads SET notes = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newNotes, 'contacted', leadId);
    db.prepare('INSERT INTO contact_logs (lead_id, action, notes, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)').run(leadId, 'sent', note);
    console.log('Updated database for Lead #3529 to contacted!');
  } else {
    console.log('Submission did not produce clear confirmation');
  }

  await page.close();
  await browser.close();
}

submitHeiCivil();
