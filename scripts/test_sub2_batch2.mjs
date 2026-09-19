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

async function test4861(browser) {
  console.log('\n--- Testing Lead #4861: Pablos Machine Shop (Wix Form) ---');
  const page = await browser.newPage();
  try {
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.goto('https://www.pablosmachineshopmedley.com/contact-us', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 4000));

    // Inspect fields of the form
    const formFields = await page.evaluate(() => {
      const form = document.querySelector('form');
      if (!form) return null;
      return Array.from(form.querySelectorAll('input, textarea, button')).map(el => ({
        tag: el.tagName,
        id: el.id,
        name: el.name,
        type: el.type,
        placeholder: el.placeholder,
        ariaLabel: el.getAttribute('aria-label'),
        label: el.closest('label')?.innerText || document.querySelector(`label[for="${el.id}"]`)?.innerText || '',
        visible: el.offsetParent !== null
      }));
    });
    console.log('Fields in #4861:', JSON.stringify(formFields, null, 2));

    // Fill the fields using page.type and simulate real user input
    // First Name
    const firstNameInput = await page.$('input[placeholder*="First"], input[name*="first"], #form-field-input-71fd090a-f50b-4d42-0365-f3a73f986a13-comp-mlcjc6dx-');
    if (firstNameInput) {
      await firstNameInput.click();
      await firstNameInput.type(OUTREACH.firstName);
    }

    // Last Name
    const lastNameInput = await page.$('input[placeholder*="Last"], input[name*="last"], #form-field-input-63dc06d6-4985-4f70-4a95-ce385ce725b5-comp-mlcjc6dx-');
    if (lastNameInput) {
      await lastNameInput.click();
      await lastNameInput.type(OUTREACH.lastName);
    }

    // Email
    const emailInput = await page.$('input[type="email"], #form-field-input-0315bf47-381a-4a0e-203d-4085265c0714-comp-mlcjc6dx-');
    if (emailInput) {
      await emailInput.click();
      await emailInput.type(OUTREACH.email);
    }

    // Phone
    const phoneInput = await page.$('input[type="tel"], #form-field-input-9d207ed2-3ed3-4aa9-d7df-064f954e1544-comp-mlcjc6dx-');
    if (phoneInput) {
      await phoneInput.click();
      await phoneInput.type(OUTREACH.phone);
    }

    // Company / extra
    const extraInput = await page.$('#form-field-input-5f2136ed-3fa6-4d84-0966-459267caec11-comp-mlcjc6dx-');
    if (extraInput) {
      await extraInput.click();
      await extraInput.type(OUTREACH.company);
    }

    // Message
    const msgInput = await page.$('textarea, #form-field-input-3176011d-c666-4d6f-3085-6959dd0df8b5-comp-mlcjc6dx-');
    if (msgInput) {
      await msgInput.click();
      await msgInput.type(OUTREACH.message);
    }

    // Listen for responses
    page.on('response', res => {
      if (res.url().includes('wix') || res.url().includes('submit') || res.url().includes('form')) {
        console.log('#4861 Response:', res.status(), res.url().slice(0, 100));
      }
    });

    console.log('Submitting #4861...');
    const submitBtn = await page.$('button[data-testid="buttonElement"], button[type="submit"], form button');
    if (submitBtn) {
      await submitBtn.click();
    }

    await new Promise(r => setTimeout(r, 6000));

    const result = await page.evaluate(() => {
      const notifications = Array.from(document.querySelectorAll('[data-testid="notifications"], [role="alert"], [class*="notification"], [class*="success"], [class*="message"]'))
        .map(el => el.innerText.trim())
        .filter(Boolean);
      return {
        notifications,
        bodySnippet: document.body.innerText.slice(0, 600)
      };
    });
    console.log('Post submit #4861:', result);
  } catch (e) {
    console.error('Error in #4861:', e.message);
  } finally {
    await page.close().catch(() => {});
  }
}

async function test4864(browser) {
  console.log('\n--- Testing Lead #4864: Elkins Electric ---');
  const page = await browser.newPage();
  try {
    await page.setExtraHTTPHeaders({
      'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'accept-language': 'en-US,en;q=0.9',
      'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"macOS"',
      'sec-fetch-dest': 'document',
      'sec-fetch-mode': 'navigate',
      'sec-fetch-site': 'none',
      'sec-fetch-user': '?1',
      'upgrade-insecure-requests': '1'
    });
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    const res = await page.goto('https://elkinselectric.com/', { waitUntil: 'domcontentloaded', timeout: 20000 });
    console.log('HTTP status #4864:', res.status());
    const text = await page.evaluate(() => document.body.innerText.slice(0, 300));
    console.log('Body #4864:', text);
  } catch (e) {
    console.error('Error in #4864:', e.message);
  } finally {
    await page.close().catch(() => {});
  }
}

async function test4865(browser) {
  console.log('\n--- Testing Lead #4865: Rustic Steel ---');
  const page = await browser.newPage();
  try {
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.goto('https://rusticsteel.com/pages/contact-us', { waitUntil: 'domcontentloaded', timeout: 20000 });
    const content = await page.evaluate(() => {
      return {
        text: document.body.innerText,
        forms: document.querySelectorAll('form').length,
        mailtos: Array.from(document.querySelectorAll('a[href^="mailto:"]')).map(a => a.href)
      };
    });
    console.log('Rustic Steel content:', content.text.slice(0, 400));
    console.log('Rustic Steel mailtos:', content.mailtos);
  } catch (e) {
    console.error('Error in #4865:', e.message);
  } finally {
    await page.close().catch(() => {});
  }
}

async function test4866(browser) {
  console.log('\n--- Testing Lead #4866: Metalcraft Services (Wix Form) ---');
  const page = await browser.newPage();
  try {
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.goto('https://www.metalcraftservices.com/', { waitUntil: 'domcontentloaded', timeout: 35000 });
    await new Promise(r => setTimeout(r, 4000));

    const fields = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('form input, form textarea')).map(i => ({
        id: i.id,
        name: i.name,
        type: i.type,
        placeholder: i.placeholder,
        required: i.required
      }));
      return inputs;
    });
    console.log('Metalcraft fields:', fields);

    // Name
    await page.type('#input_comp-jhrhzupi', OUTREACH.fullName);
    // Email
    await page.type('#input_comp-jhri006s', OUTREACH.email);
    // Subject
    await page.type('#input_comp-jhri04vj', OUTREACH.subject);
    // Message
    await page.type('#textarea_comp-jhri0h6x', OUTREACH.message);

    // Check checkbox if exists
    const cb = await page.$('form input[type="checkbox"]');
    if (cb) {
      await page.evaluate(el => el.click(), cb);
    }

    console.log('Submitting #4866...');
    const btn = await page.$('form button, button[type="submit"]');
    if (btn) {
      await page.evaluate(el => el.click(), btn);
    }

    await new Promise(r => setTimeout(r, 6000));
    const post = await page.evaluate(() => {
      const alerts = Array.from(document.querySelectorAll('[data-testid="notifications"], [role="alert"], [class*="notification"], [class*="success"], [class*="message"]'))
        .map(el => el.innerText.trim())
        .filter(Boolean);
      return {
        alerts,
        text: document.body.innerText.slice(0, 500)
      };
    });
    console.log('Post submit #4866:', post);
  } catch (e) {
    console.error('Error in #4866:', e.message);
  } finally {
    await page.close().catch(() => {});
  }
}

async function run() {
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: CHROME_BIN,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
  });

  await test4861(browser);
  await test4864(browser);
  await test4865(browser);
  await test4866(browser);

  await browser.close();
}

run();
