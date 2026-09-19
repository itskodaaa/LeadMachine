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
    if (req.method() === 'POST' || res.url().includes('collect') || res.url().includes('submit') || res.url().includes('contact') || res.url().includes('email')) {
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
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });
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

// 4869: SWS Contracting LLC (GoDaddy)
async function run4869() {
  return await testLead('SWS Contracting LLC', 4869, 'https://swscontracting.com/', async (page) => {
    // GoDaddy form inputs: Name, Email, Phone, Message
    const fillResult = await page.evaluate((p) => {
      const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"]), textarea'));
      const details = [];
      for (const el of inputs) {
        const ph = (el.placeholder || el.getAttribute('aria-label') || '').toLowerCase();
        const label = (el.closest('label')?.innerText || el.previousElementSibling?.innerText || el.parentElement?.innerText || '').toLowerCase();
        const combined = `${el.id} ${ph} ${label}`;
        let filled = '';
        if (el.tagName.toLowerCase() === 'textarea' || combined.includes('message')) {
          el.value = p.message;
          filled = 'message';
        } else if (combined.includes('email')) {
          el.value = p.email;
          filled = 'email';
        } else if (combined.includes('phone') || combined.includes('tel')) {
          el.value = p.phone;
          filled = 'phone';
        } else if (combined.includes('name')) {
          el.value = p.fullName;
          filled = 'name';
        }
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        el.dispatchEvent(new Event('blur', { bubbles: true }));
        details.push({ id: el.id, label, placeholder: el.placeholder, filled });
      }
      return details;
    }, P);
    console.log('4869 filled details:', fillResult);

    await new Promise(r => setTimeout(r, 1000));
    
    // Find and click the Send button
    const clicked = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button, input[type="submit"]'));
      const sendBtn = btns.find(b => b.innerText.trim().toLowerCase() === 'send' || b.innerText.trim().toLowerCase() === 'submit' || b.innerText.trim().toLowerCase() === 'contact us now!');
      if (sendBtn) {
        sendBtn.click();
        return sendBtn.innerText.trim();
      }
      return null;
    });
    console.log('Clicked button:', clicked);

    await new Promise(r => setTimeout(r, 5000));
    return await page.evaluate(() => {
      const alert = document.querySelector('[role="alert"], .form-response, [data-aid*="SUCCESS"], [data-aid*="MESSAGE"]')?.innerText;
      return { alert, text: document.body.innerText.slice(0, 500) };
    });
  });
}

// 4870: Iron Transformation LLC
async function run4870() {
  return await testLead('Iron Transformation LLC', 4870, 'https://irontransformation.com/', async (page) => {
    // Fill Iron Transformation form
    // Inputs:
    // placeholder: "How should we address you?" -> Name
    // placeholder: "Where can we reply?" -> Email
    // placeholder: "Your phone number" -> Phone
    // select -> first option
    // placeholder: "Ask Laura anything…" -> Message
    const fillResult = await page.evaluate((p) => {
      const inputs = Array.from(document.querySelectorAll('input, textarea, select'));
      for (const el of inputs) {
        const ph = (el.placeholder || '').toLowerCase();
        if (ph.includes('address you') || ph.includes('name')) {
          el.value = p.fullName;
        } else if (ph.includes('reply') || ph.includes('email')) {
          el.value = p.email;
        } else if (ph.includes('phone')) {
          el.value = p.phone;
        } else if (ph.includes('ask laura') || ph.includes('message') || el.tagName.toLowerCase() === 'textarea') {
          el.value = p.message;
        } else if (el.tagName.toLowerCase() === 'select') {
          if (el.options.length > 1) el.selectedIndex = 1;
        }
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        el.dispatchEvent(new Event('blur', { bubbles: true }));
      }
    }, P);

    await new Promise(r => setTimeout(r, 1000));
    const clicked = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const sendBtn = btns.find(b => b.innerText.includes('SEND THE FIRST NOTE') || b.innerText.includes('SEND') || b.innerText.includes('Get a free quote'));
      if (sendBtn) {
        sendBtn.click();
        return sendBtn.innerText.trim();
      }
      return null;
    });
    console.log('4870 Clicked:', clicked);

    await new Promise(r => setTimeout(r, 5000));
    return await page.evaluate(() => {
      return {
        url: window.location.href,
        alert: document.querySelector('[role="alert"], [class*="success"], [class*="confirm"]')?.innerText,
        bodyExcerpt: document.body.innerText.slice(0, 500)
      };
    });
  });
}

// 4871: Quality Steel Fabricators (Squarespace)
async function run4871() {
  return await testLead('Quality Steel Fabricators', 4871, 'https://www.qualitysteelfab.com/contact', async (page) => {
    // Fill Squarespace form carefully, avoiding honeypot!
    await page.evaluate((p) => {
      const inputs = Array.from(document.querySelectorAll('input, textarea, select'));
      for (const el of inputs) {
        const id = (el.id || '').toLowerCase();
        const name = (el.name || '').toLowerCase();
        
        // Squarespace honeypot is "message-field" or contains "message-yui"
        if (id.includes('message-field') || name.includes('message-yui')) {
          console.log('Skipping Squarespace honeypot:', id, name);
          continue;
        }

        if (name === 'fname' || id.includes('fname')) {
          el.value = p.firstName;
        } else if (name === 'lname' || id.includes('lname')) {
          el.value = p.lastName;
        } else if (id.includes('email')) {
          el.value = p.email;
        } else if (id.includes('text-yui')) { // Subject
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
    const clicked = await page.evaluate(() => {
      const btn = document.querySelector('button[type="submit"], input[type="submit"]');
      if (btn) {
        btn.click();
        return btn.innerText || btn.value;
      }
      return null;
    });
    console.log('4871 Clicked:', clicked);

    await new Promise(r => setTimeout(r, 5000));
    return await page.evaluate(() => {
      const formSubmitted = document.querySelector('.form-submission-text, .form-submission-html, .form-submitted')?.innerText;
      return { formSubmitted, bodyExcerpt: document.body.innerText.slice(0, 500) };
    });
  });
}

// 4872: Advantage Steel Inc (GoDaddy)
async function run4872() {
  return await testLead('Advantage Steel Inc', 4872, 'https://advantagesteelinc.com/', async (page) => {
    // GoDaddy form
    const fillResult = await page.evaluate((p) => {
      const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"]), textarea'));
      const details = [];
      for (const el of inputs) {
        if (el.type === 'file' || el.type === 'checkbox') continue;
        const ph = (el.placeholder || el.getAttribute('aria-label') || '').toLowerCase();
        const label = (el.closest('label')?.innerText || el.previousElementSibling?.innerText || el.parentElement?.innerText || '').toLowerCase();
        const combined = `${el.id} ${ph} ${label}`;
        let filled = '';
        if (el.tagName.toLowerCase() === 'textarea' || combined.includes('message')) {
          el.value = p.message;
          filled = 'message';
        } else if (combined.includes('email')) {
          el.value = p.email;
          filled = 'email';
        } else if (combined.includes('phone') || combined.includes('tel')) {
          el.value = p.phone;
          filled = 'phone';
        } else if (combined.includes('name')) {
          el.value = p.fullName;
          filled = 'name';
        }
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        el.dispatchEvent(new Event('blur', { bubbles: true }));
        details.push({ id: el.id, label, placeholder: el.placeholder, filled });
      }
      return details;
    }, P);
    console.log('4872 filled details:', fillResult);

    await new Promise(r => setTimeout(r, 1000));
    const clicked = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button, input[type="submit"]'));
      const sendBtn = btns.find(b => b.innerText.trim().toLowerCase() === 'send');
      if (sendBtn) {
        sendBtn.click();
        return sendBtn.innerText.trim();
      }
      return null;
    });
    console.log('4872 Clicked:', clicked);

    await new Promise(r => setTimeout(r, 5000));
    return await page.evaluate(() => {
      const alert = document.querySelector('[role="alert"], .form-response, [data-aid*="SUCCESS"], [data-aid*="MESSAGE"]')?.innerText;
      return { alert, text: document.body.innerText.slice(0, 500) };
    });
  });
}

(async () => {
  await run4869();
  await run4870();
  await run4871();
  await run4872();
})();
