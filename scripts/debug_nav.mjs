import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

const CHROME_BIN = '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

async function test() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--window-size=1280,850']
  });

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');

  page.on('request', req => {
    if (req.resourceType() === 'document') {
      console.log('Document request:', req.url());
    }
  });

  page.on('response', resp => {
    if (resp.request().resourceType() === 'document') {
      console.log('Document response:', resp.status(), resp.url());
    }
  });

  page.on('error', err => console.log('Page error:', err));
  page.on('pageerror', err => console.log('Page error inside:', err));

  try {
    console.log('Navigating to https://cncprogramingmachining.com/ ...');
    const resp = await page.goto('https://cncprogramingmachining.com/', { waitUntil: 'domcontentloaded', timeout: 20000 });
    console.log('Loaded:', resp ? resp.status() : 'null', page.url());
    console.log('Title:', await page.title());

    await new Promise(r => setTimeout(r, 1500));

    // Fill form #wpforms-form-17
    await page.evaluate(() => {
      document.querySelector('#wpforms-17-field_0').value = 'Pamela Jameson';
      document.querySelector('#wpforms-17-field_1').value = 'pamela.jameson@nortiheastprecision.com';
      document.querySelector('#wpforms-17-field_2').value = 'Hello,\n\nI am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects.\n\nWe look forward to your response and the possibility of working together.\n\nThank you for your time and attention.\n\nSincerely,\nPamela Jameson';
      // ensure honeypot is empty
      const hp = document.querySelector('#wpforms-17-field-hp');
      if (hp) hp.value = '';
    });

    console.log('Fields populated. Clicking submit button #wpforms-submit-17...');
    await page.click('#wpforms-submit-17');

    console.log('Waiting 8s for post-submission response...');
    await new Promise(r => setTimeout(r, 8000));

    const check1 = await page.evaluate(() => {
      const conf = document.querySelector('.wpforms-confirmation-container-17, .wpforms-confirmation-scroll, div[id*="wpforms-confirmation"]');
      const text = conf ? conf.innerText.trim() : (document.body ? document.body.innerText : '');
      return {
        confFound: !!conf,
        confText: conf ? conf.innerText.trim() : null,
        textSnippet: text.slice(0, 300)
      };
    });
    console.log('Result for 1736:', JSON.stringify(check1, null, 2));

  } catch (e) {
    console.log('Failed 1736:', e.message);
  }

  try {
    console.log('Navigating to https://mbs01.com/contact/ ...');
    const resp2 = await page.goto('https://mbs01.com/contact/', { waitUntil: 'domcontentloaded', timeout: 20000 });
    console.log('Loaded 2:', resp2 ? resp2.status() : 'null', page.url());
    console.log('Title 2:', await page.title());

    await new Promise(r => setTimeout(r, 1500));

    // Fill Gravity Form #gform_1
    await page.evaluate(() => {
      document.querySelector('#input_1_1').value = 'Pamela Jameson';
      document.querySelector('#input_1_2').value = 'pamela.jameson@nortiheastprecision.com';
      document.querySelector('#input_1_3').value = '708-568-3708';
      document.querySelector('#input_1_4').value = 'Hello,\n\nI am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects.\n\nWe look forward to your response and the possibility of working together.\n\nThank you for your time and attention.\n\nSincerely,\nPamela Jameson';
    });

    console.log('Fields populated for MBS01. Clicking #gform_submit_button_1...');
    await page.click('#gform_submit_button_1');

    console.log('Waiting 8s for post-submission response...');
    await new Promise(r => setTimeout(r, 8000));

    const check2 = await page.evaluate(() => {
      const conf = document.querySelector('#gform_confirmation_wrapper_1, .gform_confirmation_message_1, .gform_confirmation_message');
      const text = conf ? conf.innerText.trim() : (document.body ? document.body.innerText : '');
      return {
        confFound: !!conf,
        confText: conf ? conf.innerText.trim() : null,
        textSnippet: text.slice(0, 300)
      };
    });
    console.log('Result for 1738:', JSON.stringify(check2, null, 2));

  } catch (e) {
    console.log('Failed 1738:', e.message);
  }

  await browser.close();
}

test();
