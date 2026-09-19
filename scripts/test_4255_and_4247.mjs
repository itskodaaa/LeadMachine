import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const OUTREACH = {
  name: 'Pamela Jameson',
  email: 'pamela.jameson@nortiheastprecision.com',
  phone: '708-568-3708',
  company: 'Northeast Precision Machinery, Inc.',
  message: 'Hello, I am reaching out to express interest in your services and would appreciate the opportunity to explore potential collaboration on upcoming project quotes. Kindly arrange for a representative to contact us. Thank you, Pamela Jameson'
};

async function test4422() {
  console.log('\n--- Testing Lead #4422: Phillips Gradick Engineering ---');
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  try {
    await page.goto('https://pgeng.net/contact/', { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Inspect the captcha field
    const captchaInfo = await page.evaluate(() => {
      const captchaInput = document.querySelector('input[name="et_pb_contact_captcha_0"]');
      if (!captchaInput) return null;
      // Get parent or label or preceding text
      const parent = captchaInput.closest('.et_pb_contact_field') || captchaInput.parentElement;
      return {
        html: parent ? parent.innerHTML : '',
        placeholder: captchaInput.placeholder,
        dataFirst: captchaInput.getAttribute('data-first_digit'),
        dataSecond: captchaInput.getAttribute('data-second_digit'),
        labelText: parent ? parent.innerText.trim() : ''
      };
    });
    console.log('Captcha info on #4422:', captchaInfo);

    // Divi captcha usually has data-first_digit and data-second_digit or label with math equation
    let captchaAnswer = '';
    if (captchaInfo) {
      if (captchaInfo.dataFirst && captchaInfo.dataSecond) {
        captchaAnswer = (parseInt(captchaInfo.dataFirst, 10) + parseInt(captchaInfo.dataSecond, 10)).toString();
      } else if (captchaInfo.labelText) {
        const m = captchaInfo.labelText.match(/(\d+)\s*\+\s*(\d+)/);
        if (m) {
          captchaAnswer = (parseInt(m[1], 10) + parseInt(m[2], 10)).toString();
        }
      }
    }
    console.log('Computed captcha answer:', captchaAnswer);

    // Fill form
    await page.type('input[name="et_pb_contact_name_0"]', OUTREACH.name, { delay: 50 });
    await page.type('input[name="et_pb_contact_email_0"]', OUTREACH.email, { delay: 50 });
    await page.type('textarea[name="et_pb_contact_message_0"]', OUTREACH.message, { delay: 20 });
    if (captchaAnswer) {
      await page.type('input[name="et_pb_contact_captcha_0"]', captchaAnswer, { delay: 50 });
    }

    console.log('Submitting form...');
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {}),
      page.click('button.et_pb_contact_submit, button[type="submit"]')
    ]);

    await new Promise(r => setTimeout(r, 4000));

    const postSubmit = await page.evaluate(() => {
      return {
        url: window.location.href,
        bodyText: document.body.innerText.slice(0, 500),
        etContactMessage: document.querySelector('.et-pb-contact-message')?.innerText,
        alerts: Array.from(document.querySelectorAll('.et_pb_contact_form, .et-pb-contact-message')).map(el => el.innerText)
      };
    });
    console.log('Post submit #4422:', postSubmit);

  } catch (e) {
    console.error('Error on #4422:', e.message);
  } finally {
    await page.close().catch(() => {});
    await browser.close().catch(() => {});
  }
}

async function test4425() {
  console.log('\n--- Testing Lead #4425: M E Cubed Engineering LLC ---');
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  try {
    await page.goto('https://www.me3eng.com/contact', { waitUntil: 'networkidle2', timeout: 30000 });

    // Duda form
    // dmform-0: Name, dmform-1: Email, dmform-2: Phone, dmform-3: Message
    await page.type('input[name="dmform-0"]', OUTREACH.name, { delay: 50 });
    await page.type('input[name="dmform-1"]', OUTREACH.email, { delay: 50 });
    await page.type('input[name="dmform-2"]', OUTREACH.phone, { delay: 50 });
    await page.type('textarea[name="dmform-3"]', OUTREACH.message, { delay: 20 });

    console.log('Submitting Duda form...');
    
    // Listen for network responses
    let apiResponse = null;
    page.on('response', async res => {
      if (res.url().includes('dmform.submit') || res.url().includes('widgets/dmform')) {
        try {
          const text = await res.text();
          apiResponse = { status: res.status(), url: res.url(), body: text };
        } catch (e) {}
      }
    });

    await page.click('input[type="submit"][name="submit"], form#\\31 350808591 input[type="submit"]');

    await new Promise(r => setTimeout(r, 6000));

    const postSubmit = await page.evaluate(() => {
      const form = document.querySelector('form.dmRespDesignRow');
      return {
        url: window.location.href,
        formInner: form ? form.innerText : '',
        messages: Array.from(document.querySelectorAll('.success, .message, .dmFormSuccess, .dmRespCol')).map(el => el.innerText.trim()).filter(t => t.length > 0 && t.length < 200)
      };
    });

    console.log('API response on #4425:', apiResponse);
    console.log('Post submit #4425:', postSubmit);

  } catch (e) {
    console.error('Error on #4425:', e.message);
  } finally {
    await page.close().catch(() => {});
    await browser.close().catch(() => {});
  }
}

async function run() {
  await test4422();
  await test4425();
}

run();
