import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import db from './db.mjs';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

const PROFILE = {
  fullName: 'Pamela Jameson',
  firstName: 'Pamela',
  lastName: 'Jameson',
  email: 'pamela.jameson@nortiheastprecision.com',
  phone: '708-568-3708',
  company: 'Northeast Precision Machinery, Inc.',
  subject: 'Exploring Collaboration Opportunities',
  message: 'Hello,\n\nI am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects.\n\nThank you for your time and attention.\n\nSincerely,\nPamela Jameson'
};

async function testTaigTools() {
  console.log('--- Testing Taig Tools (#4736) ---');
  const browser = await puppeteer.launch({ executablePath: CHROME_BIN, headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  try {
    await page.goto('https://taigtools.com/contact/', { waitUntil: 'networkidle2', timeout: 25000 });
    await page.waitForSelector('#nf-field-1', { timeout: 10000 });
    await page.type('#nf-field-1', PROFILE.fullName, { delay: 50 });
    await page.type('#nf-field-2', PROFILE.email, { delay: 50 });
    await page.type('#nf-field-18', PROFILE.phone, { delay: 50 });
    await page.type('#nf-field-19', PROFILE.subject, { delay: 50 });
    await page.type('#nf-field-3', PROFILE.message, { delay: 20 });
    
    // Check submit button
    console.log('Submitting Taig Tools Ninja Form...');
    await page.click('#nf-field-4');
    await new Promise(r => setTimeout(r, 6000));
    
    const result = await page.evaluate(() => {
      const resp = document.querySelector('.nf-response-msg')?.innerText || '';
      const body = document.body.innerText;
      return { resp, bodyContainsThanks: /thank|received|sent/i.test(body), url: window.location.href };
    });
    console.log('Taig Tools Result:', result);
  } catch (e) {
    console.log('Taig Tools Error:', e.message);
  } finally {
    await browser.close();
  }
}

async function testLegacyMolding() {
  console.log('\n--- Testing Legacy Molding (#4732) ---');
  const browser = await puppeteer.launch({ executablePath: CHROME_BIN, headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  try {
    await page.goto('https://legacy-molding.com/contact', { waitUntil: 'networkidle2', timeout: 25000 });
    
    const filled = await page.evaluate((p) => {
      const inputs = Array.from(document.querySelectorAll('input, textarea'));
      for (const el of inputs) {
        const ph = (el.placeholder || '').toLowerCase();
        if (ph.includes('your name')) el.value = p.fullName;
        else if (ph.includes('company')) el.value = p.company;
        else if (ph.includes('you@company.com')) el.value = p.email;
        else if (ph.includes('(555)')) el.value = p.phone;
        else if (ph.includes('volume')) el.value = '10,000 - 50,000 parts';
        else if (ph.includes('material')) el.value = 'Custom Molded Polymers / Engineering Resins';
        else if (ph.includes('describe your project')) el.value = p.message;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
      return true;
    }, PROFILE);

    console.log('Filled Legacy Molding form:', filled);
    const btn = await page.$('button[type="submit"], input[type="submit"], button');
    console.log('Clicking button...');
    await page.evaluate(() => {
      const b = Array.from(document.querySelectorAll('button, input[type="submit"]')).find(el => el.innerText?.includes('REQUEST') || el.value?.includes('REQUEST'));
      if (b) b.click();
    });

    await new Promise(r => setTimeout(r, 6000));

    const result = await page.evaluate(() => {
      return {
        url: window.location.href,
        bodySample: document.body.innerText.slice(0, 500).replace(/\s+/g, ' '),
        alert: document.querySelector('.alert, [role="alert"], .success, .form-message')?.innerText
      };
    });
    console.log('Legacy Molding Result:', result);
  } catch (e) {
    console.log('Legacy Molding Error:', e.message);
  } finally {
    await browser.close();
  }
}

async function testGSI() {
  console.log('\n--- Testing GSI International (#4737) ---');
  const browser = await puppeteer.launch({ executablePath: CHROME_BIN, headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  try {
    await page.goto('https://www.gsiinternational.com/contact', { waitUntil: 'networkidle2', timeout: 25000 });
    
    await page.evaluate((p) => {
      const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"]):not([type="file"]), textarea'));
      for (const el of inputs) {
        const ph = (el.placeholder || '').toLowerCase();
        const id = (el.id || '').toLowerCase();
        const aria = (el.getAttribute('aria-label') || '').toLowerCase();
        const label = (el.closest('[data-testid]')?.innerText || el.closest('div')?.innerText || '').toLowerCase();

        if (ph.includes('first') || label.includes('first name')) el.value = p.firstName;
        else if (ph.includes('last') || label.includes('last name')) el.value = p.lastName;
        else if (label.includes('company')) el.value = p.company;
        else if (ph.includes('email') || label.includes('email')) el.value = p.email;
        else if (ph.includes('phone') || label.includes('phone')) el.value = p.phone;
        else if (ph.includes('message') || label.includes('details') || el.tagName === 'TEXTAREA') el.value = p.message;
        
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }, PROFILE);

    console.log('Submitting GSI Wix form...');
    await page.evaluate(() => {
      const submitBtn = Array.from(document.querySelectorAll('button')).find(b => (b.innerText || '').toLowerCase().includes('submit'));
      if (submitBtn) submitBtn.click();
    });

    await new Promise(r => setTimeout(r, 6000));

    const result = await page.evaluate(() => {
      return {
        url: window.location.href,
        bodySample: document.body.innerText.slice(0, 500).replace(/\s+/g, ' '),
        wixSuccess: document.querySelector('[data-testid="form-submitted"], .wixui-form__message')?.innerText
      };
    });
    console.log('GSI Result:', result);
  } catch (e) {
    console.log('GSI Error:', e.message);
  } finally {
    await browser.close();
  }
}

async function testToolCrib() {
  console.log('\n--- Testing The Tool Crib (#4729) ---');
  const browser = await puppeteer.launch({ executablePath: CHROME_BIN, headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  try {
    await page.goto('https://www.thetoolcribaz.com/', { waitUntil: 'networkidle2', timeout: 25000 });
    
    await page.evaluate((p) => {
      const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"]):not([type="file"]), textarea'));
      for (const el of inputs) {
        const ph = (el.placeholder || '').toLowerCase();
        const label = (el.closest('[data-testid]')?.innerText || el.closest('div')?.innerText || '').toLowerCase();

        if (label.includes('first name')) el.value = p.firstName;
        else if (label.includes('last name')) el.value = p.lastName;
        else if (label.includes('company')) el.value = p.company;
        else if (label.includes('email')) el.value = p.email;
        else if (label.includes('phone')) el.value = p.phone;
        else if (label.includes('looking for') || el.tagName === 'TEXTAREA') el.value = p.message;
        
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }, PROFILE);

    console.log('Submitting Tool Crib Wix form...');
    await page.evaluate(() => {
      const submitBtn = Array.from(document.querySelectorAll('button')).find(b => (b.innerText || '').toLowerCase().includes('submit'));
      if (submitBtn) submitBtn.click();
    });

    await new Promise(r => setTimeout(r, 6000));

    const result = await page.evaluate(() => {
      return {
        url: window.location.href,
        wixSuccess: document.querySelector('[data-testid="form-submitted"], .wixui-form__message')?.innerText,
        textSample: document.body.innerText.slice(0, 500).replace(/\s+/g, ' ')
      };
    });
    console.log('Tool Crib Result:', result);
  } catch (e) {
    console.log('Tool Crib Error:', e.message);
  } finally {
    await browser.close();
  }
}

async function run() {
  await testTaigTools();
  await testLegacyMolding();
  await testGSI();
  await testToolCrib();
}

run();
