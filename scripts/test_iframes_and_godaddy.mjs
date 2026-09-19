import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const OUTREACH_PROFILE = {
  fullName: 'Pamela Jameson',
  email: 'pamela.jameson@nortiheastprecision.com',
  phone: '708-568-3708',
  company: 'Northeast Precision Machinery, Inc.',
  subject: 'Exploring Collaboration Opportunities',
  message: `Hello,\n\nI am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects.\n\nWe look forward to your response and the possibility of working together.\n\nThank you for your time and attention.\n\nSincerely,\nPamela Jameson`
};

async function testKnightForm(browser) {
  console.log('\n--- 4159 Knight 123FormBuilder ---');
  const page = await browser.newPage();
  try {
    await page.goto('https://www.123formbuilder.com/form-1484936/', { waitUntil: 'networkidle2', timeout: 20000 });
    console.log('123FormBuilder title:', await page.title());
    const fields = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('input, textarea, select')).map(i => ({
        name: i.name,
        type: i.type,
        placeholder: i.placeholder,
        label: i.closest('label')?.innerText || i.parentElement?.innerText
      }));
    });
    console.log('Fields in 123formbuilder:', fields.slice(0, 10));
    const captchas = await page.evaluate(() => document.querySelectorAll('.g-recaptcha, iframe[src*="recaptcha"], iframe[src*="turnstile"]').length);
    console.log('Captchas in 123formbuilder:', captchas);
  } catch (e) {
    console.log('123FormBuilder error:', e.message);
  } finally {
    await page.close();
  }
}

async function testInsightJotform(browser) {
  console.log('\n--- 4164 INSIGHT JotForm ---');
  const page = await browser.newPage();
  try {
    await page.goto('https://form.jotform.com/220984738836168', { waitUntil: 'domcontentloaded', timeout: 20000 });
    console.log('JotForm title:', await page.title());
    const fields = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('input, textarea')).map(i => ({
        name: i.name,
        type: i.type,
        id: i.id
      }));
    });
    console.log('Jotform fields:', fields);
  } catch (e) {
    console.log('Jotform error:', e.message);
  } finally {
    await page.close();
  }
}

async function testLECGIForm(browser) {
  console.log('\n--- 4163 LECGI Form Test ---');
  const page = await browser.newPage();
  try {
    await page.goto('https://lecgitx.com/', { waitUntil: 'networkidle2', timeout: 20000 });
    // Find inputs by DOM traverse
    const res = await page.evaluate((p) => {
      const form = document.querySelector('form');
      if (!form) return 'no form';
      const inputs = Array.from(form.querySelectorAll('input[type="text"]:not([name="_app_id"]), input:not([type="hidden"]):not([type="file"]):not([type="submit"]), textarea'));
      return inputs.map(i => ({ id: i.id, tag: i.tagName, outer: i.outerHTML.substring(0, 80) }));
    }, OUTREACH_PROFILE);
    console.log('LECGI form fields list:', res);
  } catch (e) {
    console.log('LECGI error:', e.message);
  } finally {
    await page.close();
  }
}

async function testMBMForm(browser) {
  console.log('\n--- 4168 MBM Form Test ---');
  const page = await browser.newPage();
  try {
    await page.goto('https://mbmengr.com/contact-us', { waitUntil: 'networkidle2', timeout: 25000 });
    console.log('MBM Contact URL:', page.url());
    const res = await page.evaluate(() => {
      const form = document.querySelector('form');
      if (!form) return 'no form';
      const inputs = Array.from(form.querySelectorAll('input, textarea'));
      return inputs.map(i => ({ id: i.id, name: i.name, type: i.type, placeholder: i.placeholder, label: i.parentElement?.innerText?.substring(0, 30) }));
    });
    console.log('MBM contact fields:', res);
  } catch (e) {
    console.log('MBM error:', e.message);
  } finally {
    await page.close();
  }
}

async function run() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,800']
  });

  await testKnightForm(browser);
  await testInsightJotform(browser);
  await testLECGIForm(browser);
  await testMBMForm(browser);

  await browser.close();
}

run();
