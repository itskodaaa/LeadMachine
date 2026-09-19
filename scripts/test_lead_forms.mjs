import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

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

const leadId = parseInt(process.argv[2], 10);

async function test3418() {
  console.log('\n--- Testing Lead #3418: Hardin & Associates Consulting ---');
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  try {
    await page.goto('https://hactexas.com/contact', { waitUntil: 'networkidle2', timeout: 30000 });
    console.log('Loaded:', page.url());

    // Select category dropdown
    const selectOptions = await page.evaluate(() => {
      const select = document.querySelector('select[name="category"]');
      if (!select) return [];
      return Array.from(select.options).map(o => ({ text: o.text, value: o.value }));
    });
    console.log('Category options:', selectOptions);

    if (selectOptions.length > 1) {
      await page.select('select[name="category"]', selectOptions[1].value);
    }

    await page.type('input[name="first_name"]', profile.firstName, { delay: 20 });
    await page.type('input[name="last_name"]', profile.lastName, { delay: 20 });
    await page.type('input[name="email"]', profile.email, { delay: 20 });
    await page.type('input[name="subject"]', profile.subject, { delay: 20 });
    await page.type('textarea[name="message"]', profile.message, { delay: 10 });

    // Check captcha
    const captchaInfo = await page.evaluate(() => {
      const c = document.querySelector('#captcha');
      const g = document.querySelector('.g-recaptcha, iframe[src*="recaptcha"]');
      return { cVal: c ? c.value : null, gFound: !!g };
    });
    console.log('Captcha info on 3418:', captchaInfo);

    // Let's see submit button
    const submitBtn = await page.$('input[type="submit"], button[type="submit"], #demo-form button, #demo-form input[type="submit"]');
    console.log('Submit button found:', !!submitBtn);

    if (submitBtn) {
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 20000 }).catch(e => console.log('Nav:', e.message)),
        submitBtn.click()
      ]);
      await new Promise(r => setTimeout(r, 4000));
      const postText = await page.evaluate(() => document.body.innerText);
      console.log('Post submit URL:', page.url());
      console.log('Post submit text snippet:\n', postText.slice(0, 500));
    }

  } catch (e) {
    console.error('Error on 3418:', e.message);
  } finally {
    await browser.close();
  }
}

async function test3422() {
  console.log('\n--- Testing Lead #3422: Magee Machine & Manufacturing Inc. ---');
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  try {
    await page.goto('https://www.mageemachine.com/', { waitUntil: 'networkidle2', timeout: 30000 });
    console.log('Loaded:', page.url());

    // Scroll to contact section
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await new Promise(r => setTimeout(r, 2000));

    await page.type('#input_comp-kf4o71qz', profile.fullName, { delay: 20 });
    await page.type('#input_comp-kf4o71rc', profile.email, { delay: 20 });
    await page.type('#input_comp-kf4o71rh', profile.phone, { delay: 20 });
    await page.type('#input_comp-kf4o71ro', profile.subject, { delay: 20 });
    await page.type('#textarea_comp-kf4o71ru', profile.message, { delay: 10 });

    console.log('Filled Magee fields.');
    // Find the button inside the form
    const clicked = await page.evaluate(() => {
      const btn = document.querySelector('button[data-testid="buttonElement"]') || Array.from(document.querySelectorAll('button')).find(b => b.innerText.toLowerCase().includes('submit'));
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });
    console.log('Submit button clicked:', clicked);

    await new Promise(r => setTimeout(r, 6000));

    const result = await page.evaluate(() => {
      const text = document.body.innerText;
      const notifications = Array.from(document.querySelectorAll('[data-testid="notifications"], [aria-live], .notifications')).map(n => n.innerText);
      const formText = document.querySelector('form')?.innerText || '';
      return { notifications, formText, hasThanks: /thank|submitted|success/i.test(text) };
    });
    console.log('Magee post-submit result:', result);

  } catch (e) {
    console.error('Error on 3422:', e.message);
  } finally {
    await browser.close();
  }
}

async function test3423() {
  console.log('\n--- Testing Lead #3423: Keith and Company, Inc. ---');
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  try {
    await page.goto('https://keithmachine.com/', { waitUntil: 'networkidle2', timeout: 30000 });
    console.log('Loaded:', page.url());

    const formDetails = await page.evaluate(() => {
      const form = document.querySelector('form');
      if (!form) return null;
      const inputs = Array.from(form.querySelectorAll('input, textarea, button')).map(el => ({
        tag: el.tagName,
        type: el.type,
        id: el.id,
        name: el.name,
        placeholder: el.placeholder,
        label: el.labels ? Array.from(el.labels).map(l => l.innerText).join(', ') : '',
        parentText: el.parentElement?.innerText || ''
      }));
      return inputs;
    });
    console.log('Keith machine form inputs detail:', JSON.stringify(formDetails, null, 2));

  } catch (e) {
    console.error('Error on 3423:', e.message);
  } finally {
    await browser.close();
  }
}

async function test3425() {
  console.log('\n--- Testing Lead #3425: Microspace Instruments Inc. ---');
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  try {
    await page.goto('https://mspace.com/request-for-quote', { waitUntil: 'networkidle2', timeout: 30000 });
    console.log('Loaded:', page.url());

    const formDetails = await page.evaluate(() => {
      const form = document.querySelector('form');
      if (!form) return null;
      const inputs = Array.from(form.querySelectorAll('input, textarea, button')).map(el => ({
        tag: el.tagName,
        type: el.type,
        id: el.id,
        name: el.name,
        placeholder: el.placeholder,
        label: el.labels ? Array.from(el.labels).map(l => l.innerText).join(', ') : '',
        parentText: el.parentElement?.innerText || ''
      }));
      return inputs;
    });
    console.log('Microspace form inputs detail:', JSON.stringify(formDetails, null, 2));

  } catch (e) {
    console.error('Error on 3425:', e.message);
  } finally {
    await browser.close();
  }
}

async function main() {
  if (leadId === 3418) await test3418();
  else if (leadId === 3422) await test3422();
  else if (leadId === 3423) await test3423();
  else if (leadId === 3425) await test3425();
}

main();
