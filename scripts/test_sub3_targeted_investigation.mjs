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
  message: `Hello,

I am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects.

We look forward to your response and the possibility of working together.

Thank you for your time and attention.

Sincerely,
Pamela Jameson`
};

async function testSyms() {
  console.log('\n--- Testing Lead #4469: SYMS Engineering ---');
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });
  const page = await browser.newPage();
  try {
    let dialogMsg = '';
    page.on('dialog', async dialog => {
      dialogMsg = dialog.message();
      console.log('Dialog popped up:', dialogMsg);
      await dialog.accept();
    });

    await page.goto('https://syms-e.com/sub/contact.php.html', { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Fill fields
    await page.type('#wr_subject', OUTREACH_PROFILE.fullName);
    await page.type('#wr_1', OUTREACH_PROFILE.email);
    await page.type('#wr_2', OUTREACH_PROFILE.phone);
    await page.type('#wr_3', OUTREACH_PROFILE.company);
    await page.type('#wr_content', OUTREACH_PROFILE.message);

    // Check checkbox if present
    const chk = await page.$('#chk');
    if (chk) {
      const isChecked = await (await chk.getProperty('checked')).jsonValue();
      if (!isChecked) {
        await chk.click();
        console.log('Checked agreement checkbox #chk');
      }
    }

    // Submit form
    console.log('Submitting SYMS form...');
    const submitBtn = await page.$('input[type="submit"], button[type="submit"], #frm input[type="image"]');
    
    const [response] = await Promise.all([
      page.waitForResponse(res => res.url().includes('submit') || res.url().includes('ajax') || res.status() === 200, { timeout: 10000 }).catch(() => null),
      submitBtn.click()
    ]);

    await new Promise(r => setTimeout(r, 4000));
    console.log('Dialog message received:', dialogMsg);
    if (response) {
      console.log('Response URL:', response.url(), 'status:', response.status());
      try {
        const text = await response.text();
        console.log('Response body:', text.substring(0, 300));
      } catch (e) {}
    }
    const pageContent = await page.content();
    console.log('Page content contains thank/success/confirm?', /thank|success|received|접수|완료/i.test(pageContent) || dialogMsg);

  } catch (err) {
    console.log('Error testing SYMS:', err.message);
  } finally {
    await browser.close();
  }
}

async function testClyde() {
  console.log('\n--- Testing Lead #4475: Clyde Industries Inc. ---');
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });
  const page = await browser.newPage();
  try {
    await page.goto('https://clyde-industries.com/about-us/#contact', { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Check CF7 form
    const form = await page.$('.wpcf7-form');
    if (!form) {
      console.log('No wpcf7-form found on Clyde');
      return;
    }

    // Fill inputs
    const fName = await page.$('input[name="first-name"]');
    if (fName) await fName.type(OUTREACH_PROFILE.firstName);

    const lName = await page.$('input[name="last-name"]');
    if (lName) await lName.type(OUTREACH_PROFILE.lastName);

    const email = await page.$('input[name="email"]');
    if (email) await email.type(OUTREACH_PROFILE.email);

    const tel = await page.$('input[name="telephone"]');
    if (tel) await tel.type(OUTREACH_PROFILE.phone);

    // Select country if required
    await page.evaluate(() => {
      const c = document.querySelector('select[name="country"]');
      if (c && c.options.length > 1) {
        c.selectedIndex = 1;
        c.dispatchEvent(new Event('change', { bubbles: true }));
      }
      const interest = document.querySelector('select[name="Interest"]');
      if (interest && interest.options.length > 1) {
        interest.selectedIndex = 1;
        interest.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });

    const msg = await page.$('textarea[name="your-message"]');
    if (msg) await msg.type(OUTREACH_PROFILE.message);

    console.log('Submitting Clyde Industries CF7 form...');
    const submitBtn = await page.$('.wpcf7-form input[type="submit"]');
    
    const [cf7Response] = await Promise.all([
      page.waitForResponse(res => res.url().includes('feedback') || res.url().includes('contact-form-7'), { timeout: 15000 }).catch(() => null),
      submitBtn.click()
    ]);

    await new Promise(r => setTimeout(r, 4000));
    if (cf7Response) {
      console.log('CF7 response status:', cf7Response.status());
      try {
        const json = await cf7Response.json();
        console.log('CF7 response JSON:', JSON.stringify(json));
      } catch (e) {
        const txt = await cf7Response.text();
        console.log('CF7 response text:', txt.substring(0, 300));
      }
    }

    const outputText = await page.evaluate(() => {
      const out = document.querySelector('.wpcf7-response-output');
      return out ? out.innerText.trim() : null;
    });
    console.log('CF7 output message on page:', outputText);

  } catch (err) {
    console.log('Error testing Clyde:', err.message);
  } finally {
    await browser.close();
  }
}

async function testWeiser() {
  console.log('\n--- Testing Lead #4466: Weiser Engineering ---');
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });
  const page = await browser.newPage();
  try {
    await page.goto('https://www.weiser-engineering.com/', { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Fill Wix form
    await page.type('#input_comp-knkpo3fy', OUTREACH_PROFILE.fullName);
    await page.type('#input_comp-knkpo3g81', OUTREACH_PROFILE.email);
    await page.type('#input_comp-knkpo3gb2', OUTREACH_PROFILE.subject);
    await page.type('#textarea_comp-knkpo3ge1', OUTREACH_PROFILE.message);

    console.log('Clicking Wix submit button...');
    const submitBtn = await page.$('#comp-knkpo3fc button[type="submit"], #comp-knkpo3fc [data-testid="buttonElement"]');
    
    const [wixResp] = await Promise.all([
      page.waitForResponse(res => res.url().includes('wix') || res.url().includes('form'), { timeout: 10000 }).catch(() => null),
      submitBtn ? submitBtn.click() : page.click('#comp-knkpo3fc button')
    ]);

    await new Promise(r => setTimeout(r, 4000));
    
    // Check notifications or success elements
    const successMsg = await page.evaluate(() => {
      const allText = document.body.innerText;
      const notifications = Array.from(document.querySelectorAll('[data-testid="messagedataview"], [aria-live="polite"], [class*="success"], [class*="notification"]')).map(el => el.innerText.trim());
      return { notifications, hasThank: /thank you|thanks for submitting/i.test(allText) };
    });
    console.log('Wix submit result:', JSON.stringify(successMsg));

  } catch (err) {
    console.log('Error testing Weiser:', err.message);
  } finally {
    await browser.close();
  }
}

async function main() {
  await testSyms();
  await testClyde();
  await testWeiser();
}

main();
