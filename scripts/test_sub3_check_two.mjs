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
  message: 'Hello, I am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects. Thank you for your time and attention.'
};

async function testLead4874() {
  console.log('\n--- Testing Lead #4874: OdysseyFAB ---');
  const browser = await puppeteer.launch({ headless: true, executablePath: CHROME_BIN, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.goto('https://odysseyfab.com/pages/contact-us', { waitUntil: 'networkidle2', timeout: 20000 });
  const info = await page.evaluate(() => {
    return {
      forms: Array.from(document.querySelectorAll('form')).map(f => ({
        action: f.action,
        id: f.id,
        className: f.className
      })),
      inputs: Array.from(document.querySelectorAll('input, textarea, select')).map(i => ({
        tag: i.tagName.toLowerCase(),
        type: i.type,
        name: i.name,
        id: i.id,
        placeholder: i.placeholder,
        required: i.required
      }))
    };
  });
  console.log('OdysseyFAB /pages/contact-us info:', JSON.stringify(info, null, 2));
  await browser.close();
}

async function testLead4873() {
  console.log('\n--- Testing Lead #4873: Reliable Welding & Steel Supply ---');
  const browser = await puppeteer.launch({ headless: true, executablePath: CHROME_BIN, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.goto('https://reliableweldingandsteelsupply.com/', { waitUntil: 'networkidle2', timeout: 20000 });
  const allLinks = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('a[href]')).map(a => ({ text: a.innerText.trim(), href: a.href }));
  });
  console.log('Reliable Welding links:', allLinks);
  const text = await page.evaluate(() => document.body.innerText);
  console.log('Reliable Welding body text snippet:', text.slice(0, 500));
  await browser.close();
}

(async () => {
  await testLead4874();
  await testLead4873();
})();
