import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const OUTREACH = {
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
  zip: '60601',
  country: 'USA',
  message: 'Hello,\n\nI am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects.\n\nWe look forward to your response.\n\nSincerely,\nPamela Jameson'
};

async function testMetalcraftVerify() {
  console.log('\n--- Verifying Metalcraft (#4866) ---');
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: CHROME_BIN,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
  });
  const page = await browser.newPage();
  try {
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.goto('https://www.metalcraftservices.com/', { waitUntil: 'domcontentloaded', timeout: 35000 });
    await new Promise(r => setTimeout(r, 4000));

    await page.evaluate(() => {
      document.querySelector('form')?.scrollIntoView();
    });
    await new Promise(r => setTimeout(r, 1000));

    await page.type('#input_comp-jhrhzupi', OUTREACH.fullName);
    await page.type('#input_comp-jhri006s', OUTREACH.email);
    await page.type('#input_comp-jhri04vj', OUTREACH.subject);
    await page.type('#textarea_comp-jhri0h6x', OUTREACH.message);

    await page.evaluate(() => {
      const cb = document.querySelector('form input[type="checkbox"]');
      if (cb) {
        cb.checked = true;
        cb.dispatchEvent(new Event('change', { bubbles: true }));
        cb.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });

    const cbLabel = await page.$('form label:has(input[type="checkbox"]), form [data-testid="checkbox-label"]');
    if (cbLabel) await cbLabel.click();

    console.log('Submitting Metalcraft...');
    const submitBtn = await page.$('form button, button[data-testid="buttonElement"]');
    if (submitBtn) await submitBtn.click();

    await new Promise(r => setTimeout(r, 6000));

    const check = await page.evaluate(() => {
      const form = document.querySelector('form');
      const messages = Array.from(document.querySelectorAll('[data-testid="notifications"], [role="alert"], [class*="notification"], [class*="success"], [class*="message"], p, span'))
        .filter(el => /thank|received|sent|success|message/i.test(el.innerText))
        .map(el => el.innerText.trim());
      return {
        messages: Array.from(new Set(messages)).slice(0, 5),
        formText: form?.innerText
      };
    });
    console.log('Metalcraft verification:', check);
  } catch (e) {
    console.error('Metalcraft error:', e);
  } finally {
    await browser.close();
  }
}

async function testWIP4853() {
  console.log('\n--- Testing Lead #4853: World Industrial Products ---');
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: CHROME_BIN,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
  });
  const page = await browser.newPage();
  try {
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.goto('https://worldindustrialproducts.com/contact/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 3000));

    // Fill the fields
    await page.type('#et_pb_contact_first_name_0', OUTREACH.firstName);
    await page.type('#et_pb_contact_last_name_0', OUTREACH.lastName);
    await page.type('#et_pb_contact_company_0', OUTREACH.company);
    await page.type('#et_pb_contact_industry_2_0', 'Precision Machinery');
    await page.type('#et_pb_contact_mailing_address_0', OUTREACH.address);
    await page.type('#et_pb_contact_city_0', OUTREACH.city);
    await page.type('#et_pb_contact_state_0', OUTREACH.state);
    await page.type('input[name="et_pb_contact_zip/postal_code_0"]', OUTREACH.zip);
    await page.type('#et_pb_contact_country_0', OUTREACH.country);
    await page.type('#et_pb_contact_telephone_0', OUTREACH.phone);
    await page.type('#et_pb_contact_email_address_0', OUTREACH.email);
    await page.type('input[name="et_pb_contact_how_did_you_hear_about_us?_0"]', 'Industry Network');

    // Select first checkbox
    await page.evaluate(() => {
      const cb = document.querySelector('input[type="checkbox"]');
      if (cb) {
        cb.checked = true;
        cb.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });

    page.on('response', async res => {
      if (res.request().method() === 'POST') {
        console.log(`WIP POST Response [${res.status()}]:`, res.url());
        try {
          const text = await res.text();
          console.log('Response body snippet:', text.slice(0, 200));
        } catch (e) {}
      }
    });

    console.log('Clicking SUBMIT on WIP...');
    const submitBtn = await page.$('.et_pb_contact_submit, button[type="submit"], input[type="submit"]');
    if (submitBtn) {
      await Promise.all([
        page.waitForNavigation({ timeout: 10000, waitUntil: 'domcontentloaded' }).catch(() => {}),
        submitBtn.click()
      ]);
    }

    await new Promise(r => setTimeout(r, 4000));
    const postState = await page.evaluate(() => {
      const msg = document.querySelector('.et-pb-contact-message');
      return {
        url: window.location.href,
        message: msg ? msg.innerText : '',
        body: document.body.innerText.slice(0, 400)
      };
    });
    console.log('WIP post state:', postState);
  } catch (e) {
    console.error('WIP error:', e);
  } finally {
    await browser.close();
  }
}

async function run() {
  await testMetalcraftVerify();
  await testWIP4853();
}

run();
