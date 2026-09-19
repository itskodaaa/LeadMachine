import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import db from './db.mjs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

const OUTREACH_PROFILE = {
  fullName: 'Pamela Jameson',
  email: 'pamela.jameson@nortiheastprecision.com',
  phone: '708-568-3708',
  company: 'Northeast Precision Machinery, Inc.',
  message: `Hello,

I am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects.

We look forward to your response and the possibility of working together.

Thank you for your time and attention.

Sincerely,
Pamela Jameson`
};

async function testGoDaddy(leadId, url) {
  console.log(`\n========================================`);
  console.log(`Testing Lead #${leadId} at ${url}...`);

  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--window-size=1280,800']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');

  await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

  // Scroll to contact form container
  await page.evaluate(() => {
    const container = document.querySelector('[data-aid="CONTACT_FORM_CONTAINER_REND"]');
    if (container) container.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
  await new Promise(r => setTimeout(r, 1000));

  const nameInput = await page.$('input[data-aid="CONTACT_FORM_NAME"]');
  const emailInput = await page.$('input[data-aid="CONTACT_FORM_EMAIL"]');
  const msgInput = await page.$('textarea[data-aid="CONTACT_FORM_MESSAGE"]');

  if (!nameInput || !emailInput || !msgInput) {
    console.log('Inputs not found on page.');
    await browser.close();
    return false;
  }

  // Focus and type slowly
  await nameInput.click();
  await page.keyboard.type(OUTREACH_PROFILE.fullName, { delay: 50 });

  await emailInput.click();
  await page.keyboard.type(OUTREACH_PROFILE.email, { delay: 50 });

  await msgInput.click();
  await page.keyboard.type(OUTREACH_PROFILE.message, { delay: 15 });

  await new Promise(r => setTimeout(r, 1000));

  const submitBtn = await page.$('button[data-aid="CONTACT_SUBMIT_BUTTON_REND"]');
  if (submitBtn) {
    console.log('Clicking submit...');
    await submitBtn.click();
  }

  await new Promise(r => setTimeout(r, 7000));

  const result = await page.evaluate(() => {
    const body = document.body ? document.body.innerText : '';
    const container = document.querySelector('[data-aid="CONTACT_FORM_CONTAINER_REND"]');
    const containerText = container ? container.innerText : '';
    const thankYou = containerText.toLowerCase().includes('thank you for reaching out') ||
                     containerText.toLowerCase().includes('we will be in touch') ||
                     containerText.toLowerCase().includes('message sent') ||
                     containerText.toLowerCase().includes('thank you');
    const hasError = containerText.toLowerCase().includes('please enter a valid email address');
    return { thankYou, hasError, containerText };
  });

  console.log('Result:', result);

  if (result.thankYou) {
    console.log(`SUCCESS on lead #${leadId}!`);
    const updateStmt = db.prepare('UPDATE leads SET notes = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
    const logStmt = db.prepare('INSERT INTO contact_logs (lead_id, action, notes, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)');
    const current = db.prepare('SELECT notes FROM leads WHERE id = ?').get(leadId);
    const note = `Contact form: ${url} (Autofilled & verified: ${result.containerText.slice(0, 100)})`;
    const newNotes = current?.notes ? current.notes + ' | ' + note : note;

    db.transaction(() => {
      updateStmt.run(newNotes, 'contacted', leadId);
      logStmt.run(leadId, 'sent', note);
    })();
  }

  await browser.close();
  return result.thankYou;
}

testGoDaddy(1847, 'https://psinternationalsupply.net/');
