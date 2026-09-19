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
  stateFull: 'Illinois',
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

function saveLeadResult(id, status, note) {
  const current = getStmt.get(id);
  const newNotes = current?.notes ? current.notes + ' | ' + note : note;
  db.transaction(() => {
    updateStmt.run(newNotes, status, id);
    const action = status === 'contacted' ? 'sent' : 'bounced';
    logStmt.run(id, action, note);
  })();
}

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
  'thank you for contacting tell steel',
  'thanks for submitting'
];

async function submitBrazenTek(browser) {
  const leadId = 4930;
  console.log('\n--- Processing Lead #4930: Brazen Tek ---');
  const page = await browser.newPage();
  try {
    await page.goto('https://www.brazentek.com/contacts/', { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Fill form
    await page.type('input[name="your-first-name"]', OUTREACH_PROFILE.firstName);
    await page.type('input[name="your-last-name"]', OUTREACH_PROFILE.lastName);
    await page.type('input[name="your-email"]', OUTREACH_PROFILE.email);
    await page.type('input[name="your-phone"]', OUTREACH_PROFILE.phone);
    await page.type('input[name="your-street"]', OUTREACH_PROFILE.address);
    await page.type('input[name="your-city"]', OUTREACH_PROFILE.city);
    await page.type('input[name="your-state"]', OUTREACH_PROFILE.state);
    await page.type('input[name="your-zip"]', OUTREACH_PROFILE.zip);
    await page.type('textarea[name="your-comment"]', OUTREACH_PROFILE.message);

    // Check contact-me if any
    const contactMe = await page.$('input[name="contact-me[]"]');
    if (contactMe) await contactMe.click();

    console.log('Filled form on Brazen Tek. Submitting...');
    const submitBtn = await page.$('input[type="submit"]');
    await Promise.all([
      page.waitForNavigation({ timeout: 15000 }).catch(() => null),
      submitBtn.click()
    ]);

    await new Promise(r => setTimeout(r, 4000));
    const bodyText = await page.evaluate(() => document.body.innerText.toLowerCase());
    const matched = SUCCESS_SIGNALS.find(s => bodyText.includes(s));
    
    if (matched || bodyText.includes('your message was sent successfully') || bodyText.includes('thank you')) {
      console.log(`✅ Brazen Tek verified: ${matched || 'thank you'}`);
      saveLeadResult(leadId, 'contacted', `Contact form: https://www.brazentek.com/contacts/ (Autofilled & verified: "${matched || 'confirmation'}")`);
    } else {
      console.log('Brazen Tek post-submit text snippet:', bodyText.slice(0, 300));
      saveLeadResult(leadId, 'unable_to_reach', 'Contact form: https://www.brazentek.com/contacts/ (Submitted but no explicit confirmation detected)');
    }
  } catch (err) {
    console.error('Error submitting Brazen Tek:', err.message);
    saveLeadResult(leadId, 'unable_to_reach', `Contact form: https://www.brazentek.com/contacts/ (Error: ${err.message})`);
  } finally {
    await page.close();
  }
}

async function submitTellSteel(browser) {
  const leadId = 4935;
  console.log('\n--- Processing Lead #4935: Tell Steel Inc ---');
  const page = await browser.newPage();
  try {
    await page.goto('https://www.tellsteel.com/contact', { waitUntil: 'networkidle2', timeout: 30000 });

    await page.type('input[name="firstname"]', OUTREACH_PROFILE.firstName);
    await page.type('input[name="lastname"]', OUTREACH_PROFILE.lastName);
    await page.type('input[name="company"]', OUTREACH_PROFILE.company);
    await page.type('input[name="address1"]', OUTREACH_PROFILE.address);
    await page.type('input[name="city"]', OUTREACH_PROFILE.city);
    await page.type('input[name="postal"]', OUTREACH_PROFILE.zip);
    await page.type('input[name="phone"]', OUTREACH_PROFILE.phone);
    await page.type('input[name="email"]', OUTREACH_PROFILE.email);
    await page.select('select[name="stateprovince"]', 'IL').catch(() => null);
    await page.type('textarea[name="message"]', OUTREACH_PROFILE.message);

    console.log('Filled Tell Steel contact form. Submitting...');
    const submitBtn = await page.$('input[type="submit"][value="Submit"]');
    await Promise.all([
      page.waitForNavigation({ timeout: 20000 }).catch(() => null),
      submitBtn.click()
    ]);

    await new Promise(r => setTimeout(r, 4000));
    const bodyText = await page.evaluate(() => document.body.innerText.toLowerCase());
    const matched = SUCCESS_SIGNALS.find(s => bodyText.includes(s));

    if (matched) {
      console.log(`✅ Tell Steel verified: ${matched}`);
      saveLeadResult(leadId, 'contacted', `Contact form: https://www.tellsteel.com/contact (Autofilled & verified: "${matched}")`);
    } else {
      console.log('Tell Steel post-submit text snippet:', bodyText.slice(0, 300));
      saveLeadResult(leadId, 'unable_to_reach', 'Contact form: https://www.tellsteel.com/contact (Submitted but no explicit confirmation detected)');
    }
  } catch (err) {
    console.error('Error submitting Tell Steel:', err.message);
    saveLeadResult(leadId, 'unable_to_reach', `Contact form: https://www.tellsteel.com/contact (Error: ${err.message})`);
  } finally {
    await page.close();
  }
}

async function submitM5Steel(browser) {
  const leadId = 4939;
  console.log('\n--- Processing Lead #4939: M5 Steel ---');
  const page = await browser.newPage();
  try {
    await page.goto('https://m5steel.com/quote.html', { waitUntil: 'networkidle2', timeout: 30000 });

    await page.type('#customer-name', OUTREACH_PROFILE.fullName);
    await page.type('#company-name', OUTREACH_PROFILE.company);
    await page.type('#customer-email', OUTREACH_PROFILE.email);
    await page.type('#customer-phone', OUTREACH_PROFILE.phone);
    await page.type('#project-name', OUTREACH_PROFILE.subject);
    await page.type('#project-location', `${OUTREACH_PROFILE.city}, ${OUTREACH_PROFILE.state}`);
    await page.type('#project-description', OUTREACH_PROFILE.message);

    // Click permission to contact checkbox
    const chk = await page.$('#contact-permission');
    if (chk) await chk.click();

    console.log('Filled M5 Steel quote form. Submitting...');
    const submitBtn = await page.$('button[type="submit"]');
    await Promise.all([
      page.waitForNavigation({ timeout: 20000 }).catch(() => null),
      submitBtn.click()
    ]);

    await new Promise(r => setTimeout(r, 4000));
    const url = page.url();
    const bodyText = await page.evaluate(() => document.body.innerText.toLowerCase());
    console.log('M5 Steel current URL:', url);
    const matched = SUCCESS_SIGNALS.find(s => bodyText.includes(s));

    if (matched || url.includes('formsubmit.co') || url.includes('thanks') || url.includes('thankyou')) {
      const confirmStr = matched || 'formsubmit redirect / confirmation';
      console.log(`✅ M5 Steel verified: ${confirmStr}`);
      saveLeadResult(leadId, 'contacted', `Contact form: https://m5steel.com/quote.html (Autofilled & verified: "${confirmStr}")`);
    } else {
      console.log('M5 Steel post-submit text snippet:', bodyText.slice(0, 300));
      saveLeadResult(leadId, 'unable_to_reach', 'Contact form: https://m5steel.com/quote.html (Submitted but no explicit confirmation detected)');
    }
  } catch (err) {
    console.error('Error submitting M5 Steel:', err.message);
    saveLeadResult(leadId, 'unable_to_reach', `Contact form: https://m5steel.com/quote.html (Error: ${err.message})`);
  } finally {
    await page.close();
  }
}

async function submitSdfab(browser) {
  const leadId = 4940;
  console.log('\n--- Processing Lead #4940: Superior Duct Fabrication ---');
  const page = await browser.newPage();
  try {
    await page.goto('https://www.sdfab.com/', { waitUntil: 'networkidle2', timeout: 30000 });

    const nameInput = await page.$('input[placeholder*="Name"]');
    const emailInput = await page.$('input[placeholder*="Email"]');
    const subjInput = await page.$('input[placeholder*="Subject"]');
    const msgInput = await page.$('textarea[placeholder*="Message"]');

    if (nameInput) await nameInput.type(OUTREACH_PROFILE.fullName);
    if (emailInput) await emailInput.type(OUTREACH_PROFILE.email);
    if (subjInput) await subjInput.type(OUTREACH_PROFILE.subject);
    if (msgInput) await msgInput.type(OUTREACH_PROFILE.message);

    console.log('Filled SDFab form. Submitting...');
    const submitBtn = await page.$('button[type="submit"]');
    if (submitBtn) {
      await submitBtn.click();
    }

    await new Promise(r => setTimeout(r, 6000));
    const bodyText = await page.evaluate(() => document.body.innerText.toLowerCase());
    const matched = SUCCESS_SIGNALS.find(s => bodyText.includes(s));

    if (matched) {
      console.log(`✅ SDFab verified: ${matched}`);
      saveLeadResult(leadId, 'contacted', `Contact form: https://www.sdfab.com/ (Autofilled & verified: "${matched}")`);
    } else {
      console.log('SDFab post-submit text snippet around form:', bodyText.slice(0, 300));
      saveLeadResult(leadId, 'unable_to_reach', 'Contact form: https://www.sdfab.com/ (Submitted but no explicit confirmation detected)');
    }
  } catch (err) {
    console.error('Error submitting SDFab:', err.message);
    saveLeadResult(leadId, 'unable_to_reach', `Contact form: https://www.sdfab.com/ (Error: ${err.message})`);
  } finally {
    await page.close();
  }
}

async function run() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    await submitBrazenTek(browser);
    await submitTellSteel(browser);
    await submitM5Steel(browser);
    await submitSdfab(browser);
  } finally {
    await browser.close();
  }
}

run();
