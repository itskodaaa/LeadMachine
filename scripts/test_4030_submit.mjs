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

async function test4030() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  page.on('response', async res => {
    if (res.url().includes('wix-forms') || res.url().includes('submit') || res.url().includes('contact')) {
      console.log(`[Response] ${res.status()} ${res.url()}`);
      try {
        const text = await res.text();
        console.log(`[Body]: ${text.slice(0, 300)}`);
      } catch(e) {}
    }
  });

  try {
    console.log('Navigating to https://www.ljaapa.com/contact ...');
    await page.goto('https://www.ljaapa.com/contact', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 4000));

    // Scroll to form
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await new Promise(r => setTimeout(r, 1000));

    // List all inputs and buttons inside form
    const formElements = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input, textarea, button'));
      return inputs.map(i => ({
        tag: i.tagName,
        id: i.id,
        name: i.name,
        type: i.type,
        placeholder: i.placeholder,
        text: i.innerText || i.value
      }));
    });
    console.log('4030 Form Elements:', formElements);

    // Fill each field carefully
    const fill = async (id, val) => {
      const el = await page.$(`#${id}`);
      if (el) {
        await el.click();
        await el.type(val, { delay: 15 });
        console.log(`Typed ${val} into #${id}`);
      } else {
        console.log(`Not found: #${id}`);
      }
    };

    await fill('input_comp-kq7zyxcj', PROFILE.firstName);
    await fill('input_comp-kq7zyxcr2', PROFILE.lastName);
    await fill('input_comp-kq7zyxcu1', PROFILE.email);
    await fill('input_comp-kq7zyxcx', PROFILE.subject);
    await fill('textarea_comp-kq7zyxd1', PROFILE.message);

    // Find submit button
    const submitBtn = await page.$('button[type="submit"], [data-testid="buttonElement"]');
    console.log('Clicking submit on 4030...');
    await submitBtn.click();
    await new Promise(r => setTimeout(r, 10000));

    const result = await page.evaluate(() => {
      const body = document.body.innerText;
      const successMsg = document.querySelector('[data-testid="form-submitted"], .wixui-form__message')?.innerText;
      return { successMsg, hasThank: body.toLowerCase().includes('thank') || body.toLowerCase().includes('thanks') };
    });
    console.log('4030 Result:', result);

  } catch(e) {
    console.error('4030 error:', e.message);
  } finally {
    await browser.close();
  }
}

test4030();
