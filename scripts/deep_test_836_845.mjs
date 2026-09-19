import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import db from './db.mjs';
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
  message: `Hello,

I am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects.

We look forward to your response and the possibility of working together.

Thank you for your time and attention.

Sincerely,
Pamela Jameson`
};

async function testLead837(browser) {
  console.log('\n--- Deep Testing Lead #837: Queens Engineering PLLC ---');
  const page = await browser.newPage();
  try {
    await page.goto('https://qnspc.com/contact', { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Inspect DOM of form
    const formInfo = await page.evaluate(() => {
      const form = document.querySelector('form');
      if (!form) return null;
      const elements = Array.from(form.querySelectorAll('input, textarea, button, label'));
      return elements.map(el => ({
        tag: el.tagName,
        type: el.type || '',
        name: el.name || '',
        id: el.id || '',
        placeholder: el.placeholder || '',
        text: el.innerText || el.value || '',
        labels: el.labels ? Array.from(el.labels).map(l => l.innerText) : []
      }));
    });
    console.log('Form 837 elements:', JSON.stringify(formInfo, null, 2));

    // Fill form using Puppeteer keyboard typing
    // Let's identify the fields:
    // input5 and input6
    // Let's find labels or placeholders
    await page.evaluate((p) => {
      const inputs = Array.from(document.querySelectorAll('input[type="text"], textarea'));
      for (const input of inputs) {
        const id = input.id || '';
        const ph = (input.placeholder || '').toLowerCase();
        const parentText = (input.closest('div')?.innerText || '').toLowerCase();
        
        if (input.tagName.toLowerCase() === 'textarea' || ph.includes('message') || parentText.includes('message')) {
          input.value = p.message;
        } else if (ph.includes('name') || parentText.includes('name') || id === 'input5') {
          input.value = p.fullName;
        } else if (ph.includes('email') || parentText.includes('email') || id === 'input6') {
          input.value = p.email;
        }
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }, OUTREACH_PROFILE);

    await page.screenshot({ path: 'screenshots/lead_837_filled.png' });

    // Click submit
    console.log('Submitting #837...');
    await Promise.all([
      page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('button, input[type="submit"]')).find(b => (b.innerText || b.value || '').includes('SEND'));
        if (btn) btn.click();
      }),
      new Promise(r => setTimeout(r, 6000))
    ]);

    await page.screenshot({ path: 'screenshots/lead_837_submitted.png' });
    const postSubmit = await page.evaluate(() => {
      return {
        bodyText: document.body.innerText.substring(0, 500),
        alerts: Array.from(document.querySelectorAll('[role="alert"], .success, .alert, .message, .wixui-form__message')).map(e => e.innerText)
      };
    });
    console.log('Post submit #837:', postSubmit);

  } catch (err) {
    console.log('Error testing #837:', err);
  } finally {
    await page.close();
  }
}

async function testLead844(browser) {
  console.log('\n--- Deep Testing Lead #844: LERA Consulting Structural Engineers ---');
  const page = await browser.newPage();
  try {
    await page.goto('https://www.lera.com/offices', { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Inspect DOM of form on lera.com
    const formInfo = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input, textarea, button'));
      return inputs.map(el => {
        const label = document.querySelector(`label[for="${el.id}"]`)?.innerText || el.closest('div')?.querySelector('label')?.innerText || '';
        return {
          tag: el.tagName,
          id: el.id,
          type: el.type,
          name: el.name,
          label: label.trim(),
          placeholder: el.placeholder
        };
      });
    });
    console.log('Form 844 elements:', JSON.stringify(formInfo, null, 2));

    // Fill form
    await page.evaluate((p) => {
      const inputs = Array.from(document.querySelectorAll('input, textarea'));
      for (const input of inputs) {
        const label = (document.querySelector(`label[for="${input.id}"]`)?.innerText || input.closest('div')?.querySelector('label')?.innerText || '').toLowerCase();
        const type = input.type ? input.type.toLowerCase() : '';
        const tag = input.tagName.toLowerCase();

        if (tag === 'textarea' || label.includes('message')) {
          input.value = p.message;
        } else if (label.includes('first name') || label === 'first') {
          input.value = p.firstName;
        } else if (label.includes('last name') || label === 'last') {
          input.value = p.lastName;
        } else if (label.includes('name') && !label.includes('company')) {
          input.value = p.fullName;
        } else if (type === 'email' || label.includes('email')) {
          input.value = p.email;
        } else if (type === 'tel' || label.includes('phone')) {
          input.value = p.phone;
        } else if (label.includes('company')) {
          input.value = p.company;
        }
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }, OUTREACH_PROFILE);

    await page.screenshot({ path: 'screenshots/lead_844_filled.png' });

    // Click submit button
    console.log('Submitting #844...');
    await Promise.all([
      page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('button, input[type="submit"]')).find(b => (b.innerText || b.value || '').toLowerCase().includes('submit'));
        if (btn) btn.click();
      }),
      new Promise(r => setTimeout(r, 6000))
    ]);

    await page.screenshot({ path: 'screenshots/lead_844_submitted.png' });
    const postSubmit = await page.evaluate(() => {
      return {
        bodyText: document.body.innerText.substring(0, 500),
        alerts: Array.from(document.querySelectorAll('[role="alert"], .success, .alert, .message, .wixui-form__message, [data-testid="form-submitted"]')).map(e => e.innerText)
      };
    });
    console.log('Post submit #844:', postSubmit);

  } catch (err) {
    console.log('Error testing #844:', err);
  } finally {
    await page.close();
  }
}

async function testLead836(browser) {
  console.log('\n--- Deep Testing Lead #836: VHB ---');
  const page = await browser.newPage();
  try {
    await page.goto('https://www.vhb.com/contact-us/', { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Check if reCAPTCHA is active and required
    const captchaDetails = await page.evaluate(() => {
      const iframes = Array.from(document.querySelectorAll('iframe')).map(f => ({ src: f.src, title: f.title }));
      const gRecaptcha = document.querySelector('.g-recaptcha, [data-sitekey]');
      return {
        iframes: iframes.filter(i => i.src.includes('recaptcha') || i.title.includes('reCAPTCHA')),
        sitekey: gRecaptcha ? gRecaptcha.getAttribute('data-sitekey') : null
      };
    });
    console.log('Lead 836 captcha details:', captchaDetails);
  } catch (err) {
    console.log('Error testing #836:', err);
  } finally {
    await page.close();
  }
}

async function checkOtherSites(browser) {
  console.log('\n--- Checking leads 838, 839, 840, 842 ---');
  const targets = [
    { id: 838, name: 'Hatfield Group Engineering', url: 'https://www.hatfieldgrp.com/contact-us' },
    { id: 839, name: 'Alma Engineering', url: 'https://alma-pc.com/Contact-Us' },
    { id: 840, name: 'SH ENGINEERING', url: 'https://www.sh-structures.com/' },
    { id: 842, name: 'Structural Engineering Tech', url: 'https://www.set-ny.com/contact' }
  ];

  for (const t of targets) {
    const page = await browser.newPage();
    try {
      await page.goto(t.url, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await new Promise(r => setTimeout(r, 2000));
      const content = await page.evaluate(() => {
        return {
          title: document.title,
          text: document.body.innerText.replace(/\s+/g, ' ').substring(0, 400),
          forms: document.querySelectorAll('form').length,
          inputs: document.querySelectorAll('input:not([type="hidden"]), textarea').length
        };
      });
      console.log(`Lead #${t.id} (${t.name}):`, content);
    } catch (e) {
      console.log(`Lead #${t.id} error:`, e.message);
    } finally {
      await page.close();
    }
  }
}

async function run() {
  if (!fs.existsSync('screenshots')) fs.mkdirSync('screenshots');
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    timeout: 60000,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--window-size=1280,800']
  });

  await testLead837(browser);
  await testLead844(browser);
  await testLead836(browser);
  await checkOtherSites(browser);

  await browser.close();
}

run();
