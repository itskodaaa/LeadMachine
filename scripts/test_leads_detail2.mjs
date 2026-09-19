import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const OUTREACH_PROFILE = {
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
  stateFull: 'Illinois',
  zip: '60601',
  message: `Hello,

I am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects.

We look forward to your response and the possibility of working together.

Thank you for your time and attention.

Sincerely,
Pamela Jameson`
};

async function test3319(browser) {
  console.log('\n--- Retrying #3319: Electron Foundry ---');
  const page = await browser.newPage();
  try {
    await page.goto('https://electronfoundry.com/contact', { waitUntil: 'networkidle2', timeout: 25000 });
    
    // Autofill
    await page.evaluate((p) => {
      const nameInput = document.querySelector('#input9');
      if (nameInput) {
        nameInput.value = p.fullName;
        nameInput.dispatchEvent(new Event('input', { bubbles: true }));
        nameInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
      const emailInput = document.querySelector('#input10');
      if (emailInput) {
        emailInput.value = p.email;
        emailInput.dispatchEvent(new Event('input', { bubbles: true }));
        emailInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
      const msgInput = document.querySelector('textarea');
      if (msgInput) {
        msgInput.value = p.message;
        msgInput.dispatchEvent(new Event('input', { bubbles: true }));
        msgInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }, OUTREACH_PROFILE);

    // Find submit button inside the contact form
    const clicked = await page.evaluate(() => {
      const form = document.querySelector('form');
      if (!form) return 'no form';
      const btns = form.querySelectorAll('button, input[type="submit"]');
      for (const b of btns) {
        if (b.innerText.toLowerCase().includes('submit') || b.type === 'submit' || b.innerText.toLowerCase().includes('send')) {
          b.click();
          return `clicked ${b.innerText || b.value}`;
        }
      }
      if (btns.length > 0) {
        btns[0].click();
        return `clicked first btn: ${btns[0].innerText}`;
      }
      return 'no btn in form';
    });
    console.log('3319 click result:', clicked);
    await new Promise(r => setTimeout(r, 6000));

    const result = await page.evaluate(() => {
      return {
        url: window.location.href,
        text: document.body.innerText.slice(0, 500)
      };
    });
    console.log('3319 result:', result);
  } catch (e) {
    console.log('3319 error:', e.message);
  } finally {
    await page.close().catch(() => {});
  }
}

async function test3320(browser) {
  console.log('\n--- Checking #3320: ASEI Engineering Contact Page content ---');
  const page = await browser.newPage();
  try {
    await page.goto('https://aseiengineering.com/contact-us/', { waitUntil: 'networkidle2', timeout: 25000 });
    const text = await page.evaluate(() => document.body.innerText);
    console.log('3320 text snippet:', text.slice(0, 600));
  } catch (e) {
    console.log('3320 error:', e.message);
  } finally {
    await page.close().catch(() => {});
  }
}

async function test3325(browser) {
  console.log('\n--- Retrying #3325: Keogh Engineering ---');
  const page = await browser.newPage();
  try {
    await page.goto('https://keoghengineering.com/contact-us', { waitUntil: 'networkidle2', timeout: 25000 });
    await page.evaluate((p) => {
      const fName = document.querySelector('#fieldFirstName');
      if (fName) fName.value = p.firstName;
      const lName = document.querySelector('#fieldLastName');
      if (lName) lName.value = p.lastName;
      const email = document.querySelector('#fieldEmail');
      if (email) email.value = p.email;
      const subj = document.querySelector('#fieldSubject');
      if (subj) subj.value = p.subject;
      const msg = document.querySelector('#fieldMessage');
      if (msg) msg.value = p.message;
      const chk = document.querySelector('#fieldSubscribe');
      if (chk) chk.checked = true;

      document.querySelectorAll('input, textarea').forEach(el => {
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      });
    }, OUTREACH_PROFILE);

    const clickRes = await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.toLowerCase().includes('send message') || b.innerText.toLowerCase().includes('submit'));
      if (btn) {
        btn.click();
        return 'clicked send message';
      }
      return 'not found';
    });
    console.log('3325 click:', clickRes);
    await new Promise(r => setTimeout(r, 6000));

    const post = await page.evaluate(() => {
      return {
        url: window.location.href,
        text: document.body.innerText.slice(0, 600),
        alerts: Array.from(document.querySelectorAll('[role="alert"], .alert, .success, .error, .message, [class*="success"], [class*="error"], [class*="message"]')).map(e => e.innerText)
      };
    });
    console.log('3325 post-submit:', JSON.stringify(post, null, 2));
  } catch (e) {
    console.log('3325 error:', e.message);
  } finally {
    await page.close().catch(() => {});
  }
}

async function test3324(browser) {
  console.log('\n--- Retrying #3324: TYPSA ---');
  const page = await browser.newPage();
  try {
    await page.goto('https://typsa.us', { waitUntil: 'networkidle2', timeout: 45000 });
    console.log('3324 arrived at:', page.url());
    const links = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('a')).map(a => ({ href: a.href, text: a.innerText.trim() }));
    });
    console.log('3324 links:', links.filter(l => /contact/i.test(l.href) || /contact/i.test(l.text)));
  } catch (e) {
    console.log('3324 error:', e.message);
  } finally {
    await page.close().catch(() => {});
  }
}

async function test3327(browser) {
  console.log('\n--- Retrying #3327: CMT Technical Services ---');
  const page = await browser.newPage();
  try {
    await page.goto('https://cmttechnicalservices.com', { waitUntil: 'networkidle2', timeout: 45000 });
    console.log('3327 arrived at:', page.url());
    const links = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('a')).map(a => ({ href: a.href, text: a.innerText.trim() }));
    });
    console.log('3327 contact links:', links.filter(l => /contact/i.test(l.href) || /contact/i.test(l.text)));
  } catch (e) {
    console.log('3327 error:', e.message);
  } finally {
    await page.close().catch(() => {});
  }
}

async function test3328(browser) {
  console.log('\n--- Retrying #3328: Ritoch-Powell ---');
  const page = await browser.newPage();
  try {
    await page.goto('http://ritochpowell.com', { waitUntil: 'networkidle2', timeout: 35000 });
    console.log('3328 arrived at:', page.url());
    const formInfo = await page.evaluate(() => {
      return {
        forms: Array.from(document.querySelectorAll('form')).map(f => ({
          action: f.action,
          inputs: Array.from(f.querySelectorAll('input, textarea, select, button')).map(i => ({ tag: i.tagName, type: i.type, name: i.name, id: i.id, placeholder: i.placeholder }))
        })),
        contactLinks: Array.from(document.querySelectorAll('a')).map(a => ({ href: a.href, text: a.innerText.trim() })).filter(l => /contact/i.test(l.href) || /contact/i.test(l.text))
      };
    });
    console.log('3328 info:', JSON.stringify(formInfo, null, 2));
  } catch (e) {
    console.log('3328 error:', e.message);
  } finally {
    await page.close().catch(() => {});
  }
}

async function run() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: true,
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--window-size=1280,800']
  });

  try {
    await test3319(browser);
    await test3320(browser);
    await test3325(browser);
    await test3324(browser);
    await test3327(browser);
    await test3328(browser);
  } finally {
    await browser.close();
  }
}

run().catch(console.error);
