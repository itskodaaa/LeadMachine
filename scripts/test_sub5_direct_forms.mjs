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
  message: `Hello,\n\nI am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects.\n\nWe look forward to your response and the possibility of working together.\n\nThank you for your time and attention.\n\nSincerely,\nPamela Jameson`
};

async function testSite(browser, id, name, url) {
  const page = await browser.newPage();
  page.on('dialog', async d => { try { await d.dismiss(); } catch (_) {} });
  await page.setViewport({ width: 1280, height: 800 });
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');
  await page.setExtraHTTPHeaders({
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8'
  });

  console.log(`\n========================================`);
  console.log(`Testing #${id} ${name}: ${url}`);

  try {
    const res = await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 }).catch(async e => {
      console.log(`networkidle2 failed: ${e.message}, trying domcontentloaded`);
      return await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
    });

    console.log(`Page URL: ${page.url()}`);
    console.log(`Page Title: ${await page.title()}`);

    const details = await page.evaluate(() => {
      const forms = Array.from(document.querySelectorAll('form'));
      const captchas = Array.from(document.querySelectorAll('.g-recaptcha, iframe[src*="recaptcha"], iframe[src*="hcaptcha"], iframe[src*="turnstile"], .cf-turnstile, [data-sitekey]')).map(c => c.className || c.src || c.getAttribute('data-sitekey'));
      const emails = document.body ? Array.from(document.body.innerText.matchAll(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi)).map(m => m[0]) : [];

      const formList = forms.map((f, i) => {
        const inputs = Array.from(f.querySelectorAll('input:not([type="hidden"]), textarea, select')).map(el => ({
          tag: el.tagName.toLowerCase(),
          type: el.type,
          name: el.name,
          id: el.id,
          placeholder: el.placeholder
        }));
        return { index: i, action: f.action, inputsCount: inputs.length, inputs };
      });

      return { formList, captchas, emails: Array.from(new Set(emails)) };
    });

    console.log('Details:', JSON.stringify(details, null, 2));

  } catch (err) {
    console.log(`Error testing #${id}: ${err.message}`);
  } finally {
    await page.close();
  }
}

async function run() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  await testSite(browser, 3590, 'LTD Material LLC', 'https://www.ltdmaterial.com/');
  await testSite(browser, 3591, 'One Source Manufacturing Tech LLC', 'https://www.osmtech.com/');
  await testSite(browser, 3592, 'Striking Precision Welding', 'https://www.strikingprecisionwelding.com/');
  await testSite(browser, 3596, 'JRH Engineering', 'https://www.jrhengineering.net/contact-us');
  await testSite(browser, 3599, 'Tyndall Engineering', 'https://www.tyndallengineering.com/');

  await browser.close();
}

run();
