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
  zip: '60601',
  message: `Hello,

I am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects.

We look forward to your response and the possibility of working together.

Thank you for your time and attention.

Sincerely,
Pamela Jameson`
};

async function submitRockwell() {
  console.log('\n--- Submitting Rockwell Precision ---');
  const browser = await puppeteer.launch({ headless: 'new', executablePath: CHROME_BIN, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage();
    await page.goto('https://rockwellprecision.com/contact/', { waitUntil: 'networkidle2', timeout: 20000 });

    await page.type('#input_7_100', OUTREACH_PROFILE.firstName);
    await page.type('#input_7_101', OUTREACH_PROFILE.lastName);
    await page.type('#input_7_103', OUTREACH_PROFILE.phone);
    await page.type('#input_7_102', OUTREACH_PROFILE.email);
    await page.type('#input_7_7', OUTREACH_PROFILE.zip);
    await page.type('#input_7_104', OUTREACH_PROFILE.message);

    console.log('Filled all fields including zip. Submitting...');
    await Promise.all([
      page.waitForNavigation({ timeout: 15000 }).catch(e => console.log('Nav:', e.message)),
      page.click('#gform_submit_button_7')
    ]);

    await new Promise(r => setTimeout(r, 4000));
    const text = await page.evaluate(() => document.body.innerText);
    const confirmation = await page.evaluate(() => {
      const conf = document.querySelector('.gform_confirmation_message, [id*="gform_confirmation"]');
      return conf ? conf.innerText : null;
    });
    console.log('Rockwell confirmation element:', confirmation);
    const hasThanks = /thank you|thanks|received your message|we will be in touch/i.test(text);
    console.log('Has thanks in text:', hasThanks);
    if (confirmation) {
      console.log('SUCCESS Rockwell!');
    }
  } catch (e) {
    console.log('Error:', e.message);
  } finally {
    await browser.close();
  }
}

async function submitPrecisionMach() {
  console.log('\n--- Submitting Precision Machinery Contractors ---');
  const browser = await puppeteer.launch({ headless: 'new', executablePath: CHROME_BIN, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage();
    await page.goto('https://www.precisionmachllc.com/contact', { waitUntil: 'networkidle2', timeout: 20000 });

    // Find submit button in wix form
    const btnInfo = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.map(b => ({ text: b.innerText, id: b.id, class: b.className }));
    });
    console.log('All buttons on page:', JSON.stringify(btnInfo));

    await page.type('#input_comp-kq7zyxcj', OUTREACH_PROFILE.firstName);
    await page.type('#input_comp-kq7zyxcr2', OUTREACH_PROFILE.lastName);
    await page.type('#input_comp-kq7zyxcu1', OUTREACH_PROFILE.email);
    await page.type('#input_comp-kwn5p6jw', OUTREACH_PROFILE.phone);
    await page.type('#input_comp-kq7zyxcx', OUTREACH_PROFILE.company);
    await page.type('#textarea_comp-kq7zyxd1', OUTREACH_PROFILE.message);

    console.log('Filled form. Clicking submit button...');
    const clicked = await page.evaluate(() => {
      const submitBtn = Array.from(document.querySelectorAll('button')).find(b => /submit|send/i.test(b.innerText));
      if (submitBtn) {
        submitBtn.click();
        return true;
      }
      return false;
    });
    console.log('Clicked submit button?', clicked);

    await new Promise(r => setTimeout(r, 6000));
    const result = await page.evaluate(() => {
      const text = document.body.innerText;
      const success = /thanks for submitting|thank you|received/i.test(text);
      return { success, snippet: text.slice(0, 300) };
    });
    console.log('Precision Mach result:', JSON.stringify(result));
  } catch (e) {
    console.log('Error:', e.message);
  } finally {
    await browser.close();
  }
}

async function submitTitanium() {
  console.log('\n--- Submitting Titanium Engineers ---');
  const browser = await puppeteer.launch({ headless: 'new', executablePath: CHROME_BIN, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage();
    await page.goto('https://www.titaniumengineers.com/request-a-quote.html', { waitUntil: 'networkidle2', timeout: 20000 });

    await page.type('#input-825472944891523769', OUTREACH_PROFILE.firstName);
    await page.type('#input-825472944891523769-1', OUTREACH_PROFILE.lastName);
    await page.type('#input-346001875812142730', OUTREACH_PROFILE.email);
    await page.type('#input-639320241662572479', OUTREACH_PROFILE.phone);
    await page.type('#input-797669080850384012', OUTREACH_PROFILE.message);

    console.log('Filled Titanium form. Inspecting submit button...');
    const submitInfo = await page.evaluate(() => {
      const submit = document.querySelector('#form-443528741528713041 input[type="submit"], #form-443528741528713041 .wsite-button');
      return submit ? { tag: submit.tagName, class: submit.className, value: submit.value, visible: submit.offsetParent !== null } : null;
    });
    console.log('Submit button info:', submitInfo);

    // Scroll into view and click
    await page.evaluate(() => {
      const el = document.querySelector('#form-443528741528713041 input[type="submit"], #form-443528741528713041 .wsite-button');
      if (el) {
        el.scrollIntoView();
        el.click();
      }
    });

    await new Promise(r => setTimeout(r, 6000));
    const result = await page.evaluate(() => {
      const text = document.body.innerText;
      const success = /thank you|received|submitted/i.test(text);
      return { success, snippet: text.slice(0, 400) };
    });
    console.log('Titanium result:', JSON.stringify(result));
  } catch (e) {
    console.log('Error:', e.message);
  } finally {
    await browser.close();
  }
}

async function run() {
  await submitRockwell();
  await submitPrecisionMach();
  await submitTitanium();
}

run();
