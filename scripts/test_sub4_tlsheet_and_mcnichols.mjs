import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import db from './db.mjs';

puppeteer.use(StealthPlugin());
const CHROME_BIN = '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

const PROFILE = {
  fullName: 'Pamela Jameson',
  firstName: 'Pamela',
  lastName: 'Jameson',
  email: 'pamela.jameson@nortiheastprecision.com',
  phone: '708-568-3708',
  company: 'Northeast Precision Machinery, Inc.',
  message: 'Hello, I am reaching out to express our interest in your metal fabrication services. We would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, capabilities, and upcoming project quotes. Thank you!'
};

function recordSuccess(leadId, note) {
  console.log(`\n>>> [SUCCESS RECORDED] #${leadId}: ${note}\n`);
  db.prepare("UPDATE leads SET status = 'contacted', notes = notes || ? WHERE id = ?")
    .run(' | ' + note, leadId);
  db.prepare("INSERT INTO contact_logs (lead_id, action, notes, created_at) VALUES (?, 'sent', ?, CURRENT_TIMESTAMP)")
    .run(leadId, note);
}

// 1. T L Sheet Metal in headed mode
async function testTLSheetMetalHeaded() {
  console.log('\n========================================');
  console.log('Testing Lead #4882: T L Sheet Metal (Headed mode with human typing)');
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,900']
  });

  const page = await browser.newPage();
  try {
    page.on('response', async res => {
      if (res.request().method() === 'POST') {
        console.log(`[POST response] ${res.status()} ${res.url()}`);
      }
    });

    await page.goto('https://www.tlsheetmetal.com/contact-us/', { waitUntil: 'domcontentloaded', timeout: 35000 });
    await new Promise(r => setTimeout(r, 3000));

    // Scroll to form
    await page.evaluate(() => {
      document.querySelector('form.et_pb_contact_form')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    await new Promise(r => setTimeout(r, 1000));

    // Type with keyboard events
    await page.click('#et_pb_contact_name_0');
    await page.type('#et_pb_contact_name_0', PROFILE.fullName, { delay: 30 });

    await page.click('#et_pb_contact_email_0');
    await page.type('#et_pb_contact_email_0', PROFILE.email, { delay: 30 });

    await page.click('#et_pb_contact_mess_0');
    await page.type('#et_pb_contact_mess_0', PROFILE.message, { delay: 15 });

    await new Promise(r => setTimeout(r, 1000));

    console.log('Clicking Submit button on TL Sheet Metal...');
    await page.click('form.et_pb_contact_form button[type="submit"]');

    await new Promise(r => setTimeout(r, 6000));

    const result = await page.evaluate(() => {
      const msg = document.querySelector('.et-pb-contact-message');
      const form = document.querySelector('form.et_pb_contact_form');
      return {
        msgText: msg ? msg.innerText.trim() : null,
        formInner: form ? form.innerText.slice(0, 300) : null,
        bodyText: document.body.innerText.slice(0, 500)
      };
    });

    console.log('TL Sheet Metal Result:', result);
    if (result.msgText && /thanks|thank you|message sent/i.test(result.msgText)) {
      recordSuccess(4882, `Contact form: https://www.tlsheetmetal.com/contact-us/ (Autofilled & verified: "${result.msgText}")`);
    } else {
      console.log('TL Sheet Metal did not show success message');
    }
  } catch (e) {
    console.error('Error on #4882:', e.message);
  } finally {
    await browser.close();
  }
}

// 2. McNICHOLS CO.
async function testMcNichols() {
  console.log('\n========================================');
  console.log('Testing Lead #4885: McNICHOLS CO.');
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,900']
  });

  const page = await browser.newPage();
  try {
    await page.goto('https://www.mcnichols.com/quote-request', { waitUntil: 'domcontentloaded', timeout: 35000 });
    await new Promise(r => setTimeout(r, 3000));

    console.log(`Loaded McNICHOLS quote page: ${page.url()} | Title: ${await page.title()}`);

    const info = await page.evaluate(() => {
      const turnstile = document.querySelector('.cf-turnstile, iframe[src*="turnstile"], iframe[src*="cloudflare"]');
      const forms = Array.from(document.querySelectorAll('form')).map(f => ({
        id: f.id,
        action: f.action,
        className: f.className
      }));
      return {
        hasTurnstile: !!turnstile,
        forms
      };
    });

    console.log('McNICHOLS form info:', info);
  } catch (e) {
    console.error('Error on #4885:', e.message);
  } finally {
    await browser.close();
  }
}

async function run() {
  await testTLSheetMetalHeaded();
  await testMcNichols();
}

run();
