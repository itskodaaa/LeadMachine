import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const OUTREACH = {
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
  country: 'USA',
  message: 'Hello, I am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects. Thank you.'
};

async function runHeadedPablo() {
  console.log('Testing Lead #4861 Pablo in headed mode...');
  const browser = await puppeteer.launch({
    headless: false,
    executablePath: CHROME_BIN,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,800']
  });
  const page = await browser.newPage();
  try {
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto('https://www.pablosmachineshopmedley.com/contact-us', { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 3000));

    // Scroll down to the form
    await page.evaluate(() => {
      window.scrollBy(0, 600);
    });
    await new Promise(r => setTimeout(r, 1000));

    // First Name
    const fn = await page.$('#form-field-input-71fd090a-f50b-4d42-0365-f3a73f986a13-comp-mlcjc6dx-');
    if (fn) {
      await fn.click();
      await page.keyboard.type(OUTREACH.firstName, { delay: 20 });
    }

    // Last Name
    const ln = await page.$('#form-field-input-63dc06d6-4985-4f70-4a95-ce385ce725b5-comp-mlcjc6dx-');
    if (ln) {
      await ln.click();
      await page.keyboard.type(OUTREACH.lastName, { delay: 20 });
    }

    // Email
    const em = await page.$('#form-field-input-0315bf47-381a-4a0e-203d-4085265c0714-comp-mlcjc6dx-');
    if (em) {
      await em.click();
      await page.keyboard.type(OUTREACH.email, { delay: 20 });
    }

    // Subject
    const subj = await page.$('#form-field-input-9d207ed2-3ed3-4aa9-d7df-064f954e1544-comp-mlcjc6dx-');
    if (subj) {
      await subj.click();
      await page.keyboard.type(OUTREACH.subject, { delay: 20 });
    }

    // Phone
    const ph = await page.$('#form-field-input-5f2136ed-3fa6-4d84-0966-459267caec11-comp-mlcjc6dx-');
    if (ph) {
      await ph.click();
      await page.keyboard.type(OUTREACH.phone, { delay: 20 });
    }

    // Click checkbox label for Welding
    console.log('Clicking checkbox for Welding...');
    await page.evaluate(() => {
      const cb = document.querySelector('#checkbox-3558');
      if (cb) {
        cb.click();
      }
    });
    await new Promise(r => setTimeout(r, 500));

    // Message
    const msg = await page.$('#form-field-input-3176011d-c666-4d6f-3085-6959dd0df8b5-comp-mlcjc6dx-');
    if (msg) {
      await msg.click();
      await page.keyboard.type(OUTREACH.message, { delay: 10 });
    }

    // Click submit
    console.log('Clicking Submit button...');
    const submitBtn = await page.evaluateHandle(() => {
      return Array.from(document.querySelectorAll('button')).find(b => (b.innerText || '').includes('Request a Quote'));
    });
    if (submitBtn) {
      await submitBtn.click();
    }

    await new Promise(r => setTimeout(r, 6000));

    const res = await page.evaluate(() => {
      const alerts = Array.from(document.querySelectorAll('[data-testid="notifications"], [role="alert"], [class*="notification"], [class*="success"], [class*="message"], p, span'))
        .filter(el => /thank|received|sent|success|message|quote/i.test(el.innerText))
        .map(el => el.innerText.trim());
      return {
        alerts: Array.from(new Set(alerts)).slice(0, 10),
        bodySnippet: document.body.innerText.slice(0, 500)
      };
    });
    console.log('Pablo headed result:', res);
  } catch (e) {
    console.error('Pablo headed error:', e);
  } finally {
    await browser.close();
  }
}

runHeadedPablo();
