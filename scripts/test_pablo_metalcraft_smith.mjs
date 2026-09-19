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

async function testPablo() {
  console.log('\n==============================');
  console.log('Testing Lead #4861: Pablo Machine Shop');
  console.log('==============================');
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: CHROME_BIN,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
  });
  const page = await browser.newPage();
  try {
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.goto('https://www.pablosmachineshopmedley.com/contact-us', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 4000));

    // Fill first name
    const fn = await page.$('#form-field-input-71fd090a-f50b-4d42-0365-f3a73f986a13-comp-mlcjc6dx-');
    if (fn) {
      await fn.click();
      await fn.type(OUTREACH.firstName);
    }

    // Fill last name
    const ln = await page.$('#form-field-input-63dc06d6-4985-4f70-4a95-ce385ce725b5-comp-mlcjc6dx-');
    if (ln) {
      await ln.click();
      await ln.type(OUTREACH.lastName);
    }

    // Fill email
    const em = await page.$('#form-field-input-0315bf47-381a-4a0e-203d-4085265c0714-comp-mlcjc6dx-');
    if (em) {
      await em.click();
      await em.type(OUTREACH.email);
    }

    // Fill subject
    const subj = await page.$('#form-field-input-9d207ed2-3ed3-4aa9-d7df-064f954e1544-comp-mlcjc6dx-');
    if (subj) {
      await subj.click();
      await subj.type(OUTREACH.subject);
    }

    // Fill phone
    const ph = await page.$('#form-field-input-5f2136ed-3fa6-4d84-0966-459267caec11-comp-mlcjc6dx-');
    if (ph) {
      await ph.click();
      await ph.type(OUTREACH.phone);
    }

    // Select Service Needed checkboxes: Welding and Machining
    console.log('Checking Service Needed checkboxes...');
    await page.evaluate(() => {
      const cb1 = document.querySelector('#checkbox-3558'); // Welding
      if (cb1) {
        cb1.checked = true;
        cb1.dispatchEvent(new Event('change', { bubbles: true }));
        cb1.dispatchEvent(new Event('input', { bubbles: true }));
      }
      const cb2 = document.querySelector('#checkbox-3561'); // Machining
      if (cb2) {
        cb2.checked = true;
        cb2.dispatchEvent(new Event('change', { bubbles: true }));
        cb2.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });

    // Also click label directly
    const weldingLabel = await page.$('label[for="checkbox-3558"]');
    if (weldingLabel) {
      await weldingLabel.click();
    }

    // Fill message
    const msg = await page.$('#form-field-input-3176011d-c666-4d6f-3085-6959dd0df8b5-comp-mlcjc6dx-');
    if (msg) {
      await msg.click();
      await msg.type(OUTREACH.message);
    }

    // Log network responses
    page.on('response', async res => {
      const u = res.url();
      if (u.includes('wix') && (u.includes('form') || u.includes('submit') || u.includes('submission'))) {
        try {
          const body = await res.text();
          console.log(`Pablo Wix Response [${res.status()}]:`, body.slice(0, 200));
        } catch (e) {}
      }
    });

    // Click submit button: "Request a Quote"
    console.log('Submitting Pablo form...');
    const submitBtn = await page.evaluateHandle(() => {
      return Array.from(document.querySelectorAll('button')).find(b => (b.innerText || '').includes('Request a Quote') || (b.innerText || '').includes('Submit'));
    });

    if (submitBtn) {
      await submitBtn.click();
    }

    await new Promise(r => setTimeout(r, 6000));

    const postState = await page.evaluate(() => {
      const text = document.body.innerText;
      const successMsg = Array.from(document.querySelectorAll('[data-testid="notifications"], [role="alert"], [class*="success"], [class*="message"]'))
        .map(e => e.innerText.trim())
        .filter(Boolean);
      return {
        successMsg,
        snippet: text.slice(text.indexOf('GET IN TOUCH'), text.indexOf('GET IN TOUCH') + 1200)
      };
    });
    console.log('Pablo post-submission result:', postState);
  } catch (e) {
    console.error('Pablo error:', e);
  } finally {
    await browser.close();
  }
}

async function testMetalcraft() {
  console.log('\n==============================');
  console.log('Testing Lead #4866: Metalcraft Services');
  console.log('==============================');
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: CHROME_BIN,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
  });
  const page = await browser.newPage();
  try {
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.goto('https://www.metalcraftservices.com/', { waitUntil: 'domcontentloaded', timeout: 35000 });
    await new Promise(r => setTimeout(r, 4000));

    // Scroll to form
    await page.evaluate(() => {
      const f = document.querySelector('form');
      if (f) f.scrollIntoView();
    });
    await new Promise(r => setTimeout(r, 1000));

    // Fill Name
    const nameInput = await page.$('#input_comp-jhrhzupi');
    if (nameInput) {
      await nameInput.click();
      await nameInput.type(OUTREACH.fullName);
    }

    // Fill Email
    const emailInput = await page.$('#input_comp-jhri006s');
    if (emailInput) {
      await emailInput.click();
      await emailInput.type(OUTREACH.email);
    }

    // Fill Subject
    const subjInput = await page.$('#input_comp-jhri04vj');
    if (subjInput) {
      await subjInput.click();
      await subjInput.type(OUTREACH.subject);
    }

    // Fill Message
    const msgInput = await page.$('#textarea_comp-jhri0h6x');
    if (msgInput) {
      await msgInput.click();
      await msgInput.type(OUTREACH.message);
    }

    // Inspect and check the checkbox
    const cbInfo = await page.evaluate(() => {
      const cb = document.querySelector('form input[type="checkbox"]');
      if (cb) {
        cb.checked = true;
        cb.dispatchEvent(new Event('change', { bubbles: true }));
        cb.dispatchEvent(new Event('input', { bubbles: true }));
        return {
          id: cb.id,
          label: cb.closest('label')?.innerText || ''
        };
      }
      return null;
    });
    console.log('Metalcraft checkbox info:', cbInfo);

    // Also click label if found
    const cbLabel = await page.$('form label:has(input[type="checkbox"]), form [data-testid="checkbox-label"]');
    if (cbLabel) {
      await cbLabel.click();
    }

    page.on('response', async res => {
      const u = res.url();
      if (u.includes('wix') && (u.includes('form') || u.includes('submit') || u.includes('submission'))) {
        try {
          const b = await res.text();
          console.log(`Metalcraft Wix Response [${res.status()}]:`, b.slice(0, 200));
        } catch (e) {}
      }
    });

    console.log('Clicking submit button on Metalcraft...');
    const submitBtn = await page.$('form button, button[data-testid="buttonElement"]');
    if (submitBtn) {
      await submitBtn.click();
    }

    await new Promise(r => setTimeout(r, 6000));

    const postState = await page.evaluate(() => {
      const notes = Array.from(document.querySelectorAll('[data-testid="notifications"], [role="alert"], [class*="success"], [class*="message"]'))
        .map(e => e.innerText.trim())
        .filter(Boolean);
      return {
        notes,
        formHtml: document.querySelector('form')?.innerText || 'No form'
      };
    });
    console.log('Metalcraft post-submission result:', postState);
  } catch (e) {
    console.error('Metalcraft error:', e);
  } finally {
    await browser.close();
  }
}

async function testSmithHamilton() {
  console.log('\n==============================');
  console.log('Testing Lead #4860: Smith Hamilton');
  console.log('==============================');
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: CHROME_BIN,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
  });
  const page = await browser.newPage();
  try {
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.goto('https://smithhamiltonfl.com/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 3000));

    // Scroll to contact form
    await page.evaluate(() => {
      const f = document.querySelector('form.wpcf7-form');
      if (f) f.scrollIntoView();
    });
    await new Promise(r => setTimeout(r, 1000));

    const nameInput = await page.$('form.wpcf7-form input[name="nombre"]');
    if (nameInput) {
      await nameInput.click();
      await nameInput.type(OUTREACH.fullName);
    }

    const emailInput = await page.$('form.wpcf7-form input[name="mail"]');
    if (emailInput) {
      await emailInput.click();
      await emailInput.type(OUTREACH.email);
    }

    const msgInput = await page.$('form.wpcf7-form textarea[name="comments"]');
    if (msgInput) {
      await msgInput.click();
      await msgInput.type(OUTREACH.message);
    }

    page.on('response', async res => {
      if (res.url().includes('feedback') || res.url().includes('wp-json')) {
        try {
          const body = await res.text();
          console.log(`Smith Hamilton Response [${res.status()}]:`, body.slice(0, 200));
        } catch (e) {}
      }
    });

    console.log('Clicking SEND on Smith Hamilton...');
    const btn = await page.$('form.wpcf7-form input[type="submit"]');
    if (btn) {
      await btn.click();
    }

    for (let i = 0; i < 20; i++) {
      await new Promise(r => setTimeout(r, 500));
      const res = await page.evaluate(() => {
        const out = document.querySelector('.wpcf7-response-output');
        const form = document.querySelector('form.wpcf7-form');
        return {
          status: form?.getAttribute('data-status'),
          text: out?.innerText.trim()
        };
      });
      if (res.status && res.status !== 'init') {
        console.log(`Smith Hamilton at ${(i + 1) * 0.5}s: status=${res.status}, text=${res.text}`);
        if (res.status !== 'submitting') break;
      }
    }
  } catch (e) {
    console.error('Smith Hamilton error:', e);
  } finally {
    await browser.close();
  }
}

async function run() {
  await testPablo();
  await testMetalcraft();
  await testSmithHamilton();
}

run();
