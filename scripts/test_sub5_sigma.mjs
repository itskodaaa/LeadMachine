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
  subject: 'Exploring Collaboration Opportunities',
  message: `Hello,\n\nI am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects.\n\nWe look forward to your response and the possibility of working together.\n\nThank you for your time and attention.\n\nSincerely,\nPamela Jameson`
};

async function testSigma() {
  console.log('\n--- TESTING #4055 Sigma Industrial Equipment ---');
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');

  // Monitor network responses
  page.on('response', async resp => {
    const url = resp.url();
    if (url.includes('contact') || url.includes('api') || url.includes('submit')) {
      try {
        console.log(`[Sigma Response] ${resp.status()} ${url}`);
        const text = await resp.text();
        console.log(`[Sigma Response Body]`, text.slice(0, 300));
      } catch (e) {}
    }
  });

  await page.goto('https://www.sigmaequip.com/en/contact', { waitUntil: 'networkidle2', timeout: 30000 });

  const fieldsInfo = await page.evaluate(() => {
    const form = document.querySelector('form');
    if (!form) return null;
    const inputs = Array.from(form.querySelectorAll('input, select, textarea')).map(el => {
      const label = el.labels && el.labels.length ? el.labels[0].innerText : el.closest('label')?.innerText || el.placeholder;
      return {
        tag: el.tagName,
        type: el.type,
        name: el.name,
        id: el.id,
        placeholder: el.placeholder,
        label: label || '',
        required: el.required
      };
    });
    return inputs;
  });

  console.log('Sigma Form Fields:', JSON.stringify(fieldsInfo, null, 2));

  // Fill carefully avoiding honeypot
  await page.evaluate((p) => {
    const form = document.querySelector('form');
    const inputs = Array.from(form.querySelectorAll('input, select, textarea'));
    for (const el of inputs) {
      // HONEYPOT check: name="website" or id="website"
      if (el.name === 'website' || el.id === 'website') {
        console.log('Skipping honeypot field:', el.name);
        continue;
      }
      const label = ((el.labels && el.labels[0]?.innerText) || el.placeholder || '').toLowerCase();
      const type = el.type ? el.type.toLowerCase() : '';

      if (type === 'email' || label.includes('email')) {
        el.value = p.email;
      } else if (type === 'tel' || label.includes('phone')) {
        el.value = p.phone;
      } else if (label.includes('first') || (label.includes('name') && !label.includes('last') && !label.includes('company'))) {
        el.value = p.firstName;
      } else if (label.includes('last')) {
        el.value = p.lastName;
      } else if (label.includes('company')) {
        el.value = p.company;
      } else if (el.tagName.toLowerCase() === 'textarea' || label.includes('message') || label.includes('inquiry')) {
        el.value = p.message;
      } else if (el.tagName.toLowerCase() === 'select') {
        if (el.options.length > 1) el.selectedIndex = 1;
      }
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }, OUTREACH_PROFILE);

  await new Promise(r => setTimeout(r, 1000));

  // Click submit
  console.log('Clicking submit button on Sigma...');
  const clicked = await page.evaluate(() => {
    const btn = document.querySelector('form button[type="submit"], form button');
    if (btn) {
      btn.click();
      return btn.innerText;
    }
    return false;
  });
  console.log('Clicked button:', clicked);

  await new Promise(r => setTimeout(r, 5000));

  const postSubmit = await page.evaluate(() => {
    return {
      bodyText: document.body.innerText.slice(0, 1000),
      url: window.location.href,
      alerts: Array.from(document.querySelectorAll('[role="alert"], .alert, .success, .error, .toast')).map(a => a.innerText)
    };
  });
  console.log('Post submit URL:', postSubmit.url);
  console.log('Post submit Alerts:', postSubmit.alerts);
  console.log('Body snippet:', postSubmit.bodyText.slice(0, 400));

  await browser.close();
}

testSigma();
