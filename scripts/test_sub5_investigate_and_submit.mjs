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

async function testLead4600() {
  console.log('\n--- Testing Lead #4600: SM-W ---');
  const browser = await puppeteer.launch({ executablePath: CHROME_BIN, headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  try {
    await page.goto('https://sm-w.com/Contact/Contact_Turnkey_Metal_Fabrication.aspx', { waitUntil: 'domcontentloaded', timeout: 20000 });
    const text = await page.evaluate(() => document.body.innerText);
    console.log('Page text excerpt:', text.slice(0, 500).replace(/\n+/g, ' '));
    const forms = await page.evaluate(() => Array.from(document.querySelectorAll('form')).map(f => ({ id: f.id, html: f.outerHTML.slice(0, 300) })));
    console.log('Forms:', forms);
  } catch (e) { console.log('Error 4600:', e.message); }
  finally { await browser.close(); }
}

async function testLead4601() {
  console.log('\n--- Testing Lead #4601: H J Lockhart ---');
  const browser = await puppeteer.launch({ executablePath: CHROME_BIN, headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  try {
    await page.goto('https://lockhartmetalservice.com/', { waitUntil: 'networkidle2', timeout: 25000 });
    // Fill GoDaddy form
    const inputs = await page.$$('form input:not([type="hidden"]), form textarea');
    console.log('Found inputs:', inputs.length);
    // Find name, email, message
    const nameInput = await page.$('input[aria-label*="Name" i], input[id*="input114213"], input[data-aid*="NAME"]');
    const emailInput = await page.$('input[aria-label*="Email" i], input[id*="input114214"], input[data-aid*="EMAIL"]');
    const msgInput = await page.$('textarea');

    if (nameInput) await nameInput.type(PROFILE.fullName, { delay: 20 });
    if (emailInput) await emailInput.type(PROFILE.email, { delay: 20 });
    if (msgInput) await msgInput.type(PROFILE.message, { delay: 20 });

    const submitBtn = await page.$('button[data-aid="CONTACT_SUBMIT_BUTTON_REND"], form button[type="submit"]');
    console.log('Submit button found:', !!submitBtn);
    if (submitBtn) {
      await submitBtn.click();
      await new Promise(r => setTimeout(r, 4000));
      const bodyText = await page.evaluate(() => document.body.innerText);
      console.log('Body text post-click:', bodyText.includes('Thank') ? 'Found Thank you!' : 'No thank you. Snippet: ' + bodyText.slice(0, 300).replace(/\n+/g, ' '));
      const alertText = await page.evaluate(() => {
        const el = document.querySelector('[role="alert"], [data-aid*="ALERT"], .notification, .form-message');
        return el ? el.innerText : null;
      });
      console.log('Alert el:', alertText);
    }
  } catch (e) { console.log('Error 4601:', e.message); }
  finally { await browser.close(); }
}

async function testLead4602() {
  console.log('\n--- Testing Lead #4602: Smart Metal Studio (Wix) ---');
  const browser = await puppeteer.launch({ executablePath: CHROME_BIN, headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  try {
    await page.goto('https://www.smartmetalstudio.com/', { waitUntil: 'networkidle2', timeout: 25000 });
    // Scroll to contact form
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await new Promise(r => setTimeout(r, 1000));

    const nameField = await page.$('input[name="name"], input[placeholder*="Name" i]');
    const emailField = await page.$('input[name="email"], input[type="email"]');
    const subjField = await page.$('input[name="subject"], input[placeholder*="Subject" i]');
    const msgField = await page.$('textarea');
    const btn = await page.$('button[aria-label="SEND US AN EMAIL"], button[data-testid="buttonElement"]');

    console.log('Fields:', { name: !!nameField, email: !!emailField, subj: !!subjField, msg: !!msgField, btn: !!btn });

    if (nameField) await nameField.type(PROFILE.fullName, { delay: 20 });
    if (emailField) await emailField.type(PROFILE.email, { delay: 20 });
    if (subjField) await subjField.type(PROFILE.subject, { delay: 20 });
    if (msgField) await msgField.type(PROFILE.message, { delay: 20 });

    if (btn) {
      await btn.click();
      await new Promise(r => setTimeout(r, 4000));
      const res = await page.evaluate(() => {
        const msgs = Array.from(document.querySelectorAll('[data-testid="form-submitted"], .wixui-form__message, [role="alert"]')).map(e => e.innerText);
        return { msgs, bodySnippet: document.body.innerText.slice(-500).replace(/\n+/g, ' ') };
      });
      console.log('Post-submit result 4602:', res);
    }
  } catch (e) { console.log('Error 4602:', e.message); }
  finally { await browser.close(); }
}

async function testLead4604() {
  console.log('\n--- Testing Lead #4604: MetalWork Austin (CF7) ---');
  const browser = await puppeteer.launch({ executablePath: CHROME_BIN, headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  try {
    await page.goto('https://metalworkaustin.com/', { waitUntil: 'networkidle2', timeout: 25000 });
    await page.evaluate((p) => {
      const fn = document.querySelector('input[name="your-firstname"]');
      const ln = document.querySelector('input[name="your-lastname"]');
      const em = document.querySelector('input[name="your-email"]');
      const ph = document.querySelector('input[name="tel-156"]');
      const msg = document.querySelector('textarea[name="your-message"]');
      if (fn) fn.value = p.firstName;
      if (ln) ln.value = p.lastName;
      if (em) em.value = p.email;
      if (ph) ph.value = p.phone;
      if (msg) msg.value = p.message;
    }, PROFILE);

    const submitBtn = await page.$('form.wpcf7-form input[type="submit"]');
    console.log('Submit button found:', !!submitBtn);
    if (submitBtn) {
      await submitBtn.click();
      await new Promise(r => setTimeout(r, 5000));
      const output = await page.evaluate(() => {
        const out = document.querySelector('.wpcf7-response-output');
        return out ? { text: out.innerText, cls: out.className } : null;
      });
      console.log('CF7 Output 4604:', output);
    }
  } catch (e) { console.log('Error 4604:', e.message); }
  finally { await browser.close(); }
}

async function testLead4605() {
  console.log('\n--- Testing Lead #4605: Supreme Custom Metalwork (Formidable) ---');
  const browser = await puppeteer.launch({ executablePath: CHROME_BIN, headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  try {
    await page.goto('https://supremecustommetalwork.com/contact/', { waitUntil: 'networkidle2', timeout: 25000 });
    // Inspect formidable fields
    const formFields = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('#form_contact-form input, #form_contact-form textarea')).map(i => ({
        name: i.name, id: i.id, type: i.type, placeholder: i.placeholder
      }));
    });
    console.log('Formidable fields:', formFields);

    await page.type('input[name="item_meta[1]"]', PROFILE.firstName, { delay: 15 });
    await page.type('input[name="item_meta[2]"]', PROFILE.lastName, { delay: 15 });
    await page.type('input[name="item_meta[3]"]', PROFILE.email, { delay: 15 });
    await page.type('textarea[name="item_meta[5]"]', PROFILE.message, { delay: 15 });

    // What is item_meta[20]? Let's check
    const extraField = await page.evaluate(() => {
      const el = document.querySelector('input[name="item_meta[20]"]');
      return el ? { label: el.closest('.frm_form_field')?.innerText, val: el.value, type: el.type, isVisible: el.offsetWidth > 0 } : null;
    });
    console.log('Extra field item_meta[20]:', extraField);

    const submitBtn = await page.$('#form_contact-form button[type="submit"], #form_contact-form input[type="submit"]');
    console.log('Submit button:', !!submitBtn);
    if (submitBtn) {
      await submitBtn.click();
      await new Promise(r => setTimeout(r, 4000));
      const result = await page.evaluate(() => {
        const confirmation = document.querySelector('.frm_message, .frm_error_style, [role="alert"]');
        return confirmation ? { text: confirmation.innerText, class: confirmation.className } : { bodySnippet: document.body.innerText.slice(0, 300) };
      });
      console.log('Post submit 4605:', result);
    }
  } catch (e) { console.log('Error 4605:', e.message); }
  finally { await browser.close(); }
}

async function testLead4606() {
  console.log('\n--- Testing Lead #4606: Capitol Company ---');
  const browser = await puppeteer.launch({ executablePath: CHROME_BIN, headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  try {
    await page.goto('https://www.capitolcompany.com/', { waitUntil: 'domcontentloaded', timeout: 20000 });
    const allLinks = await page.evaluate(() => Array.from(document.querySelectorAll('a[href]')).map(a => ({ text: a.innerText.trim(), href: a.href })));
    console.log('All links on Capitol:', allLinks);
    const formCount = await page.evaluate(() => document.querySelectorAll('form').length);
    console.log('Forms on Capitol homepage:', formCount);
  } catch (e) { console.log('Error 4606:', e.message); }
  finally { await browser.close(); }
}

async function testLead4608() {
  console.log('\n--- Testing Lead #4608: Affinity Metalworks (Wix) ---');
  const browser = await puppeteer.launch({ executablePath: CHROME_BIN, headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  try {
    await page.goto('https://www.affinitymetalworks.com/', { waitUntil: 'networkidle2', timeout: 25000 });
    // Find all inputs in the form
    const inputs = await page.evaluate(() => {
      const form = document.querySelector('form');
      if (!form) return [];
      return Array.from(form.querySelectorAll('input, textarea')).map(i => ({
        id: i.id, name: i.name, type: i.type, placeholder: i.placeholder,
        label: i.closest('label')?.innerText || i.previousElementSibling?.innerText || ''
      }));
    });
    console.log('Affinity inputs:', inputs);

    // Fill form
    const nameInput = await page.$('input[name*="d26f7dea"], input[placeholder*="First Name" i], input[type="text"]');
    const emailInput = await page.$('input[type="email"]');
    const msgInput = await page.$('textarea');
    const submitBtn = await page.$('form button[type="submit"], form button');

    if (nameInput) await nameInput.type(PROFILE.fullName, { delay: 20 });
    if (emailInput) await emailInput.type(PROFILE.email, { delay: 20 });
    if (msgInput) await msgInput.type(PROFILE.message, { delay: 20 });

    console.log('Submit button found:', !!submitBtn);
    if (submitBtn) {
      await submitBtn.click();
      await new Promise(r => setTimeout(r, 4000));
      const res = await page.evaluate(() => {
        const el = document.querySelector('[data-testid="form-submitted"], .wixui-form__message, [role="alert"]');
        return el ? el.innerText : 'No alert element. Body text: ' + document.body.innerText.slice(-400).replace(/\n+/g, ' ');
      });
      console.log('Affinity post submit:', res);
    }
  } catch (e) { console.log('Error 4608:', e.message); }
  finally { await browser.close(); }
}

async function testLead4609() {
  console.log('\n--- Testing Lead #4609: K & K Welding LLC (GoDaddy) ---');
  const browser = await puppeteer.launch({ executablePath: CHROME_BIN, headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  try {
    await page.goto('https://kkweldingllc.com/contact-us', { waitUntil: 'networkidle2', timeout: 25000 });
    const nameField = await page.$('input[aria-label*="Name" i], #input6');
    const phoneField = await page.$('input[aria-label*="Phone" i], #input7');
    const emailField = await page.$('input[aria-label*="Email" i], #input8');
    const msgField = await page.$('textarea');
    const btn = await page.$('button[data-aid="CONTACT_SUBMIT_BUTTON_REND"], form button[type="submit"]');

    console.log('Fields 4609:', { name: !!nameField, phone: !!phoneField, email: !!emailField, msg: !!msgField, btn: !!btn });

    if (nameField) await nameField.type(PROFILE.fullName, { delay: 15 });
    if (phoneField) await phoneField.type(PROFILE.phone, { delay: 15 });
    if (emailField) await emailField.type(PROFILE.email, { delay: 15 });
    if (msgField) await msgField.type(PROFILE.message, { delay: 15 });

    if (btn) {
      await btn.click();
      await new Promise(r => setTimeout(r, 4500));
      const res = await page.evaluate(() => {
        const el = document.querySelector('[data-aid*="NOTIFICATION"], [role="alert"], .alert');
        return el ? el.innerText : 'Body: ' + document.body.innerText.slice(0, 300).replace(/\n+/g, ' ');
      });
      console.log('K & K post submit:', res);
    }
  } catch (e) { console.log('Error 4609:', e.message); }
  finally { await browser.close(); }
}

async function runAll() {
  await testLead4600();
  await testLead4601();
  await testLead4602();
  await testLead4604();
  await testLead4605();
  await testLead4606();
  await testLead4608();
  await testLead4609();
}

runAll();
