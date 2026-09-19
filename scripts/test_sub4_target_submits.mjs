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
  address: '100 Main St',
  city: 'Chicago',
  state: 'IL',
  zip: '60601',
  subject: 'Exploring Collaboration Opportunities',
  message: 'Hello, I am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects. Thank you, Pamela Jameson.'
};

async function testDavidEngineering() {
  console.log('\n========================================');
  console.log('Testing Lead #4943: David Engineering');
  console.log('========================================');
  const browser = await puppeteer.launch({ executablePath: CHROME_BIN, headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  try {
    await page.goto('https://davidengineering.com/pages/contact-us', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await new Promise(r => setTimeout(r, 2000));

    // Fill form
    const nameEl = await page.$('#cf-name');
    if (nameEl) await nameEl.type(PROFILE.fullName, { delay: 20 });

    const compEl = await page.$('#cf-company');
    if (compEl) await compEl.type(PROFILE.company, { delay: 20 });

    const streetEl = await page.$('#cf-street');
    if (streetEl) await streetEl.type(PROFILE.address, { delay: 20 });

    const cityEl = await page.$('#cf-city');
    if (cityEl) await cityEl.type(PROFILE.city, { delay: 20 });

    const zipEl = await page.$('#cf-zip');
    if (zipEl) await zipEl.type(PROFILE.zip, { delay: 20 });

    const phoneEl = await page.$('#cf-phone');
    if (phoneEl) await phoneEl.type(PROFILE.phone, { delay: 20 });

    const emailEl = await page.$('#cf-email');
    if (emailEl) await emailEl.type(PROFILE.email, { delay: 20 });

    const msgEl = await page.$('#cf-message');
    if (msgEl) await msgEl.type(PROFILE.message, { delay: 20 });

    // Select options if required
    const serviceEl = await page.$('#cf-service');
    if (serviceEl) {
      await page.select('#cf-service', 'Laser Cutting');
    }

    const qty1El = await page.$('#cf-qty1');
    if (qty1El) await qty1El.type('100', { delay: 20 });

    console.log('Form filled. Clicking submit button...');
    const submitBtn = await page.$('#contact_form button[type="submit"], #contact_form input[type="submit"]');
    console.log('Submit button found:', !!submitBtn);
    if (submitBtn) {
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }).catch(e => console.log('Nav timeout/no nav:', e.message)),
        submitBtn.click()
      ]);
      await new Promise(r => setTimeout(r, 3000));
      console.log('Post-submit URL:', page.url());
      const bodyText = await page.evaluate(() => document.body.innerText);
      console.log('Body text snippet:', bodyText.slice(0, 500).replace(/\n+/g, ' '));
      const hasSuccess = /thank|received|sent|success/i.test(bodyText);
      console.log('Success detected?', hasSuccess);
      const errors = await page.evaluate(() => {
        const errs = Array.from(document.querySelectorAll('.errors, .error-message, [role="alert"]'));
        return errs.map(e => e.innerText);
      });
      console.log('Errors:', errors);
      const hasCaptcha = await page.evaluate(() => !!document.querySelector('iframe[src*="recaptcha"], iframe[src*="hcaptcha"], .g-recaptcha, #g-recaptcha'));
      console.log('Captcha present post-submit?', hasCaptcha);
    }
  } catch (e) {
    console.log('David Engineering error:', e.message);
  } finally {
    await browser.close();
  }
}

async function testProFab() {
  console.log('\n========================================');
  console.log('Testing Lead #4947: Pro Fab');
  console.log('========================================');
  const browser = await puppeteer.launch({ executablePath: CHROME_BIN, headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  try {
    await page.goto('https://profabcorona.com/contact/', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await new Promise(r => setTimeout(r, 2000));

    // Inspect fields
    const fields = await page.evaluate(() => {
      const f = document.querySelector('form.wpforms-form');
      if (!f) return null;
      return Array.from(f.querySelectorAll('label')).map(l => ({
        for: l.getAttribute('for'),
        text: l.innerText.trim()
      }));
    });
    console.log('ProFab form labels:', fields);

    const f3 = await page.$('#wpforms-743-field_3'); // first name or name
    if (f3) await f3.type(PROFILE.firstName, { delay: 20 });

    const f4 = await page.$('#wpforms-743-field_4'); // last name
    if (f4) await f4.type(PROFILE.lastName, { delay: 20 });

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
      await new Promise(r => setTimeout(r, 5000));
      const bodyText = await page.evaluate(() => document.body.innerText);
      const confMsg = await page.evaluate(() => {
        const conf = document.querySelector('.wpforms-confirmation-container, .wpforms-confirmation-scroll');
        return conf ? conf.innerText : null;
      });
      console.log('ProFab confirmation container:', confMsg);
      console.log('ProFab body excerpt:', bodyText.slice(0, 300).replace(/\n+/g, ' '));
    }
  } catch (e) {
    console.log('ProFab error:', e.message);
  } finally {
    await browser.close();
  }
}

async function testRSDoorProducts() {
  console.log('\n========================================');
  console.log('Testing Lead #4950: R&S Manufacturing');
  console.log('========================================');
  const browser = await puppeteer.launch({ executablePath: CHROME_BIN, headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  try {
    await page.goto('https://www.rsdoorproducts.com/send-a-message-to-rs-of-southern-california/', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await new Promise(r => setTimeout(r, 2000));

    const labels = await page.evaluate(() => {
      const f = document.querySelector('form.wpforms-form');
      if (!f) return null;
      return Array.from(f.querySelectorAll('label')).map(l => ({
        for: l.getAttribute('for'),
        text: l.innerText.trim()
      }));
    });
    console.log('RSDoor labels:', labels);

    const f0First = await page.$('#wpforms-1404-field_0');
    if (f0First) await f0First.type(PROFILE.firstName, { delay: 20 });

    const f0Last = await page.$('#wpforms-1404-field_0-last');
    if (f0Last) await f0Last.type(PROFILE.lastName, { delay: 20 });

    const f4 = await page.$('#wpforms-1404-field_4');
    if (f4) await f4.type(PROFILE.company, { delay: 20 });

    const f3 = await page.$('#wpforms-1404-field_3');
    if (f3) await f3.type(PROFILE.phone, { delay: 20 });

    const f1 = await page.$('#wpforms-1404-field_1');
    if (f1) await f1.type(PROFILE.email, { delay: 20 });

    const f2 = await page.$('#wpforms-1404-field_2');
    if (f2) await f2.type(PROFILE.message, { delay: 20 });

    console.log('RSDoor filled. Submitting...');
    const submitBtn = await page.$('#wpforms-submit-1404');
    if (submitBtn) {
      await submitBtn.click();
      await new Promise(r => setTimeout(r, 5000));
      const confMsg = await page.evaluate(() => {
        const conf = document.querySelector('.wpforms-confirmation-container, .wpforms-confirmation-scroll');
        return conf ? conf.innerText : null;
      });
      console.log('RSDoor confirmation container:', confMsg);
      const bodyText = await page.evaluate(() => document.body.innerText);
      console.log('RSDoor body excerpt:', bodyText.slice(0, 300).replace(/\n+/g, ' '));
    }
  } catch (e) {
    console.log('RSDoor error:', e.message);
  } finally {
    await browser.close();
  }
}

async function run() {
  await testDavidEngineering();
  await testProFab();
  await testRSDoorProducts();
}

run();
