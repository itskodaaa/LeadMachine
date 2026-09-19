import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

const CHROME_BIN = '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

const OUTREACH_PROFILE = {
  fullName: 'Pamela Jameson',
  company: 'Northeast Precision Machinery, Inc.',
  email: 'pamela.jameson@nortiheastprecision.com',
  phone: '708-568-3708',
  message: `Hello,

I am reaching out to express our interest in your automation engineering and software development services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects.

Thank you for your time and attention.

Sincerely,
Pamela Jameson`
};

async function testDMC() {
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
    if (url.includes('admin-ajax.php') || url.includes('forminator') || url.includes('contact')) {
      console.log(`[Response] ${res.status()} ${url}`);
      try {
        const txt = await res.text();
        console.log('Body:', txt.slice(0, 300));
      } catch (e) {}
    }
  });

  console.log('Navigating to https://www.dmcinfo.com/contact/ ...');
  await page.goto('https://www.dmcinfo.com/contact/', { waitUntil: 'networkidle2', timeout: 30000 });

  console.log('Filling visible fields only...');
  await page.evaluate((p) => {
    const form = document.querySelector('.forminator-custom-form');
    if (!form) throw new Error('Forminator form not found');

    const name = form.querySelector('input[name=\"name-1\"]');
    if (name) { name.value = p.fullName; name.dispatchEvent(new Event('input', { bubbles: true })); }

    const email = form.querySelector('input[name=\"email-1\"]');
    if (email) { email.value = p.email; email.dispatchEvent(new Event('input', { bubbles: true })); }

    const phone = form.querySelector('input[name=\"phone-1\"]');
    if (phone) { phone.value = p.phone; phone.dispatchEvent(new Event('input', { bubbles: true })); }

    const comp = form.querySelector('input[name=\"text-1\"]');
    if (comp) { comp.value = p.company; comp.dispatchEvent(new Event('input', { bubbles: true })); }

    const msg = form.querySelector('textarea[name=\"textarea-1\"]');
    if (msg) { msg.value = p.message; msg.dispatchEvent(new Event('input', { bubbles: true })); }
  }, OUTREACH_PROFILE);

  console.log('Clicking Forminator submit button...');
  await page.evaluate(() => {
    const form = document.querySelector('.forminator-custom-form');
    const btn = form.querySelector('.forminator-button-submit');
    if (btn) btn.click();
  });

  console.log('Waiting 8s...');
  await new Promise(r => setTimeout(r, 8000));

  const status = await page.evaluate(() => {
    const alerts = document.querySelectorAll('.forminator-response-message, [role=\"alert\"], .alert');
    return Array.from(alerts).map(a => a.innerText);
  });

  console.log('Status alerts:', status);
  await browser.close();
}

testDMC();
