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
  address: '100 Main St',
  city: 'Chicago',
  state: 'IL',
  zip: '60601',
  message: 'Hello,\n\nI am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects.\n\nWe look forward to your response and the possibility of working together.\n\nThank you for your time and attention.\n\nSincerely,\nPamela Jameson'
};

async function testSite(leadId, url) {
  console.log(`\n================ Testing Lead #${leadId}: ${url} ================`);
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    timeout: 30000,
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');

  page.on('dialog', async d => {
    console.log(`[DIALOG] ${d.type()}: ${d.message()}`);
    await d.dismiss();
  });

  page.on('response', async resp => {
    const u = resp.url();
    if (u.includes('admin-ajax') || u.includes('contact-form') || u.includes('submit') || u.includes('feedback') || u.includes('v3') || u.includes('turnstile')) {
      console.log(`[HTTP ${resp.status()}] ${u}`);
      try {
        const text = await resp.text();
        console.log(`  -> Response snippet: ${text.slice(0, 150)}`);
      } catch (e) {}
    }
  });

  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 20000 });
  } catch (e) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
    } catch (e2) {
      console.log('Nav error:', e2.message);
      await browser.close();
      return;
    }
  }

  // Log all inputs on page
  const inputDetails = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('input, textarea, select')).map(i => ({
      tag: i.tagName,
      type: i.type,
      name: i.name,
      id: i.id,
      placeholder: i.placeholder,
      visible: i.offsetWidth > 0 && i.offsetHeight > 0,
      classes: i.className
    }));
  });
  console.log('Inputs found:', inputDetails);

  // Check buttons
  const buttons = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('button, input[type="submit"], a.btn, a.button')).map(b => ({
      tag: b.tagName,
      type: b.type,
      text: b.innerText || b.value,
      visible: b.offsetWidth > 0 && b.offsetHeight > 0
    }));
  });
  console.log('Buttons found:', buttons);

  await browser.close();
}

async function run() {
  await testSite(4073, 'https://anceengineering.com');
  await testSite(4075, 'https://getinc.org/contact-us/');
  await testSite(4076, 'https://castilloeng.com');
  await testSite(4081, 'https://ethosengineering.square.site');
}

run();
