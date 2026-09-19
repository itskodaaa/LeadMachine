import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const leadId = parseInt(process.argv[2], 10);

const profile = {
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

async function testHPMB() {
  // Lead 3420: HPMB Consulting Engineers
  console.log('Testing Lead 3420: HPMB Consulting Engineers');
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');

  try {
    await page.goto('https://www.hpmbengineers.com/contact/', { waitUntil: 'networkidle2', timeout: 30000 });
    console.log('Page loaded:', page.url());

    await page.type('#input_1_1_3', profile.firstName, { delay: 30 });
    await page.type('#input_1_1_6', profile.lastName, { delay: 30 });
    await page.type('#input_1_2', profile.email, { delay: 30 });
    await page.type('#input_1_3', profile.phone, { delay: 30 });
    await page.type('#input_1_4', profile.message, { delay: 20 });

    console.log('Filled form fields. Submitting...');
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(e => console.log('Nav wait:', e.message)),
      page.click('#gform_submit_button_1')
    ]);

    await new Promise(r => setTimeout(r, 4000));
    const content = await page.evaluate(() => document.body.innerText);
    console.log('Post-submit URL:', page.url());
    console.log('Page text snippet:\n', content.slice(0, 800));

    const confirmation = await page.evaluate(() => {
      const conf = document.querySelector('.gform_confirmation_message, .confirmation, .alert-success');
      return conf ? conf.innerText : null;
    });
    console.log('Confirmation message element:', confirmation);

  } catch (e) {
    console.error('Error on HPMB:', e.message);
  } finally {
    await browser.close();
  }
}

async function testHAC() {
  // Lead 3418: hactexas.com
  console.log('Testing Lead 3418: Hardin & Associates Consulting');
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  try {
    await page.goto('https://hactexas.com/contact', { waitUntil: 'networkidle2', timeout: 30000 });
    console.log('Page loaded:', page.url());

    // Inspect the form and captcha
    const info = await page.evaluate(() => {
      const form = document.querySelector('#demo-form');
      const scripts = Array.from(document.querySelectorAll('script')).map(s => s.src).filter(Boolean);
      const captchaInput = document.querySelector('#captcha');
      return {
        formFound: !!form,
        captchaVal: captchaInput ? captchaInput.value : null,
        scripts: scripts.filter(s => s.includes('captcha') || s.includes('google'))
      };
    });
    console.log('HAC form info:', info);
  } catch (e) {
    console.error('Error on HAC:', e.message);
  } finally {
    await browser.close();
  }
}

async function testMagee() {
  // Lead 3422: Magee Machine
  console.log('Testing Lead 3422: Magee Machine');
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  try {
    await page.goto('https://www.mageemachine.com/', { waitUntil: 'networkidle2', timeout: 30000 });
    console.log('Page loaded:', page.url());

    // Look at form
    const formFields = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input, textarea')).map(i => ({
        id: i.id,
        name: i.name,
        placeholder: i.placeholder,
        val: i.value
      }));
      const buttons = Array.from(document.querySelectorAll('button')).map(b => ({
        text: b.innerText,
        type: b.type
      }));
      return { inputs, buttons };
    });
    console.log('Magee fields:', formFields);

    await page.type('#input_comp-kf4o71qz', profile.fullName, { delay: 20 });
    await page.type('#input_comp-kf4o71rc', profile.email, { delay: 20 });
    await page.type('#input_comp-kf4o71rh', profile.phone, { delay: 20 });
    await page.type('#input_comp-kf4o71ro', profile.subject, { delay: 20 });
    await page.type('#textarea_comp-kf4o71ru', profile.message, { delay: 10 });

    console.log('Filled Magee fields. Clicking submit...');
    const submitBtn = await page.$('button[type="submit"], button[data-testid="buttonElement"]');
    if (submitBtn) {
      await submitBtn.click();
    } else {
      console.log('Looking for submit button with text Submit');
      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const b = btns.find(x => x.innerText.toLowerCase().includes('submit'));
        if (b) b.click();
      });
    }

    await new Promise(r => setTimeout(r, 6000));

    // Check for success text or toast
    const postSubmit = await page.evaluate(() => {
      const body = document.body.innerText;
      const msgs = Array.from(document.querySelectorAll('[data-testid="notifications"], .success, .toast, [role="alert"]')).map(e => e.innerText);
      return { bodySnippet: body.slice(0, 1000), msgs };
    });
    console.log('Magee post-submit:', postSubmit);

  } catch (e) {
    console.error('Error on Magee:', e.message);
  } finally {
    await browser.close();
  }
}

async function run() {
  if (leadId === 3420) await testHPMB();
  else if (leadId === 3418) await testHAC();
  else if (leadId === 3422) await testMagee();
}

run();
