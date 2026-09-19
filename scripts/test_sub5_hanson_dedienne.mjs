import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

const CHROME_BIN = '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

const OUTREACH_PROFILE = {
  fullName: 'Pamela Jameson',
  firstName: 'Pamela',
  lastName: 'Jameson',
  email: 'pamela.jameson@nortiheastprecision.com',
  phone: '708-568-3708',
  company: 'Northeast Precision Machinery, Inc.',
  message: 'Hello, I am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects. Thank you for your time. Sincerely, Pamela Jameson'
};

async function testHanson() {
  console.log('\n========================================');
  console.log('Testing #4058 Hanson Professional Services...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');

  page.on('response', async resp => {
    if (resp.request().method() === 'POST' || resp.url().includes('gravityforms') || resp.url().includes('admin-ajax')) {
      console.log(`[Hanson Net] ${resp.status()} ${resp.url()}`);
      try {
        const t = await resp.text();
        console.log(`[Hanson Net Body]`, t.slice(0, 300));
      } catch (e) {}
    }
  });

  try {
    await page.goto('https://www.hanson-inc.com/contact-us/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));

    // Gravity form: form#gform_1
    const formFields = await page.evaluate((p) => {
      const f = document.querySelector('form#gform_1');
      if (!f) return 'No gform_1';

      const fn = f.querySelector('[name="input_1"]');
      if (fn) fn.value = p.firstName;

      const ln = f.querySelector('[name="input_3"]');
      if (ln) ln.value = p.lastName;

      const em = f.querySelector('[name="input_4"]');
      if (em) em.value = p.email;

      const ph = f.querySelector('[name="input_5"]');
      if (ph) ph.value = p.phone;

      const co = f.querySelector('[name="input_6"]');
      if (co) co.value = p.company;

      const msg = f.querySelector('[name="input_8"]');
      if (msg) msg.value = p.message;

      // Select dropdown for topic if exists
      const sel = f.querySelector('[name="input_9"]');
      if (sel && sel.options.length > 1) sel.selectedIndex = 1;

      // Radio choices for input_10
      const rad = f.querySelector('input[name="input_10"]');
      if (rad) rad.checked = true;

      return 'Filled Hanson form';
    }, OUTREACH_PROFILE);
    console.log('Hanson form fill:', formFields);

    await new Promise(r => setTimeout(r, 1000));

    console.log('Clicking Hanson submit button...');
    await page.evaluate(() => {
      const btn = document.querySelector('#gform_submit_button_1, form#gform_1 input[type="submit"]');
      if (btn) btn.click();
    });

    await new Promise(r => setTimeout(r, 5000));

    const postHanson = await page.evaluate(() => {
      const confirmation = document.querySelector('.gform_confirmation_message, .gforms_confirmation_message');
      const validationError = document.querySelector('.gform_validation_error, .validation_error, .gfield_error');
      return {
        url: window.location.href,
        confirmation: confirmation ? confirmation.innerText : null,
        validationError: validationError ? validationError.innerText : null,
        bodyText: document.body.innerText.slice(0, 500)
      };
    });

    console.log('Post Hanson:', postHanson);

  } catch (e) {
    console.log('Hanson Error:', e.message);
  } finally {
    await browser.close();
  }
}

async function testDedienne() {
  console.log('\n========================================');
  console.log('Testing #4060 Dedienne Aerospace LLC...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');

  page.on('response', async resp => {
    if (resp.request().method() === 'POST' || resp.url().includes('contact-form-7') || resp.url().includes('feedback')) {
      console.log(`[Dedienne Net] ${resp.status()} ${resp.url()}`);
      try {
        const t = await resp.text();
        console.log(`[Dedienne Net Body]`, t.slice(0, 400));
      } catch (e) {}
    }
  });

  try {
    await page.goto('https://dedienne-aero.com/contact/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));

    // Fill wpcf7 form
    const formResult = await page.evaluate((p) => {
      const f = document.querySelector('form.wpcf7-form');
      if (!f) return 'No wpcf7-form';

      const name = f.querySelector('[name="your-name"]');
      if (name) name.value = p.fullName;

      const email = f.querySelector('[name="your-email"]');
      if (email) email.value = p.email;

      const comp = f.querySelector('[name="last-compagnie"]');
      if (comp) comp.value = p.company;

      const subj = f.querySelector('[name="your-subject"]');
      if (subj) subj.value = 'Inquiry / Project Collaboration';

      const phone = f.querySelector('[name="your-phone"]');
      if (phone) phone.value = p.phone;

      const msg = f.querySelector('[name="your-message"]');
      if (msg) msg.value = p.message;

      // Selects
      const selects = Array.from(f.querySelectorAll('select'));
      for (const s of selects) {
        if (s.options.length > 1) s.selectedIndex = 1;
        s.dispatchEvent(new Event('change', { bubbles: true }));
      }

      // Checkboxes
      const checkboxes = Array.from(f.querySelectorAll('input[type="checkbox"]'));
      for (const c of checkboxes) {
        c.checked = true;
        c.dispatchEvent(new Event('change', { bubbles: true }));
      }

      return 'Filled Dedienne form';
    }, OUTREACH_PROFILE);
    console.log('Dedienne form fill:', formResult);

    await new Promise(r => setTimeout(r, 1000));

    console.log('Clicking Dedienne submit button...');
    await page.evaluate(() => {
      const btn = document.querySelector('form.wpcf7-form input[type="submit"], form.wpcf7-form button[type="submit"]');
      if (btn) btn.click();
    });

    await new Promise(r => setTimeout(r, 6000));

    const postDedienne = await page.evaluate(() => {
      const output = document.querySelector('.wpcf7-response-output');
      const errors = Array.from(document.querySelectorAll('.wpcf7-not-valid-tip')).map(e => e.innerText);
      return {
        url: window.location.href,
        responseOutput: output ? output.innerText : null,
        errors
      };
    });

    console.log('Post Dedienne:', postDedienne);

  } catch (e) {
    console.log('Dedienne Error:', e.message);
  } finally {
    await browser.close();
  }
}

async function run() {
  await testHanson();
  await testDedienne();
}
run();
