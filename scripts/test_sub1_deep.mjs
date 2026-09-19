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
  address: '100 Main St, Chicago, IL 60601',
  message: 'Hello, I am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects. Thank you. Sincerely, Pamela Jameson'
};

async function testForms() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--ignore-certificate-errors']
  });

  // 1. Palmer Engineering (4388)
  console.log('\n--- Testing Lead 4388: Palmer Engineering ---');
  try {
    const page = await browser.newPage();
    await page.goto('https://pecga.com/contact/', { waitUntil: 'networkidle2', timeout: 25000 });
    // Fill CF7
    await page.type('input[name="first-name"]', OUTREACH_PROFILE.firstName);
    await page.type('input[name="last-name"]', OUTREACH_PROFILE.lastName);
    await page.type('input[name="your-email"]', OUTREACH_PROFILE.email);
    await page.type('input[name="phone-number"]', OUTREACH_PROFILE.phone);
    await page.type('input[name="your-subject"]', OUTREACH_PROFILE.subject);
    await page.type('textarea[name="your-message"]', OUTREACH_PROFILE.message);
    
    console.log('Fields filled. Submitting...');
    await Promise.all([
      page.click('input[type="submit"]'),
      page.waitForNetworkIdle({ timeout: 10000 }).catch(() => {})
    ]);
    await new Promise(r => setTimeout(r, 4000));
    const responseOutput = await page.evaluate(() => {
      const output = document.querySelector('.wpcf7-response-output');
      return output ? output.innerText : document.body.innerText;
    });
    console.log('CF7 response output:', responseOutput.substring(0, 300));
    await page.close();
  } catch (e) {
    console.log('Lead 4388 error:', e.message);
  }

  // 2. Uzun+Case (4389)
  console.log('\n--- Testing Lead 4389: Uzun+Case ---');
  try {
    const page = await browser.newPage();
    await page.goto('https://uzuncase.com/contact/', { waitUntil: 'networkidle2', timeout: 25000 });
    
    // Inspect fields labels and select options
    const fieldDetails = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('#gform_1 label, #gform_1 select option')).map(el => ({
        tag: el.tagName,
        text: el.innerText,
        for: el.getAttribute('for'),
        value: el.getAttribute('value')
      }));
    });
    console.log('Uzun+Case fields & options:', fieldDetails);

    // Fill form
    await page.type('#input_1_7', OUTREACH_PROFILE.firstName);
    await page.type('#input_1_6', OUTREACH_PROFILE.lastName);
    await page.type('#input_1_2', OUTREACH_PROFILE.phone);
    await page.type('#input_1_3', OUTREACH_PROFILE.email);
    // select first non-empty option for input_1_4
    await page.evaluate(() => {
      const sel = document.querySelector('#input_1_4');
      if (sel && sel.options.length > 1) {
        sel.selectedIndex = 1;
        sel.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    await page.type('#input_1_5', OUTREACH_PROFILE.message);

    console.log('Uzun+Case fields filled. Submitting...');
    const submitBtn = await page.$('#gform_submit_button_1');
    if (submitBtn) {
      await Promise.all([
        submitBtn.click(),
        page.waitForNavigation({ timeout: 10000, waitUntil: 'domcontentloaded' }).catch(() => {})
      ]);
    }
    await new Promise(r => setTimeout(r, 4000));
    const postText = await page.evaluate(() => document.body.innerText);
    console.log('Uzun+Case post-submission text excerpt:', postText.substring(0, 400));
    await page.close();
  } catch (e) {
    console.log('Lead 4389 error:', e.message);
  }

  // 3. jblueprints (4387)
  console.log('\n--- Testing Lead 4387: jblueprints ---');
  try {
    const page = await browser.newPage();
    await page.goto('https://jblueprints.com', { waitUntil: 'domcontentloaded', timeout: 20000 });
    console.log('jblueprints loaded! Title:', await page.title());
    const forms = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('form')).map(f => f.outerHTML);
    });
    console.log('jblueprints forms count:', forms.length);
    const links = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('a')).map(a => ({ text: a.innerText, href: a.href }));
    });
    console.log('jblueprints links:', links);
    await page.close();
  } catch (e) {
    console.log('Lead 4387 error:', e.message);
  }

  // 4. Skywark Engineering (4390)
  console.log('\n--- Testing Lead 4390: Skywark Engineering ---');
  try {
    const page = await browser.newPage();
    await page.goto('https://www.skywarkengineering.com/contact-us', { waitUntil: 'networkidle2', timeout: 25000 });
    console.log('Skywark loaded. Checking Wix form...');
    await page.type('#input_comp-ltn6nn00', OUTREACH_PROFILE.firstName);
    await page.type('#input_comp-ltn6nn0b1', OUTREACH_PROFILE.lastName);
    await page.type('#input_comp-ltnv3nyh', OUTREACH_PROFILE.phone);
    await page.type('#input_comp-ltn6nn0d', OUTREACH_PROFILE.email);
    await page.type('#input_comp-ltnv429a', OUTREACH_PROFILE.address);
    await page.type('#textarea_comp-ltn6nn0e1', OUTREACH_PROFILE.message);

    // Find submit button
    const btnText = await page.evaluate(() => {
      const btn = document.querySelector('button[data-testid="buttonElement"], button[type="submit"], [role="button"]');
      return btn ? { text: btn.innerText, tag: btn.tagName } : null;
    });
    console.log('Skywark submit button:', btnText);
    
    // Click submit
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const sub = btns.find(b => /submit|send/i.test(b.innerText));
      if (sub) sub.click();
    });
    await new Promise(r => setTimeout(r, 5000));
    const skywarkMsg = await page.evaluate(() => {
      const success = document.querySelector('[data-testid="messageline"], [data-testid="notifications"], .notifications');
      return {
        successEl: success ? success.innerText : null,
        bodyExcerpt: document.body.innerText.substring(0, 300)
      };
    });
    console.log('Skywark post-submission:', skywarkMsg);
    await page.close();
  } catch (e) {
    console.log('Lead 4390 error:', e.message);
  }

  // 5. Sanrachna Steel (4391)
  console.log('\n--- Testing Lead 4391: Sanrachna Steel ---');
  try {
    const page = await browser.newPage();
    await page.goto('https://sanrachnasteel.com/contact-us', { waitUntil: 'networkidle2', timeout: 25000 });
    const inputs = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('input, textarea, button')).map(el => ({
        tag: el.tagName,
        id: el.id,
        name: el.name,
        placeholder: el.placeholder,
        text: el.innerText
      }));
    });
    console.log('Sanrachna inputs:', inputs);
    await page.close();
  } catch (e) {
    console.log('Lead 4391 error:', e.message);
  }

  // 6. Sykes Consulting (4392)
  console.log('\n--- Testing Lead 4392: Sykes Consulting ---');
  try {
    const page = await browser.newPage();
    await page.goto('https://sykes-consulting.com/contact-us', { waitUntil: 'networkidle2', timeout: 25000 });
    const inputs = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('input, textarea, button')).map(el => ({
        tag: el.tagName,
        id: el.id,
        name: el.name,
        placeholder: el.placeholder,
        text: el.innerText
      }));
    });
    console.log('Sykes inputs:', inputs);
    await page.close();
  } catch (e) {
    console.log('Lead 4392 error:', e.message);
  }

  await browser.close();
}

testForms();
