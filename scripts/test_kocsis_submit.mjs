import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

const CHROME_BIN = '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

const OUTREACH_PROFILE = {
  firstName: 'Pamela',
  lastName: 'Jameson',
  company: 'Northeast Precision Machinery, Inc.',
  email: 'pamela.jameson@nortiheastprecision.com',
  phone: '708-568-3708',
  message: `Hello,

I am reaching out to express our interest in your precision machining and roll services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects.

Thank you for your time and attention.

Sincerely,
Pamela Jameson`
};

async function testKocsis() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');

  page.on('response', async res => {
    const url = res.url();
    if (url.includes('kocsisusa.com') && (url.includes('admin-ajax') || url.includes('method=reload') || url.includes('request-for-a-quote'))) {
      console.log(`[Response] ${res.status()} ${url}`);
      try {
        const text = await res.text();
        console.log('Response body:', text.slice(0, 300));
      } catch (e) {}
    }
  });

  console.log('Navigating to https://www.kocsisusa.com/request-for-a-quote/ ...');
  await page.goto('https://www.kocsisusa.com/request-for-a-quote/', { waitUntil: 'networkidle2', timeout: 30000 });

  // Target Form 1 specifically
  console.log('Filling Form 1...');
  await page.evaluate((p) => {
    const form = document.querySelectorAll('form')[1]; // Form 1 (Rolls RFQ)
    if (!form) throw new Error('Form 1 not found');

    const fn = form.querySelector('#FirstName');
    if (fn) { fn.value = p.firstName; fn.dispatchEvent(new Event('input', { bubbles: true })); }

    const ln = form.querySelector('#LastName');
    if (ln) { ln.value = p.lastName; ln.dispatchEvent(new Event('input', { bubbles: true })); }

    const comp = form.querySelector('#CompanyName');
    if (comp) { comp.value = p.company; comp.dispatchEvent(new Event('input', { bubbles: true })); }

    const em = form.querySelector('#Email');
    if (em) { em.value = p.email; em.dispatchEvent(new Event('input', { bubbles: true })); }

    const ph = form.querySelector('#Phone');
    if (ph) { ph.value = p.phone; ph.dispatchEvent(new Event('input', { bubbles: true })); }

    const sel = form.querySelector('#RollsServiceRequirement');
    if (sel && sel.options.length > 1) {
      sel.selectedIndex = 1;
      sel.dispatchEvent(new Event('change', { bubbles: true }));
    }

    const comments = form.querySelector('#CommentsHere');
    if (comments) { comments.value = p.message; comments.dispatchEvent(new Event('input', { bubbles: true })); }

    const chk = form.querySelector('input[type=\"checkbox\"]');
    if (chk) { chk.checked = true; chk.dispatchEvent(new Event('change', { bubbles: true })); }
  }, OUTREACH_PROFILE);

  console.log('Clicking Form 1 Submit button...');
  await page.evaluate(() => {
    const form = document.querySelectorAll('form')[1];
    const btn = form.querySelector('button[type=\"submit\"]');
    if (btn) btn.click();
  });

  console.log('Waiting 8s...');
  await new Promise(r => setTimeout(r, 8000));

  const confirmation = await page.evaluate(() => {
    const success = document.querySelector('.jet-form-builder-message--success, .jet-engine-booking-message--success, [role=\"alert\"], .elementor-message-success');
    const form = document.querySelectorAll('form')[1];
    return {
      successMsg: success ? success.innerText : null,
      formText: form ? form.innerText.slice(0, 400) : null,
      pageText: document.body.innerText.slice(0, 500)
    };
  });

  console.log('Confirmation:', confirmation);
  await browser.close();
}

testKocsis();
