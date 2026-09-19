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
  message: 'Hello, I am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects. Thank you. Sincerely, Pamela Jameson'
};

async function testTappouni() {
  const browser = await puppeteer.launch({ executablePath: CHROME_BIN, headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();

  await page.goto('https://tappounimechanical.com/contact/', { waitUntil: 'domcontentloaded', timeout: 30000 });

  await page.type('#input_2_1_3', PROFILE.firstName);
  await page.type('#input_2_1_6', PROFILE.lastName);
  await page.type('#input_2_3', PROFILE.phone);
  await page.type('#input_2_4', PROFILE.email);
  if (await page.$('#input_2_8')) {
    await page.type('#input_2_8', PROFILE.company);
  }
  await page.type('#input_2_6', PROFILE.message);

  console.log('Clicking gform_submit_button_2...');
  await page.click('#gform_submit_button_2');

  await new Promise(r => setTimeout(r, 8000));

  const result = await page.evaluate(() => {
    const confirmation = document.querySelector('.gform_confirmation_message, .gforms_confirmation_message');
    const validationError = document.querySelector('.gform_validation_errors, .validation_error');
    return {
      confirmation: confirmation ? confirmation.innerText : null,
      validationError: validationError ? validationError.innerText : null,
      url: window.location.href,
      bodySnippets: document.body.innerText.split('\n').filter(s => s.toLowerCase().includes('thank') || s.toLowerCase().includes('received') || s.toLowerCase().includes('error')).slice(0, 5)
    };
  });

  console.log('Tappouni Result:', JSON.stringify(result, null, 2));

  if (result.confirmation || (result.bodySnippets && result.bodySnippets.some(s => s.toLowerCase().includes('thank')))) {
    console.log('CONFIRMED ON TAPPOUNI!');
    const note = 'Confirmed: Gravity Form submission successful - ' + (result.confirmation || result.bodySnippets.join('; ')).trim();
    db.prepare('UPDATE leads SET status = ?, notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 3855').run('contacted', note);
    db.prepare('INSERT INTO contact_logs (lead_id, action, notes, created_at) VALUES (3855, "sent", ?, CURRENT_TIMESTAMP)').run(note);
  }

  await browser.close();
}

testTappouni();
