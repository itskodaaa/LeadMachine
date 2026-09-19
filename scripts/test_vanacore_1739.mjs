import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

const CHROME_BIN = '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

const OUTREACH_PROFILE = {
  fullName: 'Pamela Jameson',
  firstName: 'Pamela',
  lastName: 'Jameson',
  email: 'pamela.jameson@nortiheastprecision.com',
  phone: '708-568-3708',
  company: 'Northeast Precision Machinery, Inc.',
  message: `Hello,\n\nI am reaching out to express our interest in your precision CNC machining services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details and possible collaboration.\n\nThank you,\nPamela Jameson`
};

async function test1739() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--window-size=1280,850']
  });

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');

  page.on('response', async resp => {
    if (resp.request().method() === 'POST') {
      try {
        console.log('POST:', resp.status(), resp.url(), (await resp.text()).slice(0, 200));
      } catch (e) {}
    }
  });

  console.log('Navigating to http://vanacorecnc.com/ ...');
  await page.goto('http://vanacorecnc.com/', { waitUntil: 'domcontentloaded', timeout: 25000 });
  await new Promise(r => setTimeout(r, 2000));

  await page.evaluate(() => {
    const el = document.querySelector('#gform_2');
    if (el) el.scrollIntoView();
  });
  await new Promise(r => setTimeout(r, 1000));

  console.log('Filling Gravity Form #gform_2...');
  await page.type('#input_2_1_3', OUTREACH_PROFILE.firstName, { delay: 20 });
  await page.type('#input_2_1_6', OUTREACH_PROFILE.lastName, { delay: 20 });
  await page.type('#input_2_9', OUTREACH_PROFILE.company, { delay: 20 });
  await page.type('#input_2_3', OUTREACH_PROFILE.email, { delay: 20 });
  await page.type('#input_2_2', OUTREACH_PROFILE.phone, { delay: 20 });
  await page.type('#input_2_7', OUTREACH_PROFILE.message, { delay: 10 });

  console.log('Finding submit button...');
  const submitBtn = await page.$('#gform_submit_button_2, input[value="Submit"]');
  if (submitBtn) {
    console.log('Clicking submit button...');
    await submitBtn.click();
  }

  console.log('Waiting 10s for response...');
  await new Promise(r => setTimeout(r, 10000));

  const result = await page.evaluate(() => {
    const errors = Array.from(document.querySelectorAll('.gfield_error, .validation_error')).map(e => e.innerText);
    const conf = document.querySelector('#gform_confirmation_wrapper_2, .gform_confirmation_message_2, .gform_confirmation_message');
    const body = document.body ? document.body.innerText : '';
    return {
      errors,
      confText: conf ? conf.innerText.trim() : null,
      bodySnippet: body.slice(0, 300).replace(/\s+/g, ' ')
    };
  });

  console.log('Post submit result for 1739:', JSON.stringify(result, null, 2));

  await browser.close();
}

test1739().catch(console.error);
