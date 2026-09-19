import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const OUTREACH = {
  name: 'Pamela Jameson',
  email: 'pamela.jameson@nortiheastprecision.com',
  phone: '708-568-3708',
  company: 'Northeast Precision Machinery, Inc.',
  message: 'Hello, I am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects. Thank you, Pamela Jameson'
};

async function runDeep() {
  const browser = await puppeteer.launch({
    headless: "new",
    executablePath: CHROME_BIN,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled']
  });

  // 1. Check Helfrich Tool & Die
  console.log('\n--- 4954 Helfrich Tool & Die ---');
  try {
    const page = await browser.newPage();
    await page.goto('https://helfrichtool.com/', { waitUntil: 'networkidle2', timeout: 20000 });
    const modalOrForm = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('#visitor_name, #email_address, #message_txt')).map(el => ({
        id: el.id,
        parentDisplay: window.getComputedStyle(el.parentElement).display,
        visible: !!(el.offsetWidth || el.offsetHeight)
      }));
      const buttons = Array.from(document.querySelectorAll('button, a')).map(b => b.innerText.trim()).filter(t => /contact|message|get in touch|accept/i.test(t));
      return { inputs, buttons };
    });
    console.log('4954 details:', modalOrForm);
    await page.close();
  } catch (e) {
    console.log('4954 error:', e.message);
  }

  // 2. Check Bandel Manufacturing
  console.log('\n--- 4959 Bandel Manufacturing ---');
  try {
    const page = await browser.newPage();
    await page.goto('https://www.bandel.com/contact', { waitUntil: 'networkidle2', timeout: 25000 });
    await new Promise(r => setTimeout(r, 4000));
    const bandelDetails = await page.evaluate(() => {
      const forms = Array.from(document.querySelectorAll('form')).map(f => ({
        id: f.id,
        action: f.action,
        inputs: Array.from(f.querySelectorAll('input, textarea, select')).map(i => i.name || i.id || i.type)
      }));
      const iframes = Array.from(document.querySelectorAll('iframe')).map(f => f.src);
      return { forms, iframes, htmlLen: document.body.innerHTML.length };
    });
    console.log('4959 details:', bandelDetails);
    await page.close();
  } catch (e) {
    console.log('4959 error:', e.message);
  }

  // 3. Test Us Tool & Die submission
  console.log('\n--- 4960 Us Tool & Die ---');
  try {
    const page = await browser.newPage();
    page.on('dialog', async dialog => {
      console.log('Dialog popped:', dialog.type(), dialog.message());
      await dialog.accept();
    });
    page.on('response', res => {
      if (res.url().includes('email') || res.url().includes('api') || res.url().includes('form') || res.url().includes('send')) {
        console.log('Response intercepted:', res.status(), res.url());
      }
    });
    await page.goto('https://ustooldie.com/', { waitUntil: 'networkidle2', timeout: 20000 });
    
    // Fill fields
    await page.type('#Name', OUTREACH.name, { delay: 30 });
    await page.type('#Email', OUTREACH.email, { delay: 30 });
    await page.type('#Message', OUTREACH.message, { delay: 10 });
    
    console.log('Filled form on ustooldie.com. Submitting...');
    await page.click('button[type="submit"]');
    await new Promise(r => setTimeout(r, 6000));
    
    const postSubmitText = await page.evaluate(() => {
      return document.body.innerText.substring(0, 1000).replace(/\s+/g, ' ');
    });
    console.log('4960 post submit body text:', postSubmitText);
    await page.close();
  } catch (e) {
    console.log('4960 error:', e.message);
  }

  // 4. Test L & L Tool & Die submission
  console.log('\n--- 4961 L & L Tool & Die ---');
  try {
    const page = await browser.newPage();
    page.on('dialog', async dialog => {
      console.log('Dialog popped:', dialog.type(), dialog.message());
      await dialog.accept();
    });
    page.on('response', res => {
      if (res.url().includes('admin-ajax.php') || res.url().includes('contact')) {
        console.log('Response intercepted:', res.status(), res.url());
      }
    });
    await page.goto('https://lltool.com/contact-us/', { waitUntil: 'networkidle2', timeout: 25000 });
    
    await page.type('#et_pb_contact_first_name_0', 'Pamela', { delay: 20 });
    await page.type('#et_pb_contact_last_name_0', 'Jameson', { delay: 20 });
    await page.type('#et_pb_contact_company_name_0', OUTREACH.company, { delay: 20 });
    await page.type('#et_pb_contact_email_0', OUTREACH.email, { delay: 20 });
    await page.type('#et_pb_contact_message_0', OUTREACH.message, { delay: 10 });
    
    console.log('Filled L&L form. Clicking submit...');
    await page.click('button[name="et_builder_submit_button"]');
    await new Promise(r => setTimeout(r, 6000));
    
    const etResult = await page.evaluate(() => {
      const msg = document.querySelector('.et-pb-contact-message');
      return msg ? msg.innerText : document.body.innerText.substring(0, 500);
    });
    console.log('4961 post submit result:', etResult);
    await page.close();
  } catch (e) {
    console.log('4961 error:', e.message);
  }

  // 5. Test Hollywood 3D Printing
  console.log('\n--- 4962 Hollywood 3D Printing ---');
  try {
    const page = await browser.newPage();
    await page.goto('https://hollywood3dprinting.com/get-a-quote', { waitUntil: 'networkidle2', timeout: 25000 });
    const quoteOpts = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('a, button, input')).map(el => ({
        tag: el.tagName,
        text: el.innerText || el.value,
        href: el.href
      })).filter(x => x.text && x.text.length < 50);
    });
    console.log('4962 options:', quoteOpts);
    await page.close();
  } catch (e) {
    console.log('4962 error:', e.message);
  }

  await browser.close();
}

runDeep().catch(console.error);
