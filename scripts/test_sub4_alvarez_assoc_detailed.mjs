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
  message: `Hello,\n\nI am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects.\n\nWe look forward to your response and the possibility of working together.\n\nThank you for your time and attention.\n\nSincerely,\nPamela Jameson`
};

async function testAlvarezAndAssocDetailed() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  // 1. Alvarez
  console.log('=== Alvarez Engineers ===');
  const page1 = await browser.newPage();
  try {
    await page1.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');
    await page1.goto('https://www.alvarezeng.com/contact/', { waitUntil: 'domcontentloaded', timeout: 30000 });

    await page1.type('input[name="your-name"]', OUTREACH_PROFILE.fullName);
    await page1.type('input[name="your-email"]', OUTREACH_PROFILE.email);
    await page1.type('input[name="phone"]', OUTREACH_PROFILE.phone);
    await page1.type('textarea[name="your-message"]', OUTREACH_PROFILE.message);

    page1.on('response', async res => {
      if (res.url().includes('feedback')) {
        try {
          const json = await res.json();
          console.log('Alvarez WPCF7 API Response:', JSON.stringify(json, null, 2));
        } catch (e) {
          console.log('Alvarez WPCF7 API Response text:', await res.text());
        }
      }
    });

    await page1.click('input[type="submit"]');
    console.log('Alvarez clicked submit, waiting up to 15s for status change...');
    await page1.waitForFunction(() => {
      const status = document.querySelector('form.wpcf7-form')?.getAttribute('data-status');
      return status && status !== 'submitting' && status !== 'init';
    }, { timeout: 15000 }).catch(e => console.log('Wait timeout:', e.message));

    const alvarezResult = await page1.evaluate(() => {
      const output = document.querySelector('.wpcf7-response-output');
      return {
        text: output ? output.innerText.trim() : '',
        status: document.querySelector('form.wpcf7-form')?.getAttribute('data-status'),
        invalidFields: Array.from(document.querySelectorAll('.wpcf7-not-valid-tip')).map(el => el.innerText)
      };
    });
    console.log('Alvarez Final Result:', JSON.stringify(alvarezResult, null, 2));
  } catch (e) {
    console.error('Alvarez error:', e.message);
  } finally {
    await page1.close();
  }

  // 2. Associated Machine Co
  console.log('\n=== Associated Machine Co ===');
  const page2 = await browser.newPage();
  try {
    await page2.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');
    await page2.goto('https://www.assocmachine.com/contact-us/', { waitUntil: 'domcontentloaded', timeout: 30000 });

    const buttons = await page2.evaluate(() => {
      const form = document.querySelector('form.et_pb_contact_form');
      if (!form) return 'no form';
      return Array.from(form.querySelectorAll('button, input[type="submit"], a.et_pb_button')).map(b => ({
        tag: b.tagName,
        type: b.type,
        className: b.className,
        text: b.innerText || b.value
      }));
    });
    console.log('Assoc Machine buttons inside form:', JSON.stringify(buttons, null, 2));

    await page2.type('#et_pb_contact_name_0', OUTREACH_PROFILE.fullName);
    await page2.type('#et_pb_contact_email_0', OUTREACH_PROFILE.email);
    await page2.type('#et_pb_contact_phone_0', OUTREACH_PROFILE.phone);
    await page2.type('#et_pb_contact_message_0', OUTREACH_PROFILE.message);

    page2.on('response', async res => {
      if (res.url().includes('assocmachine.com') && res.request().method() === 'POST') {
        console.log('Assoc POST response status:', res.status(), res.url());
      }
    });

    console.log('Assoc Machine clicking button...');
    await page2.evaluate(() => {
      const btn = document.querySelector('form.et_pb_contact_form button[type="submit"], form.et_pb_contact_form input[type="submit"], form.et_pb_contact_form .et_pb_contact_submit');
      if (btn) btn.click();
      else document.querySelector('form.et_pb_contact_form').submit();
    });

    await new Promise(resolve => setTimeout(resolve, 8000));

    const assocResult = await page2.evaluate(() => {
      const msg = document.querySelector('.et-pb-contact-message');
      const body = document.body ? document.body.innerText : '';
      return {
        msgText: msg ? msg.innerText.trim() : null,
        errors: Array.from(document.querySelectorAll('.et_pb_contact_error_text')).map(e => e.innerText.trim()),
        hasThankYou: /thank you|thanks for contacting|message has been sent/i.test(body)
      };
    });
    console.log('Assoc Machine Final Result:', JSON.stringify(assocResult, null, 2));
  } catch (e) {
    console.error('Assoc Machine error:', e.message);
  } finally {
    await page2.close();
  }

  await browser.close();
}

testAlvarezAndAssocDetailed();
