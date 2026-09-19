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

async function test4860() {
  console.log('\n--- Deep Testing Lead #4860: Smith Hamilton ---');
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: CHROME_BIN,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
  });
  const page = await browser.newPage();
  try {
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.goto('https://smithhamiltonfl.com/', { waitUntil: 'networkidle2', timeout: 30000 });

    await page.type('input[name="nombre"]', OUTREACH.fullName);
    await page.type('input[name="mail"]', OUTREACH.email);
    await page.type('textarea[name="comments"]', OUTREACH.message);

    console.log('Clicking SEND on #4860 and listening to responses...');
    page.on('response', res => {
      if (res.url().includes('wp-json') || res.url().includes('feedback')) {
        console.log('Response:', res.status(), res.url());
      }
    });

    await page.evaluate(() => {
      document.querySelector('form.wpcf7-form input[type="submit"][value="SEND"]').scrollIntoView();
    });
    await new Promise(r => setTimeout(r, 500));
    await page.click('form.wpcf7-form input[type="submit"][value="SEND"]');

    // Wait up to 15 seconds for status change
    let status = '';
    let responseText = '';
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 500));
      const res = await page.evaluate(() => {
        const form = document.querySelector('form.wpcf7-form');
        const out = document.querySelector('.wpcf7-response-output');
        return {
          status: form ? form.getAttribute('data-status') : null,
          classList: form ? Array.from(form.classList) : [],
          output: out ? out.innerText : ''
        };
      });
      status = res.status;
      responseText = res.output;
      if (status !== 'submitting' && status !== 'init' && responseText) {
        console.log(`Finished waiting at ${(i + 1) * 0.5}s: status=${status}, text=${responseText}`);
        break;
      }
    }
    console.log(`Final #4860: status=${status}, output=${responseText}`);
  } catch (e) {
    console.error('Error in #4860:', e);
  } finally {
    await browser.close();
  }
}

async function test4855() {
  console.log('\n--- Deep Testing Lead #4855: ETS Rentals & Repairs ---');
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: CHROME_BIN,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
  });
  const page = await browser.newPage();
  try {
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.goto('https://etsrentals.com/contact-us/', { waitUntil: 'networkidle2', timeout: 30000 });

    page.on('response', res => {
      if (res.url().includes('wp-json') || res.url().includes('feedback')) {
        console.log('ETS Response:', res.status(), res.url());
      }
    });

    await page.type('input[name="your-name"]', OUTREACH.fullName);
    await page.type('input[name="your-email"]', OUTREACH.email);
    await page.type('input[name="your-subject"]', OUTREACH.subject);
    await page.type('textarea[name="your-message"]', OUTREACH.message);

    console.log('Clicking submit on #4855...');
    await page.evaluate(() => {
      const btn = document.querySelector('form.wpcf7-form input[type="submit"]');
      if (btn) btn.click();
    });

    for (let i = 0; i < 20; i++) {
      await new Promise(r => setTimeout(r, 500));
      const res = await page.evaluate(() => {
        const form = document.querySelector('form.wpcf7-form');
        const out = document.querySelector('.wpcf7-response-output');
        return {
          status: form ? form.getAttribute('data-status') : null,
          output: out ? out.innerText : ''
        };
      });
      if (res.status && res.status !== 'init') {
        console.log(`ETS check ${(i + 1) * 0.5}s: status=${res.status}, output=${res.output}`);
        if (res.status !== 'submitting') break;
      }
    }
  } catch (e) {
    console.error('Error in #4855:', e);
  } finally {
    await browser.close();
  }
}

async function test4853() {
  console.log('\n--- Deep Testing Lead #4853: World Industrial Products ---');
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: CHROME_BIN,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
  });
  const page = await browser.newPage();
  try {
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.goto('https://worldindustrialproducts.com/contact/', { waitUntil: 'networkidle2', timeout: 30000 });

    page.on('response', res => {
      if (res.request().method() === 'POST') {
        console.log('POST Response:', res.status(), res.url());
      }
    });

    // Check checkboxes on page
    await page.evaluate(() => {
      const cb = document.querySelector('input[type="checkbox"]');
      if (cb) cb.click();
    });

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
    await page.type('input[name="et_pb_contact_how_did_you_hear_about_us?_0"]', 'Internet Search');

    console.log('Clicking SUBMIT on #4853...');
    await page.evaluate(() => {
      document.querySelector('form.et_pb_contact_form button[type="submit"], form.et_pb_contact_form input[type="submit"]').click();
    });

    await new Promise(r => setTimeout(r, 6000));
    const post = await page.evaluate(() => {
      const msg = document.querySelector('.et-pb-contact-message');
      return {
        url: window.location.href,
        message: msg ? msg.innerText : '',
        formVisible: !!document.querySelector('form.et_pb_contact_form')
      };
    });
    console.log('Post submit #4853:', post);
  } catch (e) {
    console.error('Error in #4853:', e);
  } finally {
    await browser.close();
  }
}

async function run() {
  await test4860();
  await test4855();
  await test4853();
}

run();
