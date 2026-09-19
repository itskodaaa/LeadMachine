import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const P = {
  fullName: 'Pamela Jameson',
  firstName: 'Pamela',
  lastName: 'Jameson',
  email: 'pamela.jameson@nortiheastprecision.com',
  phone: '708-568-3708',
  company: 'Northeast Precision Machinery, Inc.',
  subject: 'Exploring Collaboration Opportunities',
  zip: '33605',
  message: 'Hello, I am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects. Thank you for your time and attention.'
};

async function testLead(name, leadId, url, fillAndSubmit) {
  console.log(`\n==================================================\nStarting #${leadId}: ${name} (${url})`);
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: CHROME_BIN,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  const netResponses = [];
  page.on('response', async (res) => {
    const req = res.request();
    if (req.method() === 'POST' || res.url().includes('collect') || res.url().includes('submit') || res.url().includes('contact') || res.url().includes('wp-json')) {
      try {
        const status = res.status();
        const resUrl = res.url();
        let body = '';
        try { body = (await res.text()).slice(0, 300); } catch (e) {}
        netResponses.push({ url: resUrl, status, body });
      } catch (e) {}
    }
  });

  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 25000 });
    await new Promise(r => setTimeout(r, 1500));
    
    const result = await fillAndSubmit(page);
    console.log(`Result for #${leadId}:`, result);
    console.log('Post responses:', netResponses);
    return { leadId, name, result, netResponses };
  } catch (err) {
    console.log(`Error on #${leadId}:`, err.message);
    return { leadId, name, error: err.message, netResponses };
  } finally {
    await page.close();
    await browser.close();
  }
}

// 4867: Arrow Sheet Metal (Duda platform)
async function run4867() {
  return await testLead('Arrow Sheet Metal', 4867, 'https://www.arrowsheetmetaltampafl.com/contact', async (page) => {
    // Fill fields: dmform-0 (name), dmform-1 (email), dmform-2 (phone), dmform-3 (message)
    await page.type('input[name="dmform-0"]', P.fullName, { delay: 20 });
    await page.type('input[name="dmform-1"]', P.email, { delay: 20 });
    await page.type('input[name="dmform-2"]', P.phone, { delay: 20 });
    await page.type('textarea[name="dmform-3"]', P.message, { delay: 10 });
    
    await new Promise(r => setTimeout(r, 500));
    const submitBtn = await page.$('input[type="submit"]');
    if (submitBtn) {
      await submitBtn.click();
    } else {
      await page.evaluate(() => document.querySelector('form').submit());
    }
    
    await new Promise(r => setTimeout(r, 4000));
    
    return await page.evaluate(() => {
      const text = document.body.innerText;
      const popup = document.querySelector('.dmform-success, .dm-form-response, .form-success, [class*="success"]')?.innerText;
      return { textExcerpt: text.slice(0, 300), popup, currentUrl: window.location.href };
    });
  });
}

// 4868: Tampa Sheet Metal Co (Contact Form 7)
async function run4868() {
  return await testLead('Tampa Sheet Metal Co', 4868, 'https://www.tampasheetmetal.com/contact-us/', async (page) => {
    // Identify name and email inputs by placeholder
    await page.evaluate((p) => {
      const inputs = Array.from(document.querySelectorAll('input, textarea'));
      for (const el of inputs) {
        const ph = (el.placeholder || '').toLowerCase();
        if (ph.includes('name')) el.value = p.fullName;
        else if (ph.includes('email')) el.value = p.email;
        else if (ph.includes('subject')) el.value = p.subject;
        else if (ph.includes('message') || el.tagName.toLowerCase() === 'textarea') el.value = p.message;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }, P);

    await new Promise(r => setTimeout(r, 500));
    const submitBtn = await page.$('input.wpcf7-submit, input[type="submit"]');
    if (submitBtn) await submitBtn.click();

    await new Promise(r => setTimeout(r, 5000));
    return await page.evaluate(() => {
      const output = document.querySelector('.wpcf7-response-output')?.innerText;
      const status = document.querySelector('.wpcf7-form')?.getAttribute('data-status');
      return { output, status, textExcerpt: document.body.innerText.slice(0, 300) };
    });
  });
}

// 4869: SWS Contracting LLC (GoDaddy)
async function run4869() {
  return await testLead('SWS Contracting LLC', 4869, 'https://swscontracting.com/', async (page) => {
    // Fill GoDaddy form
    await page.evaluate((p) => {
      const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"]), textarea'));
      for (const el of inputs) {
        const id = (el.id || '').toLowerCase();
        const ph = (el.placeholder || el.getAttribute('aria-label') || '').toLowerCase();
        const label = (el.closest('label')?.innerText || el.previousElementSibling?.innerText || el.parentElement?.innerText || '').toLowerCase();
        const combined = `${id} ${ph} ${label}`;

        if (el.tagName.toLowerCase() === 'textarea' || combined.includes('message')) {
          el.value = p.message;
        } else if (combined.includes('email')) {
          el.value = p.email;
        } else if (combined.includes('phone')) {
          el.value = p.phone;
        } else if (combined.includes('name')) {
          el.value = p.fullName;
        }
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }, P);

    await new Promise(r => setTimeout(r, 500));
    // Click button with text Send or submit
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const sendBtn = btns.find(b => b.innerText.trim().toLowerCase() === 'send' || b.innerText.trim().toLowerCase() === 'submit');
      if (sendBtn) sendBtn.click();
    });

    await new Promise(r => setTimeout(r, 5000));
    return await page.evaluate(() => {
      const alert = document.querySelector('[role="alert"], .form-response, [data-aid*="SUCCESS"]')?.innerText;
      return { alert, textExcerpt: document.body.innerText.slice(0, 400) };
    });
  });
}

(async () => {
  await run4867();
  await run4868();
  await run4869();
})();
