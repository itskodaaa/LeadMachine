import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const PROFILE = {
  fullName: 'Pamela Jameson',
  firstName: 'Pamela',
  lastName: 'Jameson',
  email: 'pamela.jameson@nortiheastprecision.com',
  phone: '708-568-3708',
  company: 'Northeast Precision Machinery, Inc.',
  subject: 'Exploring Collaboration Opportunities',
  message: 'Hello, I am reaching out to express our interest in your precision machining and custom fabrication services. Please arrange for a representative to contact us regarding collaboration and upcoming project quotes. Thank you, Pamela Jameson.'
};

async function testLead4606Capitol() {
  console.log('\n==============================================');
  console.log('Testing #4606: Capitol Company Contact Page');
  const browser = await puppeteer.launch({ executablePath: CHROME_BIN, headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  try {
    await page.goto('https://www.capitolcompany.com/contact-us', { waitUntil: 'networkidle2', timeout: 25000 });
    console.log('Loaded: https://www.capitolcompany.com/contact-us');
    const pageData = await page.evaluate(() => {
      const forms = Array.from(document.querySelectorAll('form')).map(f => ({
        id: f.id,
        action: f.action,
        inputs: Array.from(f.querySelectorAll('input, textarea, select')).map(i => ({ name: i.name, type: i.type, placeholder: i.placeholder }))
      }));
      const text = document.body.innerText;
      return { forms, textExcerpt: text.slice(0, 600).replace(/\n+/g, ' ') };
    });
    console.log('Capitol Contact Data:', pageData);
  } catch (e) {
    console.log('Error 4606:', e.message);
  } finally {
    await browser.close();
  }
}

async function testLead4608Affinity() {
  console.log('\n==============================================');
  console.log('Testing #4608: Affinity Metalworks (Wix Studio)');
  const browser = await puppeteer.launch({ executablePath: CHROME_BIN, headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  try {
    await page.goto('https://www.affinitymetalworks.com/', { waitUntil: 'networkidle2', timeout: 25000 });
    // Find all inputs in the form
    const formInputs = await page.$$('form input:not([type="hidden"]):not([type="file"]), form textarea');
    console.log('Found Affinity form input elements:', formInputs.length);

    // Let's see what each field is
    const fieldDetails = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('form input:not([type="hidden"]):not([type="file"]), form textarea'));
      return inputs.map(i => ({
        id: i.id,
        name: i.name,
        type: i.type,
        ariaLabel: i.getAttribute('aria-label'),
        placeholder: i.placeholder,
        label: i.closest('div[class*="field"]')?.querySelector('label')?.innerText || i.closest('label')?.innerText || ''
      }));
    });
    console.log('Field details:', fieldDetails);

    // Fill each field carefully
    for (let i = 0; i < formInputs.length; i++) {
      const el = formInputs[i];
      const detail = fieldDetails[i];
      const label = (detail.label + ' ' + detail.placeholder + ' ' + detail.ariaLabel + ' ' + detail.id).toLowerCase();
      
      await el.click();
      if (label.includes('first') || i === 0) {
        await el.type(PROFILE.firstName, { delay: 20 });
      } else if (label.includes('last') || i === 1) {
        await el.type(PROFILE.lastName, { delay: 20 });
      } else if (detail.type === 'email' || label.includes('email') || i === 2) {
        await el.type(PROFILE.email, { delay: 20 });
      } else if (detail.type === 'tel' || label.includes('phone') || i === 3) {
        await el.type(PROFILE.phone, { delay: 20 });
      } else if (detail.type === 'textarea' || label.includes('idea') || label.includes('project') || i === 4) {
        await el.type(PROFILE.message, { delay: 10 });
      }
    }

    await new Promise(r => setTimeout(r, 1000));
    // Click submit
    const submitBtn = await page.$('form button[type="submit"], button[data-testid="buttonElement"]');
    console.log('Submit button found:', !!submitBtn);
    if (submitBtn) {
      await submitBtn.click();
      await new Promise(r => setTimeout(r, 5000));
      const res = await page.evaluate(() => {
        const alerts = Array.from(document.querySelectorAll('[data-testid="form-submitted"], .wixui-form__message, [role="alert"], [class*="success"]')).map(e => e.innerText);
        const body = document.body.innerText;
        return { alerts, hasThank: body.toLowerCase().includes('thank') || body.toLowerCase().includes('received') || body.toLowerCase().includes('sent') };
      });
      console.log('Affinity submit result:', res);
      const excerpt = await page.evaluate(() => document.body.innerText.slice(-600).replace(/\n+/g, ' '));
      console.log('Affinity page excerpt:', excerpt);
    }
  } catch (e) {
    console.log('Error 4608:', e.message);
  } finally {
    await browser.close();
  }
}

async function testLead4601Lockhart() {
  console.log('\n==============================================');
  console.log('Testing #4601: H J Lockhart Metal Services (GoDaddy)');
  const browser = await puppeteer.launch({ executablePath: CHROME_BIN, headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  try {
    await page.goto('https://lockhartmetalservice.com/', { waitUntil: 'networkidle2', timeout: 25000 });
    
    // Check GoDaddy inputs by order or role
    const inputs = await page.evaluate(() => {
      const form = document.querySelector('form');
      if (!form) return [];
      return Array.from(form.querySelectorAll('input:not([type="hidden"]), textarea')).map((el, index) => ({
        index,
        tagName: el.tagName,
        type: el.type,
        id: el.id,
        placeholder: el.placeholder,
        ariaLabel: el.getAttribute('aria-label'),
        parentText: el.parentElement?.innerText || ''
      }));
    });
    console.log('Lockhart inputs:', inputs);

    const formEls = await page.$$('form input:not([type="hidden"]), form textarea');
    if (formEls.length >= 3) {
      await formEls[0].click();
      await formEls[0].type(PROFILE.fullName, { delay: 20 });
      await formEls[1].click();
      await formEls[1].type(PROFILE.email, { delay: 20 });
      await formEls[2].click();
      await formEls[2].type(PROFILE.message, { delay: 20 });
    }

    const submitBtn = await page.$('button[data-aid="CONTACT_SUBMIT_BUTTON_REND"]');
    if (submitBtn) {
      console.log('Clicking GoDaddy submit button...');
      await submitBtn.click();
      await new Promise(r => setTimeout(r, 6000));
      const res = await page.evaluate(() => {
        const alerts = Array.from(document.querySelectorAll('[data-aid*="NOTIFICATION"], [role="alert"], .alert')).map(e => e.innerText);
        const body = document.body.innerText;
        return { alerts, hasThank: body.toLowerCase().includes('thank') || body.toLowerCase().includes('message sent') || body.toLowerCase().includes('sent') };
      });
      console.log('Lockhart result:', res);
      const text = await page.evaluate(() => document.querySelector('form')?.innerText || '');
      console.log('Form innerText:', text.replace(/\n+/g, ' '));
    }
  } catch (e) {
    console.log('Error 4601:', e.message);
  } finally {
    await browser.close();
  }
}

async function testLead4609KK() {
  console.log('\n==============================================');
  console.log('Testing #4609: K & K Welding LLC (GoDaddy)');
  const browser = await puppeteer.launch({ executablePath: CHROME_BIN, headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  try {
    await page.goto('https://kkweldingllc.com/contact-us', { waitUntil: 'networkidle2', timeout: 25000 });
    const inputs = await page.evaluate(() => {
      const form = document.querySelector('form');
      if (!form) return [];
      return Array.from(form.querySelectorAll('input:not([type="hidden"]):not([type="file"]), textarea')).map((el, index) => ({
        index,
        tagName: el.tagName,
        type: el.type,
        id: el.id,
        placeholder: el.placeholder,
        parentText: el.parentElement?.innerText || ''
      }));
    });
    console.log('KK inputs:', inputs);

    const formEls = await page.$$('form input:not([type="hidden"]):not([type="file"]), form textarea');
    if (formEls.length >= 4) {
      await formEls[0].click();
      await formEls[0].type(PROFILE.fullName, { delay: 15 });
      await formEls[1].click();
      await formEls[1].type(PROFILE.phone, { delay: 15 });
      await formEls[2].click();
      await formEls[2].type(PROFILE.email, { delay: 15 });
      await formEls[3].click();
      await formEls[3].type(PROFILE.message, { delay: 15 });
    }

    const submitBtn = await page.$('button[data-aid="CONTACT_SUBMIT_BUTTON_REND"]');
    if (submitBtn) {
      console.log('Clicking KK submit button...');
      await submitBtn.click();
      await new Promise(r => setTimeout(r, 6000));
      const res = await page.evaluate(() => {
        const alerts = Array.from(document.querySelectorAll('[data-aid*="NOTIFICATION"], [role="alert"], .alert')).map(e => e.innerText);
        const body = document.body.innerText;
        return { alerts, hasThank: body.toLowerCase().includes('thank') || body.toLowerCase().includes('message sent') || body.toLowerCase().includes('sent') };
      });
      console.log('KK result:', res);
      const text = await page.evaluate(() => document.querySelector('form')?.innerText || '');
      console.log('KK Form innerText:', text.replace(/\n+/g, ' '));
    }
  } catch (e) {
    console.log('Error 4609:', e.message);
  } finally {
    await browser.close();
  }
}

async function run() {
  await testLead4606Capitol();
  await testLead4608Affinity();
  await testLead4601Lockhart();
  await testLead4609KK();
}

run();
