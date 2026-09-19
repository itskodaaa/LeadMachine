import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const OUTREACH = {
  first: 'Pamela',
  last: 'Jameson',
  name: 'Pamela Jameson',
  email: 'pamela.jameson@nortiheastprecision.com',
  phone: '708-568-3708',
  company: 'Northeast Precision Machinery, Inc.',
  message: 'Hello, I am reaching out to express our interest in your services and request a representative to contact us for potential collaboration and upcoming project quotes. Thank you!'
};

async function testDetekt() {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: CHROME_BIN,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

  console.log('Navigating to Detekt Biomedical...');
  await page.goto('https://www.idetekt.com/', { waitUntil: 'networkidle2', timeout: 30000 });

  // Look for contact button or popup trigger
  const triggerResult = await page.evaluate(() => {
    const btn = document.querySelector('a[href*="get-in-touch-popup"], a[href*="popup:open"], .elementor-button[href*="popup"]');
    if (btn) {
      btn.click();
      return { clicked: true, text: btn.innerText, href: btn.href };
    }
    return { clicked: false };
  });
  console.log('Trigger popup result:', triggerResult);

  await new Promise(r => setTimeout(r, 2000));

  // Check if form is visible and what fields/recaptcha it has
  const formAnalysis = await page.evaluate(() => {
    const forms = Array.from(document.querySelectorAll('form.elementor-form')).map(f => {
      const isVisible = f.offsetParent !== null;
      const recaptcha = f.querySelector('.elementor-g-recaptcha, .g-recaptcha, iframe[src*="recaptcha"]');
      const inputs = Array.from(f.querySelectorAll('input, textarea')).map(i => ({
        name: i.name,
        type: i.type,
        id: i.id,
        required: i.required
      }));
      return { isVisible, hasRecaptcha: !!recaptcha, inputs };
    });
    return {
      forms,
      globalRecaptcha: !!document.querySelector('iframe[src*="recaptcha"], .g-recaptcha')
    };
  });
  console.log('Form analysis:', JSON.stringify(formAnalysis, null, 2));

  // If a form exists, try to fill and submit
  const fillAndSubmit = await page.evaluate(async (profile) => {
    const form = document.querySelector('form.elementor-form');
    if (!form) return { attempted: false, reason: 'no elementor form' };

    const name = form.querySelector('input[name*="name"]');
    const email = form.querySelector('input[name*="email"]');
    const phone = form.querySelector('input[name*="phone"], input[type="tel"]');
    const msg = form.querySelector('textarea[name*="message"]');
    const submit = form.querySelector('button[type="submit"], input[type="submit"]');

    if (name) name.value = profile.name;
    if (email) email.value = profile.email;
    if (phone) phone.value = profile.phone;
    if (msg) msg.value = profile.message;

    if (submit) {
      submit.click();
      return { attempted: true };
    }
    return { attempted: false, reason: 'no submit button' };
  }, OUTREACH);
  console.log('Fill and submit:', fillAndSubmit);

  await new Promise(r => setTimeout(r, 5000));

  const postResult = await page.evaluate(() => {
    const msg = document.querySelector('.elementor-message')?.innerText;
    return { msg };
  });
  console.log('Post submit message:', postResult);

  await page.close();
  await browser.close();
}

testDetekt();
