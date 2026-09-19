import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const PROFILE = {
  fullName: 'Pamela Jameson',
  firstName: 'Pamela',
  lastName: 'Jameson',
  email: 'pamela.jameson@nortiheastprecision.com',
  phone: '708-568-3708',
  company: 'Northeast Precision Machinery, Inc.',
  subject: 'Exploring Collaboration Opportunities',
  message: 'Hello, I am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects. Thank you, Pamela Jameson.'
};

async function testProFabAgain() {
  console.log('\n========================================');
  console.log('Testing Lead #4947: Pro Fab (longer wait)');
  console.log('========================================');
  const browser = await puppeteer.launch({ executablePath: CHROME_BIN, headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  try {
    await page.goto('https://profabcorona.com/contact/', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await new Promise(r => setTimeout(r, 2000));

    const f3 = await page.$('#wpforms-743-field_3'); // name
    if (f3) await f3.type(PROFILE.fullName, { delay: 20 });

    const f4 = await page.$('#wpforms-743-field_4'); // subject
    if (f4) await f4.type(PROFILE.subject, { delay: 20 });

    const f1 = await page.$('#wpforms-743-field_1'); // email
    if (f1) await f1.type(PROFILE.email, { delay: 20 });

    const f5 = await page.$('#wpforms-743-field_5'); // phone
    if (f5) await f5.type('7085683708', { delay: 20 });

    const f2 = await page.$('#wpforms-743-field_2'); // message
    if (f2) await f2.type(PROFILE.message, { delay: 20 });

    console.log('ProFab filled. Submitting...');
    const submitBtn = await page.$('#wpforms-submit-743');
    if (submitBtn) {
      await submitBtn.click();
      console.log('Clicked submit. Waiting up to 15s for confirmation...');
      try {
        await page.waitForSelector('.wpforms-confirmation-container, .wpforms-confirmation-scroll', { timeout: 15000 });
        const confMsg = await page.$eval('.wpforms-confirmation-container', el => el.innerText);
        console.log('SUCCESS! ProFab confirmation:', confMsg);
      } catch (e) {
        console.log('Wait error:', e.message);
        const body = await page.evaluate(() => document.body.innerText);
        console.log('Body excerpt:', body.slice(0, 400).replace(/\n+/g, ' '));
      }
    }
  } catch (e) {
    console.log('ProFab error:', e.message);
  } finally {
    await browser.close();
  }
}

async function testKCScott() {
  console.log('\n========================================');
  console.log('Testing Lead #4951: KC Scott (http)');
  console.log('========================================');
  const browser = await puppeteer.launch({ executablePath: CHROME_BIN, headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  try {
    await page.goto('http://kcscott.net/contact-us.html', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await new Promise(r => setTimeout(r, 1000));

    const nameInput = await page.$('input[name="name"]');
    if (nameInput) await nameInput.type(PROFILE.fullName);

    const emailInput = await page.$('input[name="email"]');
    if (emailInput) await emailInput.type(PROFILE.email);

    const phoneInput = await page.$('input[name="phone"]');
    if (phoneInput) await phoneInput.type(PROFILE.phone);

    const subjInput = await page.$('input[name="subject"]');
    if (subjInput) await subjInput.type(PROFILE.subject);

    const msgInput = await page.$('textarea[name="message"]');
    if (msgInput) await msgInput.type(PROFILE.message);

    console.log('Submitting KC Scott form...');
    const submitBtn = await page.$('input[name="submit"]');
    if (submitBtn) {
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 10000 }).catch(e => console.log('Nav:', e.message)),
        submitBtn.click()
      ]);
      await new Promise(r => setTimeout(r, 2000));
      console.log('KC Scott Post-submit URL:', page.url());
      const body = await page.evaluate(() => document.body.innerText);
      console.log('KC Scott Post-submit Body:', body.slice(0, 400).replace(/\n+/g, ' '));
    }
  } catch (e) {
    console.log('KC Scott error:', e.message);
  } finally {
    await browser.close();
  }
}

async function run() {
  await testProFabAgain();
  await testKCScott();
}

run();
