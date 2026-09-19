import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
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
  message: `Hello,\n\nI am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects.\n\nWe look forward to your response and the possibility of working together.\n\nThank you for your time and attention.\n\nSincerely,\nPamela Jameson`
};

async function testLead(name, url) {
  console.log(`\n==============================================`);
  console.log(`Testing: ${name} -> ${url}`);
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    timeout: 30000,
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
    console.log(`Loaded URL: ${page.url()}, Title: ${await page.title()}`);

    // Check DOM for forms, inputs, labels
    const details = await page.evaluate(() => {
      const forms = Array.from(document.querySelectorAll('form'));
      return forms.map(f => {
        const inputs = Array.from(f.querySelectorAll('input, textarea, select, button'));
        return {
          id: f.id,
          class: f.className,
          action: f.action,
          inputs: inputs.map(i => ({
            tag: i.tagName.toLowerCase(),
            type: i.type,
            name: i.name,
            id: i.id,
            placeholder: i.placeholder,
            ariaLabel: i.getAttribute('aria-label'),
            dataAid: i.getAttribute('data-aid'),
            labelText: i.closest('label')?.innerText || document.querySelector(`label[for="${i.id}"]`)?.innerText || i.previousElementSibling?.innerText || ''
          }))
        };
      });
    });
    console.log('Form details:', JSON.stringify(details, null, 2));

    // Check if any captchas
    const captchas = await page.evaluate(() => {
      const els = document.querySelectorAll('.g-recaptcha, iframe[src*="recaptcha"], iframe[src*="hcaptcha"], iframe[src*="turnstile"], .cf-turnstile, [data-sitekey]');
      return Array.from(els).map(e => e.outerHTML.substring(0, 150));
    });
    console.log('Captchas found:', captchas);

  } catch (err) {
    console.log('Error:', err.message);
  } finally {
    await browser.close();
  }
}

async function run() {
  await testLead('#4592 Twisted Metals', 'https://twistedmetalswelding.com');
  await testLead('#4594 Slight of Hand Contact', 'https://slightofhandmetalworks.com/contact.html');
  await testLead('#4595 Martin Metalworks Contact', 'https://martinmetalworks.co/contact');
  await testLead('#4597 Westbrook Metals RFQ', 'https://www.westbrookmetals.com/RequestaQuote');
  await testLead('#4597 Westbrook Metals Contact', 'https://www.westbrookmetals.com/ContactUs');
}

run();
