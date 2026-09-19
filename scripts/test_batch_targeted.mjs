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
  message: `Hello,

I am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects.

Thank you for your time and attention.

Sincerely,
Pamela Jameson`
};

async function testRedRiverContact() {
  console.log('\n=== Testing Red River Contact Page (#3506) ===');
  const browser = await puppeteer.launch({ executablePath: CHROME_BIN, headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  try {
    await page.setRequestInterception(true);
    page.on('request', req => {
      if (['font', 'media'].includes(req.resourceType())) req.abort();
      else req.continue();
    });
    await page.goto('https://www.redriverprec.com/contact', { waitUntil: 'domcontentloaded', timeout: 25000 });
    console.log('Title:', await page.title());

    const formDetails = await page.evaluate(() => {
      const forms = Array.from(document.querySelectorAll('form'));
      return forms.map(f => ({
        action: f.action,
        method: f.method,
        inputs: Array.from(f.querySelectorAll('input, textarea, select')).map(i => ({
          type: i.type,
          name: i.name,
          id: i.id,
          placeholder: i.placeholder,
          required: i.required
        }))
      }));
    });
    console.log('Forms on Red River:', JSON.stringify(formDetails, null, 2));

    const recaptcha = await page.evaluate(() => !!document.querySelector('.g-recaptcha, [src*="recaptcha"]'));
    console.log('Recaptcha present:', recaptcha);

    // If form exists, fill and submit
    if (formDetails.length > 0 && formDetails[0].inputs.length >= 2) {
      console.log('Filling Red River form...');
      const nameInp = await page.$('input[name*="name"], input[id*="name"]');
      if (nameInp) await nameInp.type(OUTREACH.fullName, { delay: 20 });
      const emailInp = await page.$('input[name*="email"], input[id*="email"], input[type="email"]');
      if (emailInp) await emailInp.type(OUTREACH.email, { delay: 20 });
      const phoneInp = await page.$('input[name*="phone"], input[id*="phone"]');
      if (phoneInp) await phoneInp.type(OUTREACH.phone, { delay: 20 });
      const msgInp = await page.$('textarea');
      if (msgInp) await msgInp.type(OUTREACH.message, { delay: 10 });

      console.log('Submitting Red River...');
      const submit = await page.$('input[type="submit"], button[type="submit"], button');
      if (submit) {
        await Promise.all([
          submit.click(),
          new Promise(r => setTimeout(r, 6000))
        ]);
        const body = await page.evaluate(() => document.body.innerText);
        console.log('Snippet after submit:', body.slice(0, 400));
        const conf = /thank|received|sent|success/i.test(body);
        console.log('Confirmation detected:', conf);
      }
    }
  } catch (e) {
    console.error('Red River error:', e.message);
  } finally {
    await browser.close();
  }
}

async function testAustinMechatronics() {
  console.log('\n=== Testing Austin Mechatronics / ANDESIGN (#3508) ===');
  const browser = await puppeteer.launch({ executablePath: CHROME_BIN, headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  try {
    await page.goto('https://www.austinmechatronics.com/contact', { waitUntil: 'networkidle2', timeout: 25000 });
    console.log('Title:', await page.title());

    // Fill Squarespace form
    const fname = await page.$('input[name="fname"]');
    if (fname) await fname.type(OUTREACH.firstName, { delay: 20 });
    const lname = await page.$('input[name="lname"]');
    if (lname) await lname.type(OUTREACH.lastName, { delay: 20 });

    const email = await page.$('input[id*="email-yui"]');
    if (email) await email.type(OUTREACH.email, { delay: 20 });

    const phone = await page.$('input[id*="phone"]');
    if (phone) await phone.type(OUTREACH.phone, { delay: 20 });

    const textarea = await page.$('textarea[id*="textarea-yui"]');
    if (textarea) await textarea.type(OUTREACH.message, { delay: 10 });

    console.log('Squarespace fields filled. Submitting...');
    const submitBtn = await page.$('.form-button-wrapper button, button[type="submit"]');
    if (submitBtn) {
      await submitBtn.click();
      await new Promise(r => setTimeout(r, 6000));
      const body = await page.evaluate(() => document.body.innerText);
      const conf = /thank|received|sent|success/i.test(body);
      console.log('Confirmation detected on Austin Mechatronics:', conf);
      const formSubmissionText = await page.evaluate(() => {
        const sub = document.querySelector('.form-submission-text, .form-submission-html');
        return sub ? sub.innerText : 'None';
      });
      console.log('Form submission text element:', formSubmissionText);
    }
  } catch (e) {
    console.error('Austin Mechatronics error:', e.message);
  } finally {
    await browser.close();
  }
}

async function testWixPrecisionElectric() {
  console.log('\n=== Testing Precision Electric (#3504) ===');
  const browser = await puppeteer.launch({ executablePath: CHROME_BIN, headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  try {
    await page.goto('https://www.precisionelectricaustin.com/contact', { waitUntil: 'networkidle0', timeout: 25000 });
    console.log('Title:', await page.title());

    // Find all inputs on page
    const inputs = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('input, textarea')).map(el => ({
        id: el.id,
        name: el.name,
        type: el.type,
        placeholder: el.placeholder,
        ariaLabel: el.getAttribute('aria-label')
      }));
    });
    console.log('Found inputs on Precision Electric:', inputs);

    for (const inp of inputs) {
      const selector = `#${inp.id}`;
      const label = (inp.ariaLabel || inp.name || inp.placeholder || inp.id).toLowerCase();
      if (/name/i.test(label)) {
        await page.type(selector, OUTREACH.fullName, { delay: 20 });
      } else if (/phone/i.test(label)) {
        await page.type(selector, OUTREACH.phone, { delay: 20 });
      } else if (/email/i.test(label)) {
        await page.type(selector, OUTREACH.email, { delay: 20 });
      } else if (/subject/i.test(label)) {
        await page.type(selector, OUTREACH.subject, { delay: 20 });
      } else if (inp.type === 'textarea' || /message/i.test(label)) {
        await page.type(selector, OUTREACH.message, { delay: 10 });
      }
    }

    console.log('Submitting Precision Electric form...');
    const submitBtn = await page.$('button[data-hook="submit-button"], button[type="submit"]');
    if (submitBtn) {
      await submitBtn.click();
      await new Promise(r => setTimeout(r, 6000));
      const msg = await page.evaluate(() => {
        const notif = document.querySelector('[data-hook="form-message"], [role="alert"]');
        return notif ? notif.innerText : 'None';
      });
      console.log('Notification message:', msg);
      const body = await page.evaluate(() => document.body.innerText);
      console.log('Confirmation in body:', /thank|received|sent|success/i.test(body));
    }
  } catch (e) {
    console.error('Precision Electric error:', e.message);
  } finally {
    await browser.close();
  }
}

async function main() {
  await testRedRiverContact();
  await testAustinMechatronics();
  await testWixPrecisionElectric();
}

main();
