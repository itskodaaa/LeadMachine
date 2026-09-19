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

async function testLead(leadId, url) {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  
  page.on('response', async res => {
    const resUrl = res.url();
    if (resUrl.includes('form') || resUrl.includes('submit') || resUrl.includes('api') || resUrl.includes('recaptcha') || resUrl.includes('turnstile')) {
      try {
        console.log(`[Response] ${res.status()} ${resUrl.slice(0, 100)}`);
        if (resUrl.includes('submission') || resUrl.includes('form') || resUrl.includes('contact')) {
          const txt = await res.text();
          console.log(`[Body]: ${txt.slice(0, 300)}`);
        }
      } catch(e) {}
    }
  });

  try {
    console.log(`\n============================\nTesting Lead #${leadId} on ${url}`);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 25000 });

    if (leadId === 4028) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await new Promise(r => setTimeout(r, 1000));
      await page.type('#input_comp-ksaunlfv', PROFILE.firstName, { delay: 20 });
      await page.type('#input_comp-ksaunlg5', PROFILE.lastName, { delay: 20 });
      await page.type('#input_comp-ksaunlgb', PROFILE.email, { delay: 20 });
      await page.type('#textarea_comp-ksaunlgi', PROFILE.message, { delay: 10 });
      
      const btn = await page.$('button[type="submit"], [data-testid="buttonElement"]');
      console.log('Clicking button...');
      await btn.click();
      await new Promise(r => setTimeout(r, 8000));
      
      const msg = await page.evaluate(() => {
        const el = document.querySelector('[data-testid="form-submitted"], .wixui-form__message, [role="alert"]');
        return el ? el.innerText : 'None';
      });
      console.log('Confirmation message on #4028:', msg);
    } else if (leadId === 4030) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await new Promise(r => setTimeout(r, 1000));
      await page.type('#input_comp-kq7zyxcj', PROFILE.firstName, { delay: 20 });
      await page.type('#input_comp-kq7zyxcr2', PROFILE.lastName, { delay: 20 });
      await page.type('#input_comp-kq7zyxcu1', PROFILE.email, { delay: 20 });
      await page.type('#input_comp-kq7zyxcx', PROFILE.subject, { delay: 20 });
      await page.type('#textarea_comp-kq7zyxd1', PROFILE.message, { delay: 10 });
      
      const btn = await page.$('button[type="submit"], [data-testid="buttonElement"]');
      console.log('Clicking button...');
      await btn.click();
      await new Promise(r => setTimeout(r, 8000));
      
      const msg = await page.evaluate(() => {
        const el = document.querySelector('[data-testid="form-submitted"], .wixui-form__message, [role="alert"]');
        return el ? el.innerText : 'None';
      });
      console.log('Confirmation message on #4030:', msg);
    }
  } catch (e) {
    console.error(`Error on #${leadId}:`, e.message);
  } finally {
    await browser.close();
  }
}

async function main() {
  await testLead(4028, 'https://www.amuengineering.com');
  await testLead(4030, 'https://www.ljaapa.com/contact');
}

main();
