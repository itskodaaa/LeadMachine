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

async function testWIP() {
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

    await page.type('#et_pb_contact_first_name_0', OUTREACH.firstName);
    await page.type('#et_pb_contact_last_name_0', OUTREACH.lastName);
    await page.type('#et_pb_contact_company_0', OUTREACH.company);
    await page.type('#et_pb_contact_industry_2_0', 'Precision Machinery');
    await page.type('#et_pb_contact_mailing_address_0', OUTREACH.address);
    await page.type('#et_pb_contact_city_0', OUTREACH.city);
    await page.type('#et_pb_contact_state_0', OUTREACH.state);
    await page.type('input[name="et_pb_contact_zip/postal_code_0"]', OUTREACH.zip);
    await page.type('#et_pb_contact_country_0', 'United States');
    await page.type('#et_pb_contact_telephone_0', OUTREACH.phone);
    await page.type('#et_pb_contact_fax_0', OUTREACH.phone);
    await page.type('#et_pb_contact_email_address_0', OUTREACH.email);
    await page.type('input[name="et_pb_contact_how_did_you_hear_about_us?_0"]', 'Industry Directory');

    // Click label for checkboxes
    console.log('Clicking checkbox labels...');
    await page.click('label[for="et_pb_contact_requesting_information_about_12_0"]');
    await page.click('label[for="et_pb_contact_requesting_information_about_12_1"]');

    // Check handle value
    const handleVal = await page.evaluate(() => {
      const h = document.querySelector('input.et_pb_checkbox_handle');
      return h ? h.value : null;
    });
    console.log('Checkbox handle value after clicking label:', handleVal);

    page.on('response', async res => {
      if (res.request().method() === 'POST') {
        console.log(`WIP POST Response [${res.status()}]:`, res.url());
      }
    });

    console.log('Submitting Divi form on #4853...');
    const submitBtn = await page.$('button[name="et_builder_submit_button"]');
    if (submitBtn) {
      await submitBtn.click();
    }

    await new Promise(r => setTimeout(r, 6000));

    const postState = await page.evaluate(() => {
      const msg = document.querySelector('.et-pb-contact-message');
      const err = document.querySelector('.et_pb_contact_error_text');
      return {
        message: msg ? msg.innerText.trim() : null,
        error: err ? err.innerText.trim() : null,
        bodyText: document.body.innerText.slice(0, 500)
      };
    });
    console.log('Post state #4853:', postState);
  } catch (e) {
    console.error('Error in #4853:', e);
  } finally {
    await browser.close();
  }
}

testWIP();
