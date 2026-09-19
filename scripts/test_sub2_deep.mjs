import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

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

async function testEUA() {
  const browser = await puppeteer.launch({ executablePath: CHROME_BIN, headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  try {
    page.on('console', msg => console.log('EUA CONSOLE:', msg.text()));
    page.on('response', resp => {
      if (resp.url().includes('admin-ajax.php') || resp.url().includes('frm')) {
        console.log('EUA AJAX RESP:', resp.status(), resp.url());
      }
    });

    await page.goto('https://eua.com/contact/', { waitUntil: 'networkidle2', timeout: 30000 });
    await page.waitForSelector('input[name="item_meta[1]"]');
    await page.type('input[name="item_meta[1]"]', PROFILE.fullName);
    await page.type('input[name="item_meta[3]"]', PROFILE.email);
    await page.type('input[name="item_meta[4]"]', PROFILE.subject);
    await page.type('textarea[name="item_meta[5]"]', PROFILE.message);

    console.log('Clicking submit on EUA...');
    await page.click('form.frm-show-form button[type="submit"]');
    await new Promise(r => setTimeout(r, 6000));

    const formText = await page.evaluate(() => {
      const f = document.querySelector('form.frm-show-form') || document.querySelector('.frm_message') || document.body;
      return f.innerText;
    });
    console.log('EUA Form Area Text:\n', formText);
  } finally {
    await browser.close();
  }
}

async function testWix(url, leadId, name) {
  const browser = await puppeteer.launch({ executablePath: CHROME_BIN, headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  try {
    page.on('console', msg => console.log(`${name} CONSOLE:`, msg.text()));
    page.on('response', resp => {
      if (resp.url().includes('wix') && (resp.url().includes('form') || resp.url().includes('submit'))) {
        console.log(`${name} RESP:`, resp.status(), resp.url());
      }
    });

    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    // Find all inputs in form
    const inputs = await page.$$('form input, form textarea');
    console.log(`${name} found ${inputs.length} inputs/textareas`);
    
    // Evaluate form structure
    const formInfo = await page.evaluate(() => {
      const f = document.querySelector('form');
      if (!f) return 'No form';
      return {
        action: f.action,
        fields: Array.from(f.querySelectorAll('input, textarea, button')).map(el => ({
          type: el.type,
          name: el.name,
          placeholder: el.placeholder,
          ariaLabel: el.getAttribute('aria-label'),
          id: el.id
        }))
      };
    });
    console.log(`${name} form info:`, JSON.stringify(formInfo, null, 2));

    // Fill each field appropriately
    if (leadId === 4404) {
      await page.type('#input_comp-jx4lmi5l', PROFILE.fullName, { delay: 20 });
      await page.type('#input_comp-jx4lmi7g', PROFILE.email, { delay: 20 });
      await page.type('#input_comp-jx4lmi8s', PROFILE.subject, { delay: 20 });
      await page.type('#textarea_comp-jx4lmia0', PROFILE.message, { delay: 10 });
    } else if (leadId === 4405) {
      await page.type('#input_comp-me71m0523', PROFILE.firstName, { delay: 20 });
      await page.type('#input_comp-me71m05c', PROFILE.lastName, { delay: 20 });
      await page.type('#input_comp-me71m05c3', PROFILE.email, { delay: 20 });
      await page.type('#textarea_comp-me71m05d2', PROFILE.message, { delay: 10 });
    }

    console.log(`Submitting ${name}...`);
    const btn = await page.$('form button[type="submit"]');
    if (btn) {
      await btn.click();
    } else {
      console.log('Submit button not found!');
    }

    await new Promise(r => setTimeout(r, 6000));

    // Check post submit messages or notifications
    const postText = await page.evaluate(() => {
      const f = document.querySelector('form');
      const alerts = Array.from(document.querySelectorAll('[role="alert"], .alert, [data-testid="message"], [id*="notification"]')).map(e => e.innerText);
      return {
        formText: f ? f.innerText : '',
        alerts
      };
    });
    console.log(`${name} Post-submit Text:`, JSON.stringify(postText, null, 2));
  } finally {
    await browser.close();
  }
}

async function run() {
  await testEUA();
  await testWix('https://www.baamechanical.com/', 4404, 'BAA');
  await testWix('https://www.convergeengineers.com/contact-7', 4405, 'Converge');
}

run();
