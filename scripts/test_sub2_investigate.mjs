import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());
const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

async function checkRosendin() {
  const browser = await puppeteer.launch({ executablePath: CHROME_BIN, headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('requestfailed', req => console.log('REQ FAILED:', req.url(), req.failure()?.errorText));
  page.on('response', res => {
    if (res.status() >= 400) console.log('RESP ERROR:', res.status(), res.url());
  });

  await page.goto('https://www.rosendin.com/contact/', { waitUntil: 'networkidle2', timeout: 30000 });

  const selectOptions = await page.evaluate(() => {
    const sel = document.querySelector('#input-subject');
    return Array.from(sel.options).map(o => ({ value: o.value, text: o.text }));
  });
  console.log('Select options:', selectOptions);

  await page.select('#input-subject', selectOptions[1].value);
  await page.type('#inquiry-first-name', 'Pamela');
  await page.type('#inquiry-last-name', 'Jameson');
  await page.type('#inquiry-email', 'pamela.jameson@nortiheastprecision.com');
  await page.type('#inquiry-phone', '708-568-3708');
  await page.type('#inquiry-title', 'Procurement Coordinator');
  await page.type('#inquiry-company', 'Northeast Precision Machinery, Inc.');
  await page.type('#inquiry-message', 'Hello, I am reaching out to express our interest in your services and would appreciate discussing opportunities for collaboration on upcoming projects. Thank you, Pamela Jameson');

  console.log('Clicking submit...');
  const submitSuccess = await page.evaluate(() => {
    const f = document.querySelector('form:not(#header-search-form)');
    const btn = f.querySelector('button[type="submit"]');
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  });
  console.log('Button clicked:', submitSuccess);

  await new Promise(r => setTimeout(r, 6000));
  const postSubmit = await page.evaluate(() => {
    const f = document.querySelector('form:not(#header-search-form)');
    const text = document.body.innerText;
    return {
      formHtml: f ? f.innerHTML.slice(0, 500) : 'FORM GONE',
      hasThankYou: text.toLowerCase().includes('thank') || text.toLowerCase().includes('received') || text.toLowerCase().includes('submitted'),
      fullTextMatch: text.match(/(thank you[^\n]+|received[^\n]+|submitted[^\n]+)/i)?.[0] || null
    };
  });
  console.log('Post Submit Result:', postSubmit);

  await browser.close();
}

checkRosendin();
