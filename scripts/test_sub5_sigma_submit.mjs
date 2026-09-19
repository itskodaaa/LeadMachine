import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

const CHROME_BIN = '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

const OUTREACH_PROFILE = {
  fullName: 'Pamela Jameson',
  email: 'pamela.jameson@nortiheastprecision.com',
  phone: '708-568-3708',
  company: 'Northeast Precision Machinery, Inc.',
  message: `Hello,\n\nI am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects.\n\nWe look forward to your response and the possibility of working together.\n\nThank you for your time and attention.\n\nSincerely,\nPamela Jameson`
};

async function testSigmaSubmit() {
  console.log('Testing Sigma form fill & submit...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');

  // Monitor network requests and responses
  page.on('request', req => {
    if (req.method() === 'POST') {
      console.log(`[POST REQUEST] ${req.url()}`, req.postData()?.slice(0, 300));
    }
  });
  page.on('response', async resp => {
    if (resp.request().method() === 'POST') {
      console.log(`[POST RESPONSE] ${resp.status()} ${resp.url()}`);
      try {
        const text = await resp.text();
        console.log(`[POST RESPONSE BODY]`, text);
      } catch (e) {}
    }
  });

  await page.goto('https://www.sigmaequip.com/en/contact', { waitUntil: 'networkidle2', timeout: 30000 });

  // Let's inspect each input container and fill accurately
  const fillResult = await page.evaluate((p) => {
    const form = document.querySelector('form');
    if (!form) return 'No form';
    const inputs = Array.from(form.querySelectorAll('input, select, textarea'));
    
    // Website honeypot
    const hp = form.querySelector('#website, [name="website"]');
    if (hp) hp.value = '';

    // Inputs:
    // index 0: honeypot (website)
    // index 1: Name *
    // index 2: Company *
    // index 3: Email *
    // index 4: Phone
    // index 5: Subject *
    // index 6: Message *
    
    // Let's find by container text or index
    for (let i = 0; i < inputs.length; i++) {
      const el = inputs[i];
      if (el === hp) continue;

      const parentText = (el.closest('div')?.innerText || '').toLowerCase();
      console.log(`Input ${i}: parentText="${parentText}", tag=${el.tagName}, type=${el.type}`);

      if (parentText.includes('name') && !parentText.includes('company')) {
        el.value = p.fullName;
      } else if (parentText.includes('company')) {
        el.value = p.company;
      } else if (el.type === 'email' || parentText.includes('email')) {
        el.value = p.email;
      } else if (el.type === 'tel' || parentText.includes('phone')) {
        el.value = p.phone;
      } else if (el.tagName.toLowerCase() === 'select' || parentText.includes('subject')) {
        if (el.options.length > 1) {
          el.selectedIndex = 1; // "Request a Quote (RFQ)"
        }
      } else if (el.tagName.toLowerCase() === 'textarea' || parentText.includes('message') || parentText.includes('describe')) {
        el.value = p.message;
      }

      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      el.dispatchEvent(new Event('blur', { bubbles: true }));
    }

    return 'Filled';
  }, OUTREACH_PROFILE);

  console.log('Fill result:', fillResult);

  await new Promise(r => setTimeout(r, 1000));

  // Click Submit
  console.log('Clicking submit...');
  await page.evaluate(() => {
    const btn = document.querySelector('form button[type="submit"]');
    if (btn) btn.click();
  });

  await new Promise(r => setTimeout(r, 5000));

  const postState = await page.evaluate(() => {
    return {
      bodyText: document.body.innerText,
      alerts: Array.from(document.querySelectorAll('[role="alert"], .alert, .success, .toast, [class*="success"]')).map(a => a.innerText)
    };
  });

  console.log('Post submit Alerts:', postState.alerts);
  console.log('Post submit snippet:', postState.bodyText.slice(0, 500));

  await browser.close();
}

testSigmaSubmit();
