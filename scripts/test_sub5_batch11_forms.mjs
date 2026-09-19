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
  message: 'Hello, I am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects. Thank you for your time and attention.'
};

async function testForms() {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: CHROME_BIN,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  // 1. #3944 Aluces (Wix)
  console.log('=== #3944 Aluces ===');
  try {
    const page = await browser.newPage();
    await page.goto('https://www.alucescorp.com/', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await new Promise(r => setTimeout(r, 4000));
    
    // Fill
    const nameEl = await page.$('input[name*="name"], input[placeholder*="Name"]');
    if (nameEl) await nameEl.type(OUTREACH_PROFILE.fullName);
    const emailEl = await page.$('input[name*="email"], input[placeholder*="Email"]');
    if (emailEl) await emailEl.type(OUTREACH_PROFILE.email);
    const phoneEl = await page.$('input[name*="phone"], input[placeholder*="Phone"]');
    if (phoneEl) await phoneEl.type(OUTREACH_PROFILE.phone);
    const subjEl = await page.$('input[name*="subject"], input[placeholder*="Subject"]');
    if (subjEl) await subjEl.type(OUTREACH_PROFILE.subject);
    const msgEl = await page.$('textarea');
    if (msgEl) await msgEl.type(OUTREACH_PROFILE.message);

    page.on('response', async res => {
      if (res.url().includes('wixforms') || res.url().includes('submit')) {
        console.log('3944 submit endpoint:', res.url(), res.status());
        try {
          console.log('3944 submit resp body:', (await res.text()).substring(0, 200));
        } catch (e) {}
      }
    });

    const submitBtn = await page.$('button[data-testid="buttonElement"], div[id*="comp-kf7u55"] button');
    if (submitBtn) {
      console.log('Clicking 3944 submit...');
      await submitBtn.click();
      await new Promise(r => setTimeout(r, 4000));
      const text = await page.evaluate(() => document.body.innerText);
      const match = text.match(/thanks for submitting|thank you|received/i);
      console.log('3944 match:', match ? match[0] : 'no text match');
    }
    await page.close();
  } catch (e) {
    console.log('3944 err:', e.message);
  }

  // 2. #3949 CONNECT Engineering (Wix)
  console.log('\n=== #3949 CONNECT Engineering ===');
  try {
    const page = await browser.newPage();
    await page.goto('https://www.connecteng.com/', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await new Promise(r => setTimeout(r, 4000));

    const fName = await page.$('input[name="first-name"]');
    if (fName) await fName.type(OUTREACH_PROFILE.firstName);
    const lName = await page.$('input[name="last-name"]');
    if (lName) await lName.type(OUTREACH_PROFILE.lastName);
    const email = await page.$('input[name="email"]');
    if (email) await email.type(OUTREACH_PROFILE.email);
    const subj = await page.$('input[name="subject"]');
    if (subj) await subj.type(OUTREACH_PROFILE.subject);
    const msg = await page.$('textarea');
    if (msg) await msg.type(OUTREACH_PROFILE.message);

    page.on('response', async res => {
      if (res.url().includes('wixforms') || res.url().includes('submit')) {
        console.log('3949 submit endpoint:', res.url(), res.status());
        try {
          console.log('3949 submit resp body:', (await res.text()).substring(0, 200));
        } catch (e) {}
      }
    });

    const submitBtn = await page.$('button[data-testid="buttonElement"], form#comp-kq7zuqku button');
    if (submitBtn) {
      console.log('Clicking 3949 submit...');
      await submitBtn.click();
      await new Promise(r => setTimeout(r, 4000));
      const text = await page.evaluate(() => document.body.innerText);
      const match = text.match(/thanks for submitting|thank you|received/i);
      console.log('3949 match:', match ? match[0] : 'no text match');
    }
    await page.close();
  } catch (e) {
    console.log('3949 err:', e.message);
  }

  // 3. #3946 FormTech Land Surveying
  console.log('\n=== #3946 FormTech Land Surveying ===');
  try {
    const page = await browser.newPage();
    await page.goto('https://formtechco.com/contact-us', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await new Promise(r => setTimeout(r, 2000));

    page.on('response', async res => {
      if (res.request().method() === 'POST') {
        console.log('3946 POST response:', res.url(), res.status());
        try {
          console.log('3946 resp body:', (await res.text()).substring(0, 200));
        } catch (e) {}
      }
    });

    const fName = await page.$('#fullName, input[name="fullName"]');
    if (fName) await fName.type(OUTREACH_PROFILE.fullName);
    const email = await page.$('#email, input[name="email"]');
    if (email) await email.type(OUTREACH_PROFILE.email);
    const msg = await page.$('#message, textarea[name="message"]');
    if (msg) await msg.type(OUTREACH_PROFILE.message);

    const submitBtn = await page.$('#contact-form button[type="submit"], #contact-form button');
    if (submitBtn) {
      console.log('Clicking 3946 submit button...');
      await submitBtn.click();
      await new Promise(r => setTimeout(r, 4000));
      const text = await page.evaluate(() => document.body.innerText);
      const match = text.match(/thank you|thanks|message sent|received/i);
      console.log('3946 match:', match ? match[0] : 'no text match');
    }
    await page.close();
  } catch (e) {
    console.log('3946 err:', e.message);
  }

  // 4. #3947 Globe Engineering
  console.log('\n=== #3947 Globe Engineering ===');
  try {
    const page = await browser.newPage();
    await page.goto('https://civil-engineer.us/contact_us', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await new Promise(r => setTimeout(r, 2000));
    const formDetails = await page.evaluate(() => {
      const f = document.querySelector('form');
      if (!f) return null;
      return {
        action: f.action,
        method: f.method,
        html: f.outerHTML
      };
    });
    console.log('3947 form details:', formDetails ? formDetails.action : 'no form', formDetails ? formDetails.html.substring(0, 300) : '');
    await page.close();
  } catch (e) {
    console.log('3947 err:', e.message);
  }

  // 5. #3948 Civil Design Engineering
  console.log('\n=== #3948 Civil Design Engineering ===');
  try {
    const page = await browser.newPage();
    await page.goto('https://civildeng.com/', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await new Promise(r => setTimeout(r, 2000));
    const pageInfo = await page.evaluate(() => {
      const forms = Array.from(document.querySelectorAll('form')).map(f => f.outerHTML);
      const links = Array.from(document.querySelectorAll('a')).map(a => ({ href: a.href, text: a.innerText.trim() }));
      return { forms, links: links.filter(l => /contact|about/i.test(l.text) || /contact/i.test(l.href)) };
    });
    console.log('3948 info:', pageInfo);
    await page.close();
  } catch (e) {
    console.log('3948 err:', e.message);
  }

  // 6. #3939 BobCAD-CAM
  console.log('\n=== #3939 BobCAD-CAM ===');
  try {
    const page = await browser.newPage();
    await page.goto('https://bobcad.com/contact-us', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await new Promise(r => setTimeout(r, 2000));
    const pageInfo = await page.evaluate(() => {
      const forms = Array.from(document.querySelectorAll('form')).map(f => ({
        id: f.id,
        className: f.className,
        action: f.action,
        hasRecaptcha: !!f.querySelector('.g-recaptcha, iframe[src*="recaptcha"], iframe[src*="turnstile"]')
      }));
      return forms;
    });
    console.log('3939 contact forms:', pageInfo);
    await page.close();
  } catch (e) {
    console.log('3939 err:', e.message);
  }

  await browser.close();
}

testForms();
