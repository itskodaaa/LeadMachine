import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

const CHROME_BIN = '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

const OUTREACH_PROFILE = {
  firstName: 'Pamela',
  lastName: 'Jameson',
  company: 'Northeast Precision Machinery, Inc.',
  email: 'pamela.jameson@nortiheastprecision.com',
  message: `Hello,

I am reaching out to express our interest in your multi-disciplinary engineering and project development services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects.

Thank you for your time and attention.

Sincerely,
Pamela Jameson`
};

async function testSamuel() {
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
    if (url.includes('wpforms') || url.includes('admin-ajax.php') || url.includes('contact-us')) {
      console.log(`[Response] ${res.status()} ${url}`);
      try {
        const text = await res.text();
        console.log('Body:', text.slice(0, 250));
      } catch (e) {}
    }
  });

  console.log('Navigating to https://samuelengineering.com/contact-us/ ...');
  await page.goto('https://samuelengineering.com/contact-us/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await new Promise(r => setTimeout(r, 3000));

  console.log('Filling real fields and avoiding honeypots...');
  await page.evaluate((p) => {
    // Fill first name
    const fn = document.querySelector('#wpforms-1960-field_1');
    if (fn) fn.value = p.firstName;

    // Fill last name
    const ln = document.querySelector('#wpforms-1960-field_1-last');
    if (ln) ln.value = p.lastName;

    // Fill email
    const em = document.querySelector('#wpforms-1960-field_2');
    if (em) em.value = p.email;

    // Fill real company name (field 5)
    const comp = document.querySelector('#wpforms-1960-field_5');
    if (comp) comp.value = p.company;

    // Check industry checkbox
    const cb = document.querySelector('#wpforms-1960-field_6_7') || document.querySelector('#wpforms-1960-field_6_8');
    if (cb) cb.checked = true;

    // Fill message (field 3)
    const msg = document.querySelector('#wpforms-1960-field_3');
    if (msg) msg.value = p.message;
  }, OUTREACH_PROFILE);

  console.log('Clicking Submit button...');
  await page.click('#wpforms-submit-1960');

  console.log('Waiting 8s...');
  await new Promise(r => setTimeout(r, 8000));

  const result = await page.evaluate(() => {
    const confirmation = document.querySelector('.wpforms-confirmation-container, .wpforms-confirmation-scroll, [role="alert"]');
    return {
      confirmationMsg: confirmation ? confirmation.innerText : null,
      pageText: document.body.innerText.slice(0, 600)
    };
  });

  console.log('Result:', result);
  await browser.close();
}

testSamuel();
