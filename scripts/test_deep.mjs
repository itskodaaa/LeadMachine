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
  message: 'Hello,\n\nI am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects.\n\nWe look forward to your response and the possibility of working together.\n\nThank you for your time and attention.\n\nSincerely,\nPamela Jameson'
};

async function testSite(url, handler) {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  try {
    console.log(`\nNavigating to: ${url}`);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 25000 });
    await handler(page);
  } catch (e) {
    console.log(`Error on ${url}:`, e.message);
  } finally {
    await browser.close();
  }
}

async function run() {
  // 1. Falcon Design (#4481)
  await testSite('https://falcondesignconsultants.com/contact/', async (page) => {
    console.log('Testing Falcon Design submission...');
    await page.waitForSelector('form.wpcf7-form', { timeout: 5000 });
    await page.type('input[name="your-name"]', OUTREACH_PROFILE.fullName);
    await page.type('input[name="Phone:"]', OUTREACH_PROFILE.phone);
    await page.type('input[name="your-email"]', OUTREACH_PROFILE.email);
    await page.type('textarea[name="your-message"]', OUTREACH_PROFILE.message);
    
    // Submit
    const submitBtn = await page.$('form.wpcf7-form input[type="submit"]');
    await submitBtn.click();
    console.log('Clicked submit on Falcon Design, waiting for response...');
    await new Promise(r => setTimeout(r, 6000));
    
    const output = await page.evaluate(() => {
      const resp = document.querySelector('.wpcf7-response-output');
      const formClass = document.querySelector('form.wpcf7-form')?.className;
      return { respText: resp?.innerText, respClass: resp?.className, formClass };
    });
    console.log('Falcon Design result:', output);
  });

  // 2. Moore Bass (#4478)
  await testSite('https://moorebass.com', async (page) => {
    console.log('Checking Moore Bass pages and forms...');
    const links = await page.evaluate(() => Array.from(document.querySelectorAll('a')).map(a => ({ text: a.innerText.trim(), href: a.href })));
    console.log('Links on moorebass:', links.filter(l => /contact|reach|touch|about|connect/i.test(l.text || l.href)));
  });

  // 3. Land Engineering (#4480)
  await testSite('https://www.land.engineering/contact', async (page) => {
    console.log('Inspecting Land Engineering Wix form...');
    const labelsAndInputs = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('label, input, textarea, button')).map(el => ({
        tag: el.tagName,
        for: el.getAttribute('for'),
        text: el.innerText || el.textContent,
        id: el.id,
        name: el.name,
        type: el.type,
        placeholder: el.placeholder,
        ariaLabel: el.getAttribute('aria-label')
      }));
    });
    console.log('Land Engineering elements:', labelsAndInputs.slice(0, 20));
  });

  // 4. SAM (#4482)
  await testSite('https://www.sam.biz/contact', async (page) => {
    console.log('Inspecting SAM contact page...');
    const iframes = await page.evaluate(() => Array.from(document.querySelectorAll('iframe')).map(i => ({ src: i.src, id: i.id, name: i.name })));
    console.log('SAM iframes:', iframes);
    const content = await page.evaluate(() => document.body.innerText.slice(0, 1000));
    console.log('SAM body sample:', content.replace(/\s+/g, ' ').slice(0, 300));
  });

  // 5. DRMP (#4486)
  await testSite('https://drmp.com', async (page) => {
    console.log('Inspecting DRMP...');
    const links = await page.evaluate(() => Array.from(document.querySelectorAll('a')).map(a => ({ text: a.innerText.trim(), href: a.href })));
    console.log('DRMP contact links:', links.filter(l => /contact|about|connect|touch/i.test(l.text || l.href)));
  });

  // 6. Robinett Consulting (#4483)
  await testSite('https://robinettconsulting.com', async (page) => {
    console.log('Inspecting Robinett Consulting...');
    const content = await page.evaluate(() => ({
      title: document.title,
      text: document.body.innerText.slice(0, 1000),
      links: Array.from(document.querySelectorAll('a')).map(a => a.href)
    }));
    console.log('Robinett Consulting:', content);
  });

  // 7. Mc Elhenny Engineering (#4487)
  await testSite('https://mcengr.com', async (page) => {
    console.log('Inspecting Mc Elhenny Engineering...');
    const content = await page.evaluate(() => ({
      title: document.title,
      text: document.body.innerText.slice(0, 1000),
      links: Array.from(document.querySelectorAll('a')).map(a => a.href)
    }));
    console.log('Mc Elhenny Engineering:', content);
  });
}

run();
