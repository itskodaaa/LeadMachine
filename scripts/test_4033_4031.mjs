import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const PROFILE = {
  firstName: 'Pamela',
  lastName: 'Jameson',
  fullName: 'Pamela Jameson',
  email: 'pamela.jameson@nortiheastprecision.com',
  phone: '708-568-3708',
  company: 'Northeast Precision Machinery, Inc.',
  subject: 'Exploring Collaboration Opportunities',
  message: `Hello, I am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects.`
};

async function test4033() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  try {
    console.log('\n--- Testing #4033 PSI Engineering submission ---');
    await page.goto('https://psiengineeringinc.com/', { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Scroll down to form
    await page.evaluate(() => {
      const el = document.querySelector('[data-aid="CONTACT_FORM_NAME"]');
      if (el) el.scrollIntoView();
    });
    await new Promise(r => setTimeout(r, 1000));

    await page.type('input[data-aid="CONTACT_FORM_NAME"]', PROFILE.fullName, { delay: 20 });
    await page.type('input[data-aid="CONTACT_FORM_EMAIL"]', PROFILE.email, { delay: 20 });
    await page.type('input[data-aid="Phone"]', PROFILE.phone, { delay: 20 });
    await page.type('textarea[data-aid="CONTACT_FORM_MESSAGE"]', PROFILE.message, { delay: 10 });

    console.log('Fields filled for 4033. Clicking submit...');
    const btn = await page.$('button[data-aid="CONTACT_SUBMIT_BUTTON_REND"]');
    await btn.click();
    await new Promise(r => setTimeout(r, 6000));

    const result = await page.evaluate(() => {
      const body = document.body.innerText;
      return {
        textSnippet: body.slice(body.indexOf('Message'), body.indexOf('Message') + 400),
        hasThank: body.toLowerCase().includes('thank')
      };
    });
    console.log('Result #4033:', JSON.stringify(result, null, 2));

  } catch(e) {
    console.error('4033 err:', e.message);
  } finally {
    await browser.close();
  }
}

async function test4031() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    acceptInsecureCerts: true,
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--ignore-certificate-errors']
  });

  const page = await browser.newPage();
  try {
    console.log('\n--- Inspecting #4031 ME Engineering labels ---');
    await page.goto('https://mengineeringc.com/contact-us', { waitUntil: 'networkidle2', timeout: 30000 });
    const labels = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('.form-group, form div, label')).map(el => ({
        tag: el.tagName,
        className: el.className,
        text: el.innerText
      })).filter(x => x.text && x.text.length < 100);
    });
    console.log('4031 labels:', JSON.stringify(labels.slice(0, 15), null, 2));
  } catch(e) {
    console.error('4031 err:', e.message);
  } finally {
    await browser.close();
  }
}

async function main() {
  await test4033();
  await test4031();
}

main();
