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

async function testWix(id, url) {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  try {
    console.log(`\nNavigating to ${url}...`);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    if (url.includes('amuengineering')) {
      // scroll to bottom to see contact form
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await new Promise(r => setTimeout(r, 2000));
    }

    console.log('Filling fields on', page.url());

    // Fill via React native setter or page.type
    const fillInput = async (selector, val) => {
      const el = await page.$(selector);
      if (el) {
        await el.click({ clickCount: 3 });
        await el.type(val, { delay: 30 });
        console.log(`Typed ${val} into ${selector}`);
      } else {
        console.log(`Selector not found: ${selector}`);
      }
    };

    if (id === 4028) {
      await fillInput('#input_comp-ksaunlfv', PROFILE.firstName);
      await fillInput('#input_comp-ksaunlg5', PROFILE.lastName);
      await fillInput('#input_comp-ksaunlgb', PROFILE.email);
      await fillInput('#textarea_comp-ksaunlgi', PROFILE.message);

      // Check submit button
      const submitBtn = await page.$('button[type="submit"], [data-testid="buttonElement"]');
      console.log('Clicking submit...');
      await submitBtn.click();
      await new Promise(r => setTimeout(r, 6000));

      const confirmation = await page.evaluate(() => {
        const text = document.body.innerText;
        return {
          hasThanks: text.toLowerCase().includes('thank') || text.toLowerCase().includes('thanks'),
          submissionMessage: document.querySelector('[data-testid="form-submitted"], .wixui-form__message')?.innerText || '',
          bodySnippet: text.slice(0, 500)
        };
      });
      console.log('Result for #4028:', confirmation);
    } else if (id === 4030) {
      await fillInput('#input_comp-kq7zyxcj', PROFILE.firstName);
      await fillInput('#input_comp-kq7zyxcr2', PROFILE.lastName);
      await fillInput('#input_comp-kq7zyxcu1', PROFILE.email);
      await fillInput('#input_comp-kq7zyxcx', PROFILE.subject);
      await fillInput('#textarea_comp-kq7zyxd1', PROFILE.message);

      const submitBtn = await page.$('button[type="submit"], [data-testid="buttonElement"]');
      console.log('Clicking submit...');
      await submitBtn.click();
      await new Promise(r => setTimeout(r, 6000));

      const confirmation = await page.evaluate(() => {
        const text = document.body.innerText;
        return {
          hasThanks: text.toLowerCase().includes('thank') || text.toLowerCase().includes('thanks'),
          submissionMessage: document.querySelector('[data-testid="form-submitted"], .wixui-form__message')?.innerText || '',
          bodySnippet: text.slice(0, 500)
        };
      });
      console.log('Result for #4030:', confirmation);
    }
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await browser.close();
  }
}

async function run() {
  await testWix(4028, 'https://www.amuengineering.com');
  await testWix(4030, 'https://www.ljaapa.com/contact');
}

run();
