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
  zip: '33610',
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
    if (req.method() === 'POST' || res.url().includes('form') || res.url().includes('contact') || res.url().includes('submit')) {
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
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));
    
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

// 4871: Quality Steel Fabricators (Squarespace)
async function run4871() {
  return await testLead('Quality Steel Fabricators', 4871, 'https://www.qualitysteelfab.com/contact', async (page) => {
    // Check form structure
    const formInfo = await page.evaluate(() => {
      const form = document.querySelector('form');
      const btns = Array.from(document.querySelectorAll('button, input[type="submit"]')).map(b => ({
        tag: b.tagName, type: b.type, text: b.innerText || b.value, class: b.className
      }));
      return { form: !!form, formAction: form?.action, btns };
    });
    console.log('4871 form info:', formInfo);

    // Autofill
    await page.evaluate((p) => {
      const inputs = Array.from(document.querySelectorAll('input, textarea, select'));
      for (const el of inputs) {
        const id = (el.id || '').toLowerCase();
        const name = (el.name || '').toLowerCase();
        // Skip honeypot
        if (id.includes('message-field') || name.includes('message-yui')) continue;

        if (name === 'fname' || id.includes('fname')) {
          el.value = p.firstName;
        } else if (name === 'lname' || id.includes('lname')) {
          el.value = p.lastName;
        } else if (id.includes('email')) {
          el.value = p.email;
        } else if (id.includes('text-yui')) {
          el.value = p.subject;
        } else if (el.tagName.toLowerCase() === 'textarea' || id.includes('textarea')) {
          el.value = p.message;
        }
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        el.dispatchEvent(new Event('blur', { bubbles: true }));
      }
    }, P);

    await new Promise(r => setTimeout(r, 1000));
    // Click submit button
    const clicked = await page.evaluate(() => {
      const submitBtn = document.querySelector('.form-button-wrapper input[type="submit"], input[type="submit"], button.sqs-system-button, button[type="submit"]');
      if (submitBtn) {
        submitBtn.click();
        return submitBtn.value || submitBtn.innerText || 'clicked';
      }
      return null;
    });
    console.log('4871 Clicked:', clicked);

    await new Promise(r => setTimeout(r, 6000));
    return await page.evaluate(() => {
      const successMsg = document.querySelector('.form-submission-text, .form-submission-html, .form-submitted')?.innerText;
      return { successMsg, textExcerpt: document.body.innerText.slice(0, 400) };
    });
  });
}

// 4873: Reliable Welding & Steel Supply
async function run4873() {
  return await testLead('Reliable Welding & Steel Supply', 4873, 'https://reliableweldingandsteelsupply.com/contact.html/', async (page) => {
    // Inputs:
    // "Enter your name"
    // "Enter your email address"
    // "Enter your phone number"
    // "Enter your message"
    await page.evaluate((p) => {
      const inputs = Array.from(document.querySelectorAll('input, textarea'));
      for (const el of inputs) {
        const ph = (el.placeholder || '').toLowerCase();
        if (ph.includes('name')) el.value = p.fullName;
        else if (ph.includes('email')) el.value = p.email;
        else if (ph.includes('phone')) el.value = p.phone;
        else if (ph.includes('message') || el.tagName.toLowerCase() === 'textarea') el.value = p.message;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }, P);

    await new Promise(r => setTimeout(r, 1000));
    const clicked = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button, input[type="submit"]'));
      const submitBtn = btns.find(b => (b.innerText || b.value || '').toLowerCase().includes('submit') || (b.innerText || b.value || '').toLowerCase().includes('send'));
      if (submitBtn) {
        submitBtn.click();
        return submitBtn.innerText || submitBtn.value;
      }
      // Or form submit
      const form = document.querySelector('form');
      if (form) {
        form.submit();
        return 'form.submit()';
      }
      return null;
    });
    console.log('4873 Clicked:', clicked);

    await new Promise(r => setTimeout(r, 5000));
    return await page.evaluate(() => {
      return { url: window.location.href, textExcerpt: document.body.innerText.slice(0, 400) };
    });
  });
}

// 4874: OdysseyFAB
async function run4874() {
  return await testLead('OdysseyFAB', 4874, 'https://odysseyfab.com/pages/contact-us', async (page) => {
    // Inputs: ContactForm-name, ContactForm-email, ContactForm-phone, ContactForm-message
    await page.evaluate((p) => {
      const name = document.querySelector('#ContactForm-name');
      const email = document.querySelector('#ContactForm-email');
      const phone = document.querySelector('#ContactForm-phone');
      const msg = document.querySelector('#ContactForm-message');
      if (name) name.value = p.fullName;
      if (email) email.value = p.email;
      if (phone) phone.value = p.phone;
      if (msg) msg.value = p.message;
      [name, email, phone, msg].forEach(el => {
        if (el) {
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });
    }, P);

    await new Promise(r => setTimeout(r, 1000));
    const clicked = await page.evaluate(() => {
      const form = document.querySelector('form[action*="contact"]');
      const submitBtn = form?.querySelector('input[type="submit"], button[type="submit"]');
      if (submitBtn) {
        submitBtn.click();
        return submitBtn.value || submitBtn.innerText || 'clicked';
      }
      return null;
    });
    console.log('4874 Clicked:', clicked);

    await new Promise(r => setTimeout(r, 6000));
    return await page.evaluate(() => {
      const postSuccess = document.querySelector('.form-status-list, .form__message, [tabindex="-1"]')?.innerText;
      return { url: window.location.href, postSuccess, textExcerpt: document.body.innerText.slice(0, 400) };
    });
  });
}

// 4875: Tampa Metal Works Inc (Duda)
async function run4875() {
  return await testLead('Tampa Metal Works Inc', 4875, 'https://www.tampametalworksinc.com/contact', async (page) => {
    // Duda form inputs: dmform-0 (name), dmform-1 (email), dmform-2 (phone), dmform-4 (zip), dmform-3 (message)
    await page.evaluate((p) => {
      const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"]), textarea'));
      for (const el of inputs) {
        const name = (el.name || '').toLowerCase();
        const ph = (el.placeholder || '').toLowerCase();
        if (name === 'dmform-0' || ph.includes('name')) el.value = p.fullName;
        else if (name === 'dmform-1' || ph.includes('email')) el.value = p.email;
        else if (name === 'dmform-2' || ph.includes('phone')) el.value = p.phone;
        else if (name === 'dmform-4' || ph.includes('zip')) el.value = p.zip;
        else if (name === 'dmform-3' || ph.includes('message') || el.tagName.toLowerCase() === 'textarea') el.value = p.message;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        el.dispatchEvent(new Event('blur', { bubbles: true }));
      }
    }, P);

    await new Promise(r => setTimeout(r, 1000));
    const clicked = await page.evaluate(() => {
      const btn = document.querySelector('input[name="submit"], input[type="submit"]');
      if (btn) {
        btn.click();
        return btn.value || 'clicked';
      }
      return null;
    });
    console.log('4875 Clicked:', clicked);

    await new Promise(r => setTimeout(r, 5000));
    return await page.evaluate(() => {
      const popup = document.querySelector('.dmform-success, .dm-form-response, .form-success, [class*="success"]')?.innerText;
      return { popup, textExcerpt: document.body.innerText.slice(0, 400) };
    });
  });
}

(async () => {
  await run4871();
  await run4873();
  await run4874();
  await run4875();
})();
