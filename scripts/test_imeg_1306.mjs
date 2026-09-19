import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

const CHROME_BIN = '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

const OUTREACH_PROFILE = {
  firstName: 'Pamela',
  lastName: 'Jameson',
  email: 'pamela.jameson@nortiheastprecision.com',
  phone: '708-568-3708',
  company: 'Northeast Precision Machinery, Inc.',
  city: 'Chicago',
  message: `Hello,

I am reaching out to express our interest in your engineering services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects.

Thank you for your time and attention.

Sincerely,
Pamela Jameson`
};

async function testIMEG() {
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
    if (url.includes('contact') || url.includes('admin-ajax.php')) {
      console.log(`[Response] ${res.status()} ${url}`);
      try {
        const text = await res.text();
        console.log('Body:', text.slice(0, 250));
      } catch (e) {}
    }
  });

  console.log('Navigating to https://imegcorp.com/contact/ ...');
  await page.goto('https://imegcorp.com/contact/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await new Promise(r => setTimeout(r, 4000));

  console.log('Filling IMEG Formidable form...');
  await page.evaluate((p) => {
    const fn = document.querySelector('#field_qh4icy');
    if (fn) fn.value = p.firstName;

    const ln = document.querySelector('#field_ocfup1');
    if (ln) ln.value = p.lastName;

    const em = document.querySelector('#field_29yf4d');
    if (em) em.value = p.email;

    const ph = document.querySelector('#field_e6lis6');
    if (ph) ph.value = p.phone;

    const comp = document.querySelector('#field_l4a8t');
    if (comp) comp.value = p.company;

    const city = document.querySelector('#field_uxtyk');
    if (city) city.value = p.city;

    const sel1 = document.querySelector('#field_7irjc');
    if (sel1 && sel1.options.length > 1) sel1.selectedIndex = 1;

    const sel2 = document.querySelector('#field_u8fhy');
    if (sel2 && sel2.options.length > 1) sel2.selectedIndex = 1;

    const msg = document.querySelector('#field_9jv0r1');
    if (msg) msg.value = p.message;
  }, OUTREACH_PROFILE);

  console.log('Clicking Submit button...');
  await page.evaluate(() => {
    const btn = document.querySelector('.frm_forms button[type="submit"], .frm_forms input[type="submit"]');
    if (btn) btn.click();
  });

  console.log('Waiting 8s...');
  await new Promise(r => setTimeout(r, 8000));

  const result = await page.evaluate(() => {
    const alerts = Array.from(document.querySelectorAll('.frm_message, .frm_error_style, [role="alert"]')).map(el => el.innerText);
    return {
      alerts,
      pageText: document.body.innerText.slice(0, 500)
    };
  });

  console.log('Result:', result);
  await browser.close();
}

testIMEG();
