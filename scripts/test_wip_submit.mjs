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
  country: 'United States',
  message: 'Hello,\n\nI am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects.\n\nWe look forward to your response.\n\nSincerely,\nPamela Jameson'
};

async function testWIPSubmit() {
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: CHROME_BIN,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
  });
  const page = await browser.newPage();
  try {
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.goto('https://worldindustrialproducts.com/contact/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));

    await page.evaluate((data) => {
      document.querySelector('#et_pb_contact_first_name_0').value = data.firstName;
      document.querySelector('#et_pb_contact_last_name_0').value = data.lastName;
      document.querySelector('#et_pb_contact_company_0').value = data.company;
      document.querySelector('#et_pb_contact_industry_2_0').value = 'Precision Machinery';
      document.querySelector('#et_pb_contact_mailing_address_0').value = data.address;
      document.querySelector('#et_pb_contact_city_0').value = data.city;
      document.querySelector('#et_pb_contact_state_0').value = data.state;
      document.querySelector('input[name="et_pb_contact_zip/postal_code_0"]').value = data.zip;
      document.querySelector('#et_pb_contact_country_0').value = 'United States';
      document.querySelector('#et_pb_contact_telephone_0').value = data.phone;
      document.querySelector('#et_pb_contact_fax_0').value = data.phone;
      document.querySelector('#et_pb_contact_email_address_0').value = data.email;
      document.querySelector('input[name="et_pb_contact_how_did_you_hear_about_us?_0"]').value = 'Industry Network';

      const cb = document.querySelector('#et_pb_contact_requesting_information_about_12_0');
      if (cb) cb.checked = true;

      const handle = document.querySelector('input.et_pb_checkbox_handle');
      if (handle) handle.value = 'Sand Casting';
    }, OUTREACH);

    page.on('response', async res => {
      if (res.request().method() === 'POST') {
        console.log(`WIP POST Response [${res.status()}]:`, res.url());
      }
    });

    console.log('Submitting Divi form on #4853 via form.submit()...');
    await page.evaluate(() => {
      const form = document.querySelector('form.et_pb_contact_form');
      form.submit();
    });

    await page.waitForNavigation({ timeout: 15000, waitUntil: 'domcontentloaded' }).catch(() => {});
    await new Promise(r => setTimeout(r, 3000));

    const res = await page.evaluate(() => {
      return {
        url: window.location.href,
        msg: document.querySelector('.et-pb-contact-message')?.innerText || '',
        body: document.body.innerText.slice(0, 500)
      };
    });
    console.log('Post submit #4853 result:', res);
  } catch (e) {
    console.error('WIP error:', e);
  } finally {
    await browser.close();
  }
}

testWIPSubmit();
