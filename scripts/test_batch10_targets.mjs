import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const profile = {
  firstName: 'Pamela',
  lastName: 'Jameson',
  fullName: 'Pamela Jameson',
  company: 'Northeast Precision Machinery, Inc.',
  title: 'Procurement & Operations',
  project: 'Custom Metal Fabrication Inquiry',
  address: '100 Main St, Chicago, IL 60601',
  phone: '708-568-3708',
  email: 'pamela.jameson@nortiheastprecision.com',
  subject: 'Precision Metal & Architectural Fabrication Collaboration',
  message: 'Hello, I am reaching out on behalf of Northeast Precision Machinery, Inc. We specialize in precision custom metal components and fabrication. We are exploring potential partnership and subcontracting opportunities with your team. Could you please direct me to the appropriate contact on your estimating or project team? Thank you, Pamela Jameson'
};

async function testCanopy2058() {
  console.log('\n--- Testing Lead #2058: Canopy Solutions ---');
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--window-size=1280,800']
  });

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');

  page.on('response', async res => {
    if (res.url().includes('wpcf7') || res.url().includes('feedback')) {
      try {
        console.log('[Canopy WPCF7]:', res.status(), (await res.text()).slice(0, 300));
      } catch (_) {}
    }
  });

  try {
    await page.goto('https://canopy-solutions.com/contact-us/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));

    const fields = [
      { sel: 'input[name="company"]', val: profile.company },
      { sel: 'input[name="title"]', val: profile.title },
      { sel: 'input[name="project"]', val: profile.project },
      { sel: 'input[name="project-address"]', val: profile.address },
      { sel: 'input[name="tel-142"]', val: profile.phone },
      { sel: 'input[name="your-email"]', val: profile.email },
      { sel: 'input[name="service-provided"]', val: 'Canopies & Metal Fabrication' },
      { sel: 'textarea[name="your-message"]', val: profile.message }
    ];

    for (const f of fields) {
      const el = await page.$(f.sel);
      if (el) await page.type(f.sel, f.val, { delay: 10 });
    }

    console.log('Fields filled. Submitting...');
    await page.evaluate(() => {
      const submitBtn = document.querySelector('form.wpcf7-form input[type="submit"], form.wpcf7-form button[type="submit"]');
      if (submitBtn) submitBtn.click();
      else document.querySelector('form.wpcf7-form').requestSubmit();
    });

    await new Promise(r => setTimeout(r, 7000));

    const result = await page.evaluate(() => {
      const out = document.querySelector('.wpcf7-response-output');
      const form = document.querySelector('form.wpcf7-form');
      return {
        formClass: form ? form.className : null,
        outText: out ? out.innerText : null
      };
    });
    console.log('[Canopy Result]:', result);

  } catch (e) {
    console.error('[Canopy Error]:', e.message);
  } finally {
    await browser.close();
  }
}

async function testBMetal2126() {
  console.log('\n--- Testing Lead #2126: B Metal Fabrication ---');
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--window-size=1280,800']
  });

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');

  page.on('response', async res => {
    if (res.url().includes('duda') || res.url().includes('form') || res.request().method() === 'POST') {
      try {
        console.log('[B Metal POST/Form]:', res.url(), res.status(), (await res.text()).slice(0, 300));
      } catch (_) {}
    }
  });

  try {
    await page.goto('https://www.bmetalfabrication.com/contact', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));

    await page.evaluate((p) => {
      const fName = document.querySelector('input[name="dmform-0"], input[placeholder*="First Name"]');
      const lName = document.querySelector('input[name="dmform-4"], input[placeholder*="Last Name"]');
      const email = document.querySelector('input[name="dmform-1"], input[placeholder*="Email"]');
      const phone = document.querySelector('input[name="dmform-2"], input[placeholder*="Phone"]');
      const subject = document.querySelector('input[name="dmform-5"], input[placeholder*="Subject"]');
      const message = document.querySelector('textarea[name="dmform-3"], textarea[placeholder*="Message"]');

      if (fName) fName.value = p.firstName;
      if (lName) lName.value = p.lastName;
      if (email) email.value = p.email;
      if (phone) phone.value = p.phone;
      if (subject) subject.value = p.subject;
      if (message) message.value = p.message;

      [fName, lName, email, phone, subject, message].forEach(el => {
        if (el) {
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });
    }, profile);

    console.log('Fields filled. Submitting B Metal form...');
    await page.evaluate(() => {
      const btn = document.querySelector('input[type="submit"], button[type="submit"], [id="1472624446"], .dmform-submit');
      if (btn) btn.click();
    });

    await new Promise(r => setTimeout(r, 7000));

    const result = await page.evaluate(() => {
      const successEl = document.querySelector('.dmRespDesignRow.success, .form-success, .success-message, [data-testid="form-submitted"]');
      return {
        successText: successEl ? successEl.innerText : null,
        bodyMatch: document.body.innerText.match(/(?:thank you|thanks|received|submitted)[^\n.!]*/i)
      };
    });
    console.log('[B Metal Result]:', result);

  } catch (e) {
    console.error('[B Metal Error]:', e.message);
  } finally {
    await browser.close();
  }
}

async function testSouthTexas2073() {
  console.log('\n--- Testing Lead #2073: South Texas Sheet Metal ---');
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--window-size=1280,800']
  });

  const page = await browser.newPage();
  try {
    await page.goto('https://southtexassheetmetal.com', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));

    const info = await page.evaluate(() => {
      const forms = Array.from(document.querySelectorAll('form'));
      return forms.map(f => ({
        id: f.id,
        className: f.className,
        action: f.action,
        inputs: Array.from(f.querySelectorAll('input:not([type="hidden"]), textarea')).map(i => ({
          name: i.name,
          placeholder: i.placeholder,
          type: i.type
        }))
      }));
    });
    console.log('[#2073 Form Details]:', JSON.stringify(info, null, 2));

  } catch (e) {
    console.error('[#2073 Error]:', e.message);
  } finally {
    await browser.close();
  }
}

async function run() {
  await testCanopy2058();
  await testBMetal2126();
  await testSouthTexas2073();
}

run();
