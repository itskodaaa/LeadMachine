import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const OUTREACH_PROFILE = {
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
  message: `Hello,

I am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects.

We look forward to your response and the possibility of working together.

Thank you for your time and attention.

Sincerely,
Pamela Jameson`
};

async function testDeep() {
  const browser = await puppeteer.launch({
    headless: "new",
    executablePath: CHROME_BIN,
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
  });

  const targets = [
    { id: 2963, url: 'https://deltageneralcontractinginc.com' },
    { id: 2965, url: 'https://www.panoramacityroofrepair.com/contact.html' },
    { id: 2970, url: 'https://bmkremodeling.com/contact-us' },
    { id: 2972, url: 'https://flatrateremodeling.com' },
    { id: 2973, url: 'https://greatbuildz.com/contact-us/' },
    { id: 2974, url: 'https://ambuildersca.com/contact/' }
  ];

  for (const t of targets) {
    console.log(`\n========================================\nTesting #${t.id}: ${t.url}`);
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');

    try {
      const res = await page.goto(t.url, { waitUntil: 'domcontentloaded', timeout: 20000 });
      console.log('Status:', res ? res.status() : 'null');
      console.log('Final URL:', page.url());
      console.log('Title:', await page.title());

      await new Promise(r => setTimeout(r, 2000));

      const forms = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('form')).map((f, i) => {
          return {
            index: i,
            id: f.id,
            action: f.action,
            classes: f.className,
            inputs: Array.from(f.querySelectorAll('input, textarea, select')).map(el => ({
              tag: el.tagName.toLowerCase(),
              type: el.type,
              name: el.name,
              id: el.id,
              placeholder: el.placeholder,
              required: el.required
            })),
            captchas: Array.from(f.querySelectorAll('.g-recaptcha, iframe[src*="recaptcha"], iframe[src*="hcaptcha"], iframe[src*="turnstile"], .cf-turnstile')).map(c => c.className || c.tagName),
            buttons: Array.from(f.querySelectorAll('button, input[type="submit"]')).map(b => (b.innerText || b.value || '').trim())
          };
        });
      });

      console.log('Forms:', JSON.stringify(forms, null, 2));

    } catch (e) {
      console.log('Error:', e.message);
    } finally {
      await page.close().catch(() => {});
    }
  }

  await browser.close();
}

testDeep().catch(console.error);
