import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

async function check3557() {
  console.log('\n--- Checking #3557 Engineering Square ---');
  const browser = await puppeteer.launch({ executablePath: CHROME_BIN, headless: 'new', ignoreHTTPSErrors: true });
  const page = await browser.newPage();
  try {
    await page.goto('https://www.engineeringsquare.us/contact', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await new Promise(r => setTimeout(r, 3000));
    const data = await page.evaluate(() => {
      return {
        title: document.title,
        text: document.body.innerText.substring(0, 1000),
        forms: Array.from(document.querySelectorAll('form')).map(f => ({
          id: f.id,
          action: f.action,
          inputs: Array.from(f.querySelectorAll('input, textarea, select')).map(i => ({ name: i.name, type: i.type, placeholder: i.placeholder }))
        })),
        calendlyOrHubspot: Array.from(document.querySelectorAll('iframe')).map(i => i.src)
      };
    });
    console.log('3557 data:', JSON.stringify(data, null, 2));
  } catch (e) {
    console.log('3557 error:', e.message);
  } finally {
    await browser.close();
  }
}

async function check3558() {
  console.log('\n--- Checking #3558 Hardesty & Hanover ---');
  const browser = await puppeteer.launch({ executablePath: CHROME_BIN, headless: 'new', ignoreHTTPSErrors: true });
  const page = await browser.newPage();
  try {
    await page.goto('https://www.hardestyhanover.com/', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await new Promise(r => setTimeout(r, 3000));
    const data = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a[href]')).map(a => ({ text: a.innerText.trim(), href: a.href }));
      const contactLinks = links.filter(l => /contact|office|locations|about/i.test(l.text) || /contact/i.test(l.href));
      return {
        contactLinks,
        emails: document.body.innerText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || []
      };
    });
    console.log('3558 data:', JSON.stringify(data, null, 2));
  } catch (e) {
    console.log('3558 error:', e.message);
  } finally {
    await browser.close();
  }
}

async function check3563() {
  console.log('\n--- Checking #3563 Way Consulting Engineers ---');
  const browser = await puppeteer.launch({ executablePath: CHROME_BIN, headless: 'new', ignoreHTTPSErrors: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  try {
    // Try https://wayengineering.com or http://wayengineering.com or search
    const testUrls = ['https://wayengineering.com', 'https://www.wayengineering.com', 'http://wayengineering.com'];
    for (const u of testUrls) {
      try {
        console.log(`Trying ${u}...`);
        const resp = await page.goto(u, { waitUntil: 'domcontentloaded', timeout: 15000 });
        console.log(`Loaded ${u} with status ${resp ? resp.status() : 'null'}`);
        const title = await page.title();
        console.log(`Title: ${title}`);
        break;
      } catch (err) {
        console.log(`Error on ${u}: ${err.message}`);
      }
    }
  } finally {
    await browser.close();
  }
}

async function check3564() {
  console.log('\n--- Checking #3564 Thonhoff Consulting Engineers ---');
  const browser = await puppeteer.launch({ executablePath: CHROME_BIN, headless: 'new', ignoreHTTPSErrors: true });
  const page = await browser.newPage();
  try {
    await page.goto('https://tcetx.com/', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await new Promise(r => setTimeout(r, 2000));
    const data = await page.evaluate(() => {
      return {
        text: document.body.innerText,
        forms: Array.from(document.querySelectorAll('form')).length,
        links: Array.from(document.querySelectorAll('a[href]')).map(a => ({ text: a.innerText, href: a.href }))
      };
    });
    console.log('3564 text:', data.text.substring(0, 800));
    console.log('3564 forms:', data.forms);
    const emails = data.text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
    console.log('3564 emails:', [...new Set(emails)]);
  } catch (e) {
    console.log('3564 error:', e.message);
  } finally {
    await browser.close();
  }
}

async function check3567() {
  console.log('\n--- Checking #3567 Priority Bending Submit Details ---');
  const browser = await puppeteer.launch({ executablePath: CHROME_BIN, headless: 'new', ignoreHTTPSErrors: true });
  const page = await browser.newPage();
  page.on('response', async resp => {
    if (resp.url().includes('wix-forms') || resp.url().includes('form')) {
      if (resp.request().method() === 'POST') {
        console.log(`[3567 POST] ${resp.url()} -> Status ${resp.status()}`);
        try {
          console.log('Body:', (await resp.text()).substring(0, 300));
        } catch (e) {}
      }
    }
  });

  try {
    await page.goto('https://www.prioritybending.com/', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await new Promise(r => setTimeout(r, 3000));

    // Scroll to form
    await page.evaluate(() => {
      const f = document.querySelector('form');
      if (f) f.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    await new Promise(r => setTimeout(r, 1000));

    // Type into fields
    const inputs = await page.$$('form input, form textarea');
    console.log(`Found ${inputs.length} inputs in form`);
    
    // First name
    await inputs[0].type('Pamela', { delay: 20 });
    // Last name
    await inputs[1].type('Jameson', { delay: 20 });
    // Email
    await inputs[2].type('pamela.jameson@nortiheastprecision.com', { delay: 20 });
    // Phone
    await inputs[3].type('708-568-3708', { delay: 20 });
    // Message
    await inputs[4].type('Hello, I am reaching out to express our interest in your precision tube bending services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us. Thank you, Pamela Jameson', { delay: 10 });

    await new Promise(r => setTimeout(r, 1000));

    // Click submit
    const submitBtn = await page.$('form button, button[type="submit"]');
    if (submitBtn) {
      console.log('Clicking submitBtn via element.click()...');
      await submitBtn.click();
    }

    await new Promise(r => setTimeout(r, 6000));

    const pageState = await page.evaluate(() => {
      return {
        formText: document.querySelector('form')?.innerText,
        alerts: Array.from(document.querySelectorAll('[role="alert"], .alert, [aria-live]')).map(a => a.innerText)
      };
    });
    console.log('3567 post-submit state:', JSON.stringify(pageState, null, 2));
  } catch (e) {
    console.log('3567 error:', e.message);
  } finally {
    await browser.close();
  }
}

async function run() {
  await check3557();
  await check3558();
  await check3563();
  await check3564();
  await check3567();
}

run().catch(console.error);
