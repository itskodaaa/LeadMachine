import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const OUTREACH_PROFILE = {
  fullName: 'Pamela Jameson',
  email: 'pamela.jameson@nortiheastprecision.com',
  phone: '708-568-3708',
  company: 'Northeast Precision Machinery, Inc.',
  message: 'Hello, I am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects. Thank you, Pamela Jameson'
};

async function testCrescent() {
  console.log('Testing Crescent Gage...');
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: CHROME_BIN,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(40000);

    await page.setRequestInterception(true);
    page.on('request', req => {
      const type = req.resourceType();
      if (['image', 'media', 'font'].includes(type)) {
        req.abort();
      } else {
        req.continue();
      }
    });

    page.on('response', async res => {
      if (res.url().includes('admin-ajax.php')) {
        try {
          const txt = await res.text();
          console.log(`[Ajax Response] ${res.status()}: ${txt.slice(0, 300)}`);
        } catch(e) {}
      }
    });

    console.log('Navigating to https://crescentgage.com/contact/ ...');
    await page.goto('https://crescentgage.com/contact/', { waitUntil: 'domcontentloaded', timeout: 35000 });
    console.log('Loaded! Title:', await page.title());

    await new Promise(r => setTimeout(r, 2000));

    // Fill form_popupcontactform
    const form = await page.$('#form_popupcontactform');
    if (form) {
      console.log('Found popupcontactform!');
      await page.type('input[name="item_meta[17]"]', OUTREACH_PROFILE.fullName);
      await page.type('input[name="item_meta[18]"]', OUTREACH_PROFILE.company);
      await page.type('input[name="item_meta[20]"]', OUTREACH_PROFILE.email);
      await page.type('input[name="item_meta[21]"]', OUTREACH_PROFILE.phone);
      await page.type('textarea[name="item_meta[22]"]', OUTREACH_PROFILE.message);

      console.log('Clicking submit on Crescent Gage...');
      const btn = await page.$('#form_popupcontactform button.frm_button_submit');
      if (btn) {
        await btn.click();
        await new Promise(r => setTimeout(r, 6000));

        const result = await page.evaluate(() => {
          const formEl = document.querySelector('#form_popupcontactform');
          const msgEl = document.querySelector('.frm_message, .frm_success_msg, div[role="status"]');
          return {
            formExists: !!formEl,
            formText: formEl ? formEl.innerText : null,
            msgText: msgEl ? msgEl.innerText : null,
            bodySnippet: document.body.innerText.slice(0, 400)
          };
        });
        console.log('Result:', JSON.stringify(result, null, 2));
      }
    } else {
      console.log('Form not found');
    }
  } catch(e) {
    console.error('Error:', e);
  } finally {
    await browser.close();
  }
}

testCrescent();
